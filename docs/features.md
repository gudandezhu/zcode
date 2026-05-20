# 功能说明

## 看板

流水线专用页面。展示需求→设计→开发→测试四个阶段列。

### 页面功能

- **4列看板**：每列对应一个流水线阶段，列名和颜色从 API 动态获取
- **任务卡片**：显示标题、描述、状态标记、子任务进度
- **新建任务**：填写标题、描述、选择阶段和项目
- **推进阶段**：卡片推进按钮，或 Agent 自动推进
- **删除任务**：卡片删除按钮
- **跳转聊天**：点击卡片标题跳转聊天页，自动选中对应 Agent
- **实时更新**：SSE 全局推送，卡片状态实时刷新（替代轮询）

### 任务状态

| 状态 | 含义 | 颜色 |
|------|------|------|
| pending | 待处理 | 灰色边框 |
| running | 执行中 | 蓝色实心 |
| waiting_review | 等待审批 | 黄色脉冲 |
| checking | 自动检查中 | 橙色脉冲 |
| completed | 已完成 | 绿色实心 |
| failed | 失败 | 红色实心 |

## 聊天

与 AI Agent 对话的页面。所有 Agent（流水线+自定义）都在这里可选。

### 页面功能

- **Agent 选择器**：流水线 Agent 和自定义 Agent 分组显示
- **消息列表**：用户消息右对齐，Agent 消息左对齐
- **流式显示**：Agent 回复逐字出现
- **URL 参数**：`/chat?agent=xxx&task=xxx` 从看板跳转时自动选中

### 对话流程

1. 选中 Agent → 输入消息 → 发送
2. API Route → Agent Engine → LLM → SSE 流式返回
3. 前端逐字渲染 Agent 回复
4. 对话记录保存到 SQLite

## Session（Agent 自主执行）

Agent 自主执行任务，无需人工对话。

### 工作流程

1. 创建 session（指定 Agent 和任务）
2. Agent Loop 启动，迭代调用 LLM + 执行 skills
3. SSE 事件进程内直推，前端实时显示
4. Agent 需要输入时暂停，用户回复后继续
5. 完成 → 更新任务状态和产出物

### Session 状态

| 状态 | 含义 |
|------|------|
| running | Agent 正在执行 |
| waiting_input | 等待用户输入 |
| completed | 执行完成 |
| failed | 执行失败 |

### Agent Skills

内置 4 个工具（所有 Agent 可用）：

| 工具名 | 说明 |
|--------|------|
| advance_stage | 推进任务到下一阶段 |
| write_artifact | 保存产出物 |
| discuss_with_agent | 发起多 Agent 讨论 |
| clarify_user | 向用户提问并等待回复 |

skills 目录可定义额外的 TypeScript 技能文件。

### 自动推进阶段

流水线 Agent 完成后自动推进到下一阶段，触发下一阶段 Agent Session。

## Discussion（多 Agent 讨论）

两个 Agent 多轮对话讨论。

### 工作流程

1. 指定发起者和参与者
2. 发起者先发言
3. 参与者回应
4. 交替进行直到 max_rounds 或达成共识
5. 产出物写回任务

### 讨论气泡渲染

- initiator 消息靠左，participant 消息靠右
- 显示 Agent 名称和轮次信息
- 支持历史回看

## 项目与工作区

- **Project**：任务上下文容器，代表一个代码库
- **自动检测**：创建项目时自动检测技术栈
- **项目记忆**：跨 session 持久化的项目级知识
- **多任务协调**：子任务 + 依赖关系，自动调度
- **CLAUDE.md**：项目约定注入 Agent system prompt

## Git/GitHub 集成

- 项目 = Git 仓库
- 开发阶段自动创建 feature branch
- Agent commit + push
- 测试通过后 `gh pr create`
- CI 状态反馈到自动检查门控

## 通知系统

- SSE 全局推送通道，进程内直出
- 通知铃铛 + 未读计数
- 触发事件：等待审批、检查失败、流水线完成、Agent 失败
