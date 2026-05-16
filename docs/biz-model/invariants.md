# 不变量

## critical — 数据损坏级别

| 名称 | 规则 | 来源 |
|------|------|------|
| TaskTitleRequired | 创建任务时标题不能为空 | `model/model.go:4` binding:required |
| ConversationRequiresAgentName | Conversation 必须指定 agent_name | `db.go:47` conversations.agent_name NOT NULL |
| MessageBelongsToConversation | Message 必须属于一个存在的 Conversation | `db.go:58` messages.conversation_id FK → conversations.id |
| MessageRequiresRoleAndContent | Message 的 role 和 content 都不能为空 | `db.go:55-56` NOT NULL |
| ChatRequiresAgentAndMessage | 对话请求必须包含 agent_name 和 message | `model/model.go:32-33` binding:required |

## high — 业务错误级别

| 名称 | 规则 | 来源 |
|------|------|------|
| TaskStageMustAdvanceSequentially | Task.stage 跳转必须是相邻阶段，不能跳跃 | 语义推导：`service/task_service.go:131` stageIndex 每次只前进一步 |
| AgentConfigMustHaveName | Agent 配置必须有 name 字段 | 语义推导：`service/agent_service.go:53` 通过 name 查找 |
| DiscussionRequiresTwoParticipants | 讨论会话需要发起者和参与者（两个不同的 Agent） | 语义推导：`model/model.go:76-83` DiscussionCreateRequest |

## medium — 边界情况

| 名称 | 规则 | 来源 |
|------|------|------|
| TaskCannotAdvancePastDone | stage=done 的任务不能再推进 | 语义推导：`service/task_service.go:132` idx >= len-1 时直接返回 |
| SessionMaxRoundsBounded | 讨论会话的 max_rounds 不能超过默认上限 50 | `db.go:68` DEFAULT 50，`handler/session_handler.go:67` |
| ConversationMustBelongToTask | Conversation 应关联一个 Task | 语义推导：`service/chat_service.go:36` chat 流程自动绑定 task_id |
| SessionMustBelongToTask | Session 应关联一个 Task | 语义推导：`service/session_service.go:12` 创建会话时需要 task_id |
| TaskAgentNameRequiredForChat | 任务进入 chat 流程时必须有 agent_name | 语义推导：`model/model.go:32` ChatRequest.AgentName binding:required |
| SessionAgentNameRequiredForMain | 主会话的 agent_name 不能为空 | 语义推导：`handler/session_handler.go:25` SessionCallback 中 agent_name 直接写入 |
