# 架构设计

## 整体架构

```
┌──────────────┐     HTTP/SSE     ┌──────────────┐     HTTP/SSE     ┌──────────────┐
│   Next.js     │ ◄──────────────► │   Go Gin     │ ◄──────────────► │  Python      │
│   前端       │   REST API       │   后端       │   REST API       │  agent-engine│
│  :3000       │                  │   :8000      │                  │  :8001       │
│              │                  │              │                  │              │
│  看板页面    │                  │  Handler     │                  │  Session     │
│  聊天页面    │                  │  Service     │                  │  AgentLoop   │
│  导航栏      │                  │  AgentBridge │                  │  SkillLoader │
└──────────────┘                  │  SQLite      │                  │  Providers   │
                                  └──────────────┘                  └──────┬───────┘
                                                                           │
                                                                           │ HTTP (SSE 流式)
                                                                           │
                                                                    ┌──────┴───────┐
                                                                    │  LLM API     │
                                                                    │              │
                                                                    │  OpenAI      │
                                                                    │  Anthropic   │
                                                                    └──────────────┘
```

三层架构：
- **前端** Next.js：看板 + 聊天 UI
- **Go 后端**：数据持久化（SQLite）、REST API、任务管理、Agent 配置解析
- **Agent Engine** Python：LLM 调用、Session 生命周期、Agent Loop、Skill 执行、多 Agent 讨论

Go 后端通过 `agent_bridge.go` 代理请求到 agent-engine，agent-engine 直连 LLM API。

## 数据模型

### Task（任务）

Task 是系统的唯一核心原语。看板卡片 = Task 的可视化，流水线 = Task 的状态流转。

| 字段 | 说明 |
|------|------|
| id | 唯一标识（8位随机hex） |
| title | 任务标题 |
| description | 任务描述 |
| stage | 当前阶段：requirement → design → development → testing → done |
| status | 状态：pending / in_progress / completed / failed |
| artifacts | 产出物列表（JSON数组） |
| agent_name | 关联的 Agent |
| conversation_id | 关联的对话 |

### Agent（智能体）

| 字段 | 说明 |
|------|------|
| name | 唯一标识（agent.yaml 中的 name） |
| role | 角色名称（需求分析师、架构师等） |
| stage | 所属流水线阶段（空=独立 Agent） |
| model | 使用的 LLM 模型 |
| max_rounds | Agent Loop 最大迭代轮次 |
| system_prompt | 系统提示词 |

### Session（会话）

| 字段 | 说明 |
|------|------|
| id | 唯一标识 |
| type | 类型：main（Agent自主执行）/ discussion（多Agent讨论） |
| agent_name | 关联 Agent |
| task_id | 关联任务 |
| participants | 讨论参与者列表 |
| status | 状态：running / waiting_input / completed / failed |
| parent_session_id | 父 session（讨论嵌套） |
| max_rounds | 最大轮次 |
| current_round | 当前轮次 |
| current_speaker | 当前发言者（讨论模式） |
| artifacts | 产出物 |

### Conversation / Message

对话记录。每个 Task 可关联一个 Conversation，Conversation 包含多条 Message。

## 流水线机制

```
需求(requirement) → 设计(design) → 开发(development) → 测试(testing) → 完成(done)
```

- Stage 列表从 `agents/` 目录中 `agent.yaml` 动态解析（有 stage 字段的 Agent）
- 前端通过 `/api/agents/stages` 获取，不硬编码
- Task 的 advance 操作：找到当前 stage 在列表中的位置，移到下一个

## Agent Engine

### Provider 接口（正交组合）

所有 LLM 提供商实现同一个接口（agent-engine Python 端）：

```
BaseProvider
├── stream(messages) → AsyncGenerator
└── 按模型名前缀自动路由（registry.py）
```

- `OpenAIProvider`：处理 gpt-* 模型
- `AnthropicProvider`：处理 claude-* / anthropic-* 模型

### Agent Loop

Agent Engine 的核心执行循环（`engine/agent_loop.py`）：
1. 加载 agent 的 system_prompt 和 skills
2. 进入迭代循环：调 LLM → 解析响应 → 执行 skill → 检查是否需要用户输入
3. 每轮迭代产生 SSE 事件推送给前端
4. 完成后通过 callback 回调 Go 后端

### Discussion（多 Agent 讨论）

两个 Agent 之间的多轮对话（`engine/discussion.py`）：
1. 发起者先发言
2. 参与者回应
3. 交替进行直到 max_rounds 或达成共识
4. 每轮产生 SSE 事件

### Session 管理

`engine/session.py` 管理所有活跃 session：
- 创建 session 并分配事件队列
- 维护 user_input_queue 供 Agent Loop 读取用户输入
- SSE 流式推送事件到前端
- TTL 自动过期清理

### Skill 系统

每个 Agent 有两层工具系统：

**内置工具**（`agent_loop.py` 硬编码，所有 Agent 可用）：
- `advance_stage`：推进任务阶段
- `write_artifact`：保存产出物
- `discuss_with_agent`：发起多 Agent 讨论
- `clarify_user`：向用户提问并等待回复

**文件 Skills**（`agents/{name}/skills/` 目录）：
- Python 脚本，由 `SkillLoader` 动态加载并注册为 LLM tool
- 不同 Agent 可定义不同 skills（如 requirement 额外有 decompose 和 clarify_user）

### Agent 配置解析

从 `agents/{name}/agent.yaml` 解析（Go 后端 `service/agent_service.go`）：

```yaml
name: requirement
role: 需求分析师
stage: requirement
model: claude-sonnet-4-20250514
max_rounds: 50
```

配套 `agents/{name}/system_prompt.md` 存放 system prompt 内容。

Go 后端遍历 `AGENTS_DIR` 下的子目录，读取每个 `agent.yaml`，缓存后供 API 使用。

## 前端架构

- **看板页** `/kanban`：从 API 获取 stages 和 tasks，4列看板布局
- **聊天页** `/chat`：Agent 选择器 + SSE 流式聊天，支持 URL 参数预选 Agent
- **API 客户端** `lib/api.ts`：封装所有后端接口，含 SSE 流式解析
- **组件**：Board → Column → TaskCard → CreateTaskDialog（看板），ChatPanel（聊天）

## 数据流

### 创建任务并对话

```
用户点击"新建任务" → 填写标题和描述 → 选择阶段
    ↓
POST /api/tasks → SQLite 写入 → 返回 Task
    ↓
看板刷新 → 新卡片出现在对应列
    ↓
用户点击卡片标题 → 跳转到 /chat?agent=xxx&task=xxx
    ↓
聊天页加载，Agent 自动选中
    ↓
用户输入消息 → POST /api/chat（SSE 流式响应）
    ↓
Go 后端 → agent-engine → LLM → SSE 流式返回
    ↓
消息持久化到 SQLite → 聊天页显示
```

### Session 自主执行

```
POST /api/sessions → Go 后端 → agent-engine /session/create
    ↓
Agent Loop 启动 → 迭代调 LLM + 执行 skills
    ↓
每轮 SSE 事件 → Go 代理 → 前端实时显示
    ↓
完成 → callback 回调 Go 后端 → 更新 task 状态
```

### 多 Agent 讨论

```
POST /api/sessions/discuss → Go 后端 → agent-engine /session/discuss
    ↓
两个 Agent 交替发言 → 每轮 SSE 事件
    ↓
讨论完成 → callback 回调 → 产出物写回 task
```

### 推进任务阶段

```
用户点击"推进下一阶段"
    ↓
POST /api/tasks/:id/advance
    ↓
后端找到当前 stage → 取下一个 → 更新 Task
    ↓
看板刷新 → 卡片移到下一列
```
