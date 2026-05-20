# Discussion 讨论区架构设计

## 定位

Discussion 是 Task 级的多 Agent 沟通空间。存在目的是**辅助 Agent 解决 Task**——单个 Agent 搞不定时，通过讨论区跨阶段协作。

```
主线: Pipeline 推进（Agent 独立执行）
辅助: 讨论区（Agent 遇到问题时的沟通通道）
```

## 核心模型

```
Task 1:1 DiscussionBoard 1:N DiscussionMessage

DiscussionBoard:
  task_id          → 关联任务（1:1）
  participants[]   → 动态增长（非预填）
  status           → active / archived

DiscussionMessage:
  speaker          → agent_name / "user" / "system"
  content          → 消息内容
  trigger_type     → mention / topic / protocol / pipeline
  mentions[]       → 被拉入的 Agent 列表
  topics[]         → 关键词提取的话题标签
  protocol_type    → null / review_request / consensus / escalation
  protocol_status  → null / pending / passed / failed / expired
  response_policy  → must_respond / may_respond / must_follow_protocol
  reactions[]      → Agent 响应列表:
    [{ agent_name, action: "respond"|"acknowledge"|"approve"|"reject", content }]
  parent_id        → 回复哪条消息
```

## 参与者：动态拉入

讨论区不预置参与者。Agent 通过两种方式进入：

```
1. Pipeline 自动拉入: task 流转到哪个 Agent，那个 Agent 自动加入
2. Agent 自主拉人: 已在讨论区的 Agent 通过 @mention / discuss_with_agent 拉其他 Agent
```

```
Task 创建 → Board 创建, participants: []
    │
    ├── Pipeline → requirement 阶段 → requirement agent 自动加入
    │     └── requirement 遇到问题 → @mention design → design 加入
    │
    ├── Pipeline → design 阶段 → design agent 自动加入
    │     └── design 发起 Review → 拉入 developer + tester
    │
    └── Pipeline → development 阶段 → developer 自动加入
```

## 触发机制：三层漏斗

```
┌──────────────────────────────────────────────┐
│  @mention     精准触发，必须响应               │
├──────────────────────────────────────────────┤
│  Topic 匹配   智能路由，可选响应               │
├──────────────────────────────────────────────┤
│  Protocol     结构化协议，按规则响应            │
└──────────────────────────────────────────────┘
```

| 层 | 触发方式 | 响应策略 | Agent 行为 |
|---|---|---|---|
| @mention | `@agent_name` | must_respond | 必须回复 |
| Topic 匹配 | Agent 配置 topics + 消息关键词匹配 | may_respond | respond / acknowledge / ignore |
| Protocol | 结构化协议指令 | must_follow_protocol | 按协议格式回复 |

### Agent 配置（agent.yaml 扩展）

```yaml
name: developer
discussion:
  topics: [api, implementation, performance]      # Topic 匹配的关注话题
  protocols: [review_request, consensus]           # 可参与的协议
```

## 三种协议

| 协议 | 场景 | 响应要求 | 结束条件 |
|---|---|---|---|
| Review Request | 产出物需 review | 被@的必须 approve/reject | 全部回复 |
| Consensus | 需要多方决策 | 必须投票 | 全员通过 或 修订后重投 |
| Escalation | 讨论卡住（2轮未解决） | 全部 Agent 必须给意见 | 取共识方案 |

## 与 Session 的融合

Board 不是 Session。消息触发的 Agent 响应是短命 Mini-Session，结果回写 Board。

```
Board（长命 = 任务生命周期）
  ├── Message A → @mention developer → Mini-Session → 回复写回 Board
  ├── Message B → topic 匹配 tester → 轻量 acknowledge，不创建 Session
  └── Protocol C → 并行创建多个 Mini-Session → 各自 approve/reject 写回 Board
```

Session 扩展字段：
```
board_id: string           → 关联的 DiscussionBoard
trigger_message_id: string → 触发此 Session 的消息 ID
```

区分主线和讨论：`board_id` 非空 = 讨论区触发的 Mini-Session。

### 与 Pipeline 的关系

```
Pipeline 主线 Session (不变):
  task → session(type=main, board_id=null) → AgentLoop → callback → 推进

讨论区 Mini-Session (新增):
  board → message → session(type=main, board_id=board.id) → AgentLoop → 结果回写 Board

关键区别:
  Pipeline Session 的 callback 触发阶段推进
  讨论 Session 的 callback 回写 reaction + 新消息到 Board，不触发推进
```

### 与 discuss_with_agent 工具的兼容

旧工具底层迁移到 Board 基础设施，调用方无感：

```
旧: discuss_with_agent → 2人闭环 Session → 返回结论
新: discuss_with_agent → Board Message(mention) → Mini-Session → 回写 Board → 返回结论
```

## API 变更

### 新增接口

```
GET  /api/tasks/:id/discussion          → 获取任务的 DiscussionBoard
GET  /api/boards/:id/messages           → 获取 Board 消息列表（分页）
POST /api/boards/:id/messages           → 发送消息
PATCH /api/boards/:id/messages/:mid     → 添加 reaction
POST /api/boards/:id/protocols          → 发起协议
GET  /api/boards/:id/stream             → SSE 推送 Board 事件
```

### SSE 事件扩展

全局 SSE (`/api/events`) 新增：

```
discussion_update:
  task_id: "xxx"
  board_id: "xxx"
  event: board_message | board_reaction | board_protocol_update
  summary: "developer 回复了 design 的消息"
```

Board SSE (`/api/boards/:id/stream`)：

```
board_message          → 新消息
board_reaction         → Agent 响应
board_protocol_update  → 协议状态变更
board_agent_status     → Agent 状态变化（observe/speaking/idle）
```

## UI 设计

### 抽屉改造

```
旧: Header → Pipeline进度条 → Timeline → Artifacts → Gate → 操作栏
新: Header → Pipeline进度条 → Tab切换 [Timeline | 讨论区] → 操作栏
```

### 讨论区面板

```
┌─ 参与者栏 ────────────────────────────────────────────┐
│ [需求👁️] [设计🎤] [开发👁️] [👤你]                     │
│ 动态渲染，Agent 加入后才显示                            │
└─────────────────────────────────────────────────────────┘

┌─ 消息流 ──────────────────────────────────────────────┐
│                                                        │
│ [design] 这个接口需要确认需求，@requirement 认证流程？   │
│                                         [↩ 回复]       │
│                                                        │
│ [requirement] JWT，access 30min，refresh 7天。         │
│                                         [↩ 回复]       │
│                                                        │
│ [developer] 👁 已记录，按 JWT 方案实现。                │
│                                                        │
│ ┌─ 📋 Review Request ───────────────────────────┐     │
│ │ [design] 架构设计完成，请 review                 │     │
│ │ [developer] ✅ approve "设计合理"                │     │
│ │ [tester]    ✅ approve "建议补充边界用例"         │     │
│ │ ━━ Review Passed ━━                            │     │
│ └────────────────────────────────────────────────┘     │
│                                                        │
└────────────────────────────────────────────────────────┘

┌─ 输入区 ──────────────────────────────────────────────┐
│ [@提及▼] [📋协议▼] [输入消息...]          [发送]       │
└─────────────────────────────────────────────────────────┘
```

### 消息样式

```
Agent 消息（靠左）:
  [Agent头像] [Agent名] [时间]
  [触发标记: @mention / topic匹配]
  消息内容...
  [↩ 回复]

用户消息（靠右，主色）:
  👤 你 [时间]
  用户内容...

Acknowledge（灰色小字）:
  [developer] 👁 已记录，后续关注。

Protocol 消息（协议框包裹）:
  ┌─ 📋 Review Request ────────────┐
  │ 内容...                         │
  │ ┌─ Responses ─────────────────┐ │
  │ │ [developer] ✅ approve      │ │
  │ │ [tester]    ⏳ 等待中...     │ │
  │ └─────────────────────────────┘ │
  │ 状态: 1/2 approved              │
  └─────────────────────────────────┘
```

### 协议配置

```
Review Request: 选择评审人 + 内容 + 超时
Consensus: 提案内容 + 投票人 + 通过条件（全员/majority）
Escalation: 原因（自动/手动）+ 广播给全部 Agent
```

## 落地路径

```
Phase 1: 基础讨论区
  DiscussionBoard + Message 数据模型
  Board CRUD API + SSE 推送
  抽屉讨论区 Tab + 消息流 + 用户输入
  @mention 触发 + Mini-Session
  Pipeline 流转自动拉入 Agent

Phase 2: Topic 路由
  Agent 配置 topics
  消息关键词提取 + Topic 匹配
  Acknowledge 轻量响应

Phase 3: 协议系统
  Review Request / Consensus / Escalation
  协议 UI + 状态展示

Phase 4: 智能升级
  discuss_with_agent 迁移到 Board
  语义 Topic 匹配
  自动 Escalation 检测
  Agent 主动发起讨论
```
