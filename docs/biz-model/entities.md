# 实体字典

## Task

用户的工作项，从需求到交付的完整生命周期载体。每个任务绑定一个 Agent，按阶段自动推进。

| 字段 | 业务含义 |
|------|----------|
| title | 任务标题，简要描述要做什么 |
| description | 任务详细描述，包含需求和背景 |
| stage | 当前阶段：requirement → design → development → testing → done |
| status | 执行状态：pending（待处理）/ 进行中 / 已完成 |
| artifacts | 阶段产出物列表，由 Agent 执行后生成并传递给下一阶段 |
| agent_name | 当前负责该任务的 Agent 名称 |
| conversation_id | 关联的主对话 ID，用户通过此对话与 Agent 交互 |

> 源码：`backend/model/model.go:3`, `backend/db/db.go:34`

## Agent

AI Agent 配置，每个 Agent 绑定一个任务阶段，负责该阶段的自动化处理。

| 字段 | 业务含义 |
|------|----------|
| name | Agent 唯一标识，同时对应其负责的阶段名（如 requirement、design） |
| role | Agent 角色描述，用于向用户展示 Agent 的职责 |
| stage | 绑定的任务阶段，Agent 只在其对应阶段被触发 |
| model | 使用的 LLM 模型名称 |
| system_prompt | Agent 的系统提示词，定义其行为和输出规范 |

> 源码：`backend/model/model.go:46`

## Session

Agent 的执行会话，承载一次完整的 Agent 运行过程。支持单 Agent 主会话和多 Agent 讨论会话。

| 字段 | 业务含义 |
|------|----------|
| type | 会话类型：main（单 Agent 执行）/ discuss（多 Agent 讨论） |
| agent_name | 主会话中负责的 Agent 名称 |
| task_id | 关联的任务 ID，会话在任务上下文中运行 |
| participants | 讨论会话的参与者列表（多 Agent 讨论时使用） |
| status | 会话状态：running / completed / failed |
| parent_session_id | 父会话 ID，讨论会话可嵌套在主会话之下 |
| max_rounds | 讨论会话最大轮次限制，防止无限循环 |
| current_round | 当前讨论轮次 |
| current_speaker | 当前发言的 Agent 名称（多 Agent 讨论时轮转） |
| artifacts | 会话产出物列表 |

> 源码：`backend/model/model.go:54`, `backend/db/db.go:60`

## Conversation

用户与 Agent 的对话上下文，记录用户直接与 Agent 交互的消息历史。

| 字段 | 业务含义 |
|------|----------|
| agent_name | 对话使用的 Agent 角色名 |
| task_id | 关联的任务 ID，对话发生在任务上下文中 |

> 源码：`backend/db/db.go:46`

## Message

对话中的单条消息，区分用户消息和 Agent 回复。

| 字段 | 业务含义 |
|------|----------|
| conversation_id | 所属对话 ID |
| role | 消息角色：user（用户发送）/ assistant（Agent 回复） |
| content | 消息内容 |

> 源码：`backend/db/db.go:52`
