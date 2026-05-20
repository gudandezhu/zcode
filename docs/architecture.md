# 架构设计

## 整体架构

```
┌─────────────────────────────────────────────────────────┐
│  Server 进程 (Hono, :8000)                               │
│                                                          │
│  ┌────────────┐    ┌───────────────┐    ┌─────────────┐ │
│  │ REST Routes│    │  Agent Engine │    │   SQLite    │ │
│  │            │    │               │    │  (Drizzle)  │ │
│  │ /api/tasks │◄──►│  AgentLoop    │    │             │ │
│  │ /api/sess  │    │  SessionMgr  │    │  tasks       │ │
│  │ /api/chat  │    │  Provider    │    │  sessions    │ │
│  │ /api/agent │    │  SkillLoader │    │  messages    │ │
│  │ /api/events│    │               │    │  projects    │ │
│  └─────┬──────┘    └───────┬───────┘    │  memories    │ │
│        │                   │            └─────────────┘ │
│        │ SSE 进程内直推     │ LLM API                    │
└────────┼───────────────────┼────────────────────────────┘
         │                   │
    ┌────┴─────┐       ┌─────┴──────┐
    │ Frontend │       │  LLM API   │
    │ Next.js  │       │            │
    │  :3000   │       │  Anthropic │
    └──────────┘       └────────────┘
```

pnpm monorepo，两个进程：
- **Server**（Hono :8000）：REST API + SSE + Agent Engine + SQLite，全部在一个 Node.js 进程
- **Frontend**（Next.js :3000）：React UI，通过 HTTP 调 Server API

统一 TypeScript 的优势：
1. 零桥接 — SSE 事件进程内直推，无需跨语言 HTTP
2. 零类型重复 — `@zcode/shared` 前后端共享类型
3. 两个进程 — Server + Frontend，`bash start.sh` 一键启动
4. AI SDK 一等公民 — Anthropic TS SDK 完整支持

## 数据模型

### Project（项目）

Project 是任务的上下文容器，代表一个代码库。所有任务归属于项目，Agent 在项目目录下执行。

| 字段 | 说明 |
|------|------|
| id | 唯一标识 |
| name | 项目名称 |
| path | 本地目录路径（Agent 工作目录） |
| git_url | Git 仓库地址（可选） |
| tech_stack | 技术栈列表（自动检测或手动填写） |
| conventions | 编码规范、团队约定 |
| pipeline | 流水线配置路径（默认 pipeline.yaml，可按项目定制） |

创建项目时自动检测 tech_stack（扫描 package.json / go.mod / requirements.txt 等）。

### Task（任务）

Task 是系统的核心原语。看板卡片 = Task 的可视化，流水线 = Task 的状态流转。

| 字段 | 说明 |
|------|------|
| id | 唯一标识（8位随机hex） |
| project_id | 归属项目 |
| title | 任务标题 |
| description | 任务描述 |
| stage | 当前阶段：requirement → design → development → testing → done |
| status | 状态：pending / running / waiting_review / checking / completed / failed |
| artifacts | 产出物列表（JSON数组） |
| agent_name | 关联的 Agent |
| conversation_id | 关联的对话 |
| parent_task_id | 父任务 ID（空=顶层任务） |
| depends_on | 依赖的任务 ID 列表 |

**多任务协调**：
- 任务只在所有 `depends_on` 完成后启动
- 父任务在所有子任务完成后自动完成
- 无依赖的子任务可并行执行
- 需求阶段的 `decompose` skill 可自动创建子任务

### ProjectMemory（项目记忆）

跨 session 持久化的项目级知识，Agent 每次启动时加载。

| 字段 | 说明 |
|------|------|
| project_id | 归属项目 |
| facts | fact 列表，每条含 content / category / confidence |

记忆分类：
- `convention`：编码规范（"API 路径以 /api/ 开头"）
- `pattern`：代码模式（"数据层用 Drizzle ORM"）
- `decision`：历史决策（"选择 SSE 而非 WebSocket 的原因"）
- `context`：项目背景（"这是内部工具，用户是产品经理"）

来源：Agent 自动提取（从代码中总结）+ 用户手动标注。

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

### 配置驱动（Phase A）

流水线定义在 `pipeline.yaml`：

```yaml
stages:
  - key: requirement
    agent: requirement
    next: design
  - key: design
    agent: design
    next: development
  - key: development
    agent: developer
    next: testing
  - key: testing
    agent: tester
    next: done
  - key: done
```

启动时读取 `pipeline.yaml`，构建阶段路由表。`AdvanceTask()` 查路由表。加阶段只改 YAML，不改代码。

### 回调驱动（Phase B）

Agent 完成时在 callback 里声明下一步动作，后端验证执行：

```
Agent 完成 → callback 带 action 字段
    ↓
后端验证 action 合法性（是否在 pipeline 允许的转移范围内）
    ↓
执行路由：advance / discuss / clarify / stop
```

callback 增强：
```json
{
  "session_id": "x",
  "status": "completed",
  "action": {
    "type": "advance",
    "next_agent": "design",
    "reason": "需求已明确"
  }
}
```

action 类型：
- `advance`：推进到指定下一阶段
- `discuss`：发起多 Agent 讨论
- `clarify`：暂停等人确认（门控）
- `stop`：终止流水线

### 阶段门控

每个阶段完成后，通过门控决定是否推进。两种门控模式：

**模式 A：人工审批（需求/设计阶段）**

Agent 产出 artifact → task 进入 `waiting_review` → 用户操作：
1. **在线编辑 + 通过**：编辑后的版本成为正式 artifact，传入下一阶段
2. **驳回 + 反馈**：agent 基于反馈修订
3. **通过**：不改直接通过

**模式 B：自动化检查（开发/测试阶段）**

Agent 完成 → `checking` → 执行检查脚本（lint / test / CI）→ 通过自动推进，失败则喂给 agent 修复重试（最多 N 轮）。

**pipeline.yaml 配置**：

```yaml
stages:
  - key: requirement
    agent: requirement
    gate:
      type: human_review
    next: design

  - key: design
    agent: design
    gate:
      type: human_review
    next: development

  - key: development
    agent: developer
    gate:
      type: auto_check
      checks:
        - name: lint
          command: "cd {working_dir} && pnpm lint"
        - name: test
          command: "cd {working_dir} && pnpm test"
      max_retries: 3
    next: testing

  - key: testing
    agent: tester
    gate:
      type: auto_check
      checks:
        - name: integration_test
          command: "cd {working_dir} && pnpm test:integration"
      max_retries: 2
    next: done
```

**Task 状态机**：

```
pending → running → waiting_review → running(修订/下一阶段)
                  → checking → running(修复/下一阶段)
                  → completed（done 阶段）
                  → failed
```

## Agent Engine

### Agent Backend 可插拔架构

Agent 的执行后端可替换，由 `agent.yaml` 的 `backend` 字段决定。配置即切换，无需改代码。

```
AgentBackend (抽象接口)
├── BuiltinBackend     — 自研 AgentLoop，轻量，文档生成型
└── ClaudeCodeBackend  — 委托 Claude Code CLI，真实文件读写/命令执行
```

agent.yaml 配置：
```yaml
# 自研 agent：轻量文档型任务
name: requirement
backend: builtin

# Claude Code：需��操作真实代码的执行型任务
name: developer
backend: cc
```

执行链路：
```
API Route → Agent Engine
              ↓
         查 agent.yaml 的 backend 字段
              ↓
         路由到对应 Backend
              ├─ builtin → AgentLoop（自研，LLM + skills + tools）
              └─ cc      → ClaudeCodeBackend（claude CLI 子进程）
              ↓
         统一产出 SSE 事件流 + callback + artifacts
```

**对外接口不变**：无论用哪个 backend，SSE 事件流、callback 回调、artifact 回写保持一致。前端和 API 层完全无感。

#### BuiltinBackend（自研 Agent）

自研的轻量 Agent Loop，适合文档生成型任务。

- 直接调 Anthropic SDK
- 内置 4 个工具（advance_stage / write_artifact / discuss_with_agent / clarify_user）
- 支持 skills 目录扩展（TypeScript 文件）
- 无文件 I/O 能力，只能产出 artifact 文档

适用场景：requirement、design — 只需生成结构化文档。

#### ClaudeCodeBackend（cc）

委托 Claude Code CLI 执行，适合需要操作真实代码的任务。

```typescript
// 内部调用方式
const process = spawn("claude", ["-p", prompt, "--output-format", "stream-json"]);
// 解析 stdout 流式 JSON → 转为 zcode SSE 事件
```

ClaudeCodeBackend 能力：
- **真实文件读写** — 在项目目录下创建/修改/删除文件
- **命令执行** — bash 工具，运行测试/lint/构建
- **代码搜索** — grep/read/edit 等工具
- **子 Agent** — Agent tool 派生子任务
- **MCP 工具** — 动态加载外部 MCP server
- **记忆系统** — 项目级 CLAUDE.md + memory

适配层做的事：
1. 收到 session context → 构造 prompt（含前序阶段产出）
2. 启动 `claude` CLI 子进程，传入 prompt
3. 解析 stdout 流式 JSON，转换为 zcode SSE 事件格式
4. 从输出中提取 artifacts
5. 统一 callback 更新任务状态

适用场景：developer、tester — 需要操作真实代码、运行命令。

**后端能力对比**：

| 能力 | BuiltinBackend | ClaudeCodeBackend |
|------|---------------|-------------------|
| LLM 调用 | 直接调 Provider | Claude Code 内置 |
| 文件读写 | 无 | bash/read/write 工具 |
| 命令执行 | 无 | bash 工具 |
| 代码生成 | 文本输出（artifact） | 写入真实文件 |
| 测试执行 | 无 | 运行测试命令 |
| 子 Agent | discuss_with_agent | Agent tool |
| 流式输出 | SSE 事件 | 转换为 SSE 事件 |
| 工具扩展 | TypeScript skills | MCP + skills |
| 记忆 | 无 | CLAUDE.md + memory |

**SSE 事件进程内直推**：Agent Engine 和 API Routes 在同一进程内，SSE 事件无需跨进程 HTTP 中转，直接写入 response stream。

### Provider 接口

所有 LLM 提供商实现同一个接口：

```
BaseProvider
├── stream(messages) → AsyncGenerator
└── 按模型名前缀自动路由
```

- `AnthropicProvider`：处理 claude-* 模型（OpenAI 支持待 M105 实现）

### Agent Loop

核心执行循环：
1. 加载 agent 的 system_prompt 和 skills
2. 迭代：调 LLM → 解析响应 → 执行 skill → 检查用户输入
3. 每轮产生 SSE 事件直接推送给前端
4. 完成后 callback 更新任务状态
5. 若 `auto_advance=true`，自动推进到下一阶段

### Discussion（多 Agent 讨论）

> 新设计详见 [docs/discussion.md](discussion.md)，以下为旧描述，随 Phase 16 实施后更新。

Task 级多 Agent 沟通空间（DiscussionBoard），辅助 Agent 解决 Task。参与者动态拉入（Pipeline 流转自动加入 + Agent @mention 拉人），三层触发漏斗（@mention / Topic 匹配 / Protocol）。消息触发短命 Mini-Session，结果回写 Board。

旧模式（兼容保留）：两个 Agent 之间的多轮对话，交替发言直到 max_rounds 或达成共识。

### Session 管理

管理所有活跃 session：
- 创建 session 并分配事件队列
- 维护 user_input_queue 供 Agent Loop 读取
- SSE 流式推送事件到前端
- TTL 自动过期清理

### Skill 系统

每个 Agent 有两层工具系统（仅 BuiltinBackend 使用）：

**内置工具**（AgentLoop 硬编码，所有 Agent 可用）：
- `advance_stage`：推进任务阶段
- `write_artifact`：保存产出物
- `discuss_with_agent`：发起多 Agent 讨论
- `clarify_user`：向用户提问并等待回复

**文件 Skills**（`agents/{name}/skills/` 目录）：
- TypeScript 文件，由 SkillLoader 动态加载并注册为 LLM tool
- 导出工具定义 + 执行函数

## 项目与工作区

### Project 概念

Project 是任务的上下文容器，代表一个代码库。

```
用户创建项目（指向本地目录或 Git URL）
    ↓
系统自动检测 tech_stack
    ↓
Agent 在 project.path 下执行
    ↓
同项目多任务共享上下文（记忆、流水线、conventions）
```

### 多任务协调

Task 支持 `parent_task_id` 和 `depends_on`，构建任务依赖图：

```
父任务：实现用户系统
  ├─ 子任务1：设计数据库模型（depends_on: 无）
  ├─ 子任务2：实现后端 API（depends_on: [子任务1]）
  └─ 子任务3：实现前端页面（depends_on: [子任务2]）
```

### Agent 记忆

项目级记忆，跨 session 持久化，注入 agent system prompt。

```
ProjectMemory
  facts: [
    {"content": "数据层用 Drizzle ORM", "category": "pattern", "confidence": 0.9},
    {"content": "选择 SSE 而非 WebSocket", "category": "decision", "confidence": 0.7},
  ]
```

## 通知系统

任务状态变化时推送通知。SSE 全局推送通道（`GET /api/events`），进程内直出，无需跨进程中转。

**触发事件**：
- `waiting_review` — 等待审批
- `checking_failed` — 自动检查失败
- `pipeline_completed` — 流水线完成
- `agent_failed` — Agent 执行失败

## 数据流

### 创建任务并执行

```
用户点击"新建任务" → 填写标题和描述 → 选择阶段
    ↓
POST /api/tasks → SQLite 写入 → 返回 Task
    ↓
看板刷新（SSE 推送 task_updated 事件）→ 新卡片出现
    ↓
自动触发 Session → Agent Loop 启动
    ↓
Agent 迭代执行（LLM + skills）→ SSE 事件进程内直推前端
    ↓
完成 → 更新 task 状态 + artifacts → SSE 推送
```

### 全局 SSE 推送

```
前端进看板 → GET /api/tasks 拿全量初始状态
           → GET /api/events 建立 SSE 连接
           → 收到 task_updated 事件按 taskId 增量更新卡片
           → 离开页面自动断开
```

## Git/GitHub 集成

项目 = Git 仓库。所有 Git/GitHub 操作通过 `gh` CLI 执行。

```
创建任务 → 开发阶段开始时创建 feature branch
    ↓
Agent 在 feature branch 上 commit + push
    ↓
测试通过 → gh pr create
    ↓
CI 状态 → auto_check 门控
    ↓
PR merged → 任务标记完成
```

## 产品边界

**单用户产品**：不考虑多用户、认证、权限、团队协作。个人开发者 AI 编码助手。
