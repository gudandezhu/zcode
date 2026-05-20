# 不变量

## critical — 数据损坏级别

| 名称 | 规则 | 来源 |
|------|------|------|
| TaskTitleRequired | 创建任务时标题不能为空 | 请求校验 |
| ConversationRequiresAgentName | Conversation 必须指定 agent_name | db schema: NOT NULL |
| MessageBelongsToConversation | Message 必须属于一个存在的 Conversation | db schema: FK |
| MessageRequiresRoleAndContent | Message 的 role 和 content 都不能为空 | db schema: NOT NULL |
| ChatRequiresAgentAndMessage | 对话请求必须包含 agent_name 和 message | 请求校验 |

## high — 业务错误级别

| 名称 | 规则 | 来源 |
|------|------|------|
| TaskStageMustAdvanceSequentially | Task.stage 跳转必须是相邻阶段，不能跳跃 | 语义推导：task-service stageIndex 每次只前进一步 |
| AgentConfigMustHaveName | Agent 配置必须有 name 字段 | 语义推导：agent-service 通过 name 查找 |
| DiscussionRequiresTwoParticipants | 讨论会话需要发起者和参与者（两个不同的 Agent） | 语义推导：discussion 请求校验 |

## medium — 边界情况

| 名称 | 规则 | 来源 |
|------|------|------|
| TaskCannotAdvancePastDone | stage=done 的任务不能再推进 | 语义推导：task-service idx >= len-1 时直接返回 |
| SessionMaxRoundsBounded | 讨论会话的 max_rounds 不能超过默认上限 50 | db schema: DEFAULT 50 |
| ConversationMustBelongToTask | Conversation 应关联一个 Task | 语义推导：chat-service 自动绑定 task_id |
| SessionMustBelongToTask | Session 应关联一个 Task | 语义推导：session-service 创建时需要 task_id |
| TaskAgentNameRequiredForChat | 任务进入 chat 流程时必须有 agent_name | 语义推导：chat-request 校验 |
| SessionAgentNameRequiredForMain | 主会话的 agent_name 不能为空 | 语义推导：session-callback 中 agent_name 必填 |
