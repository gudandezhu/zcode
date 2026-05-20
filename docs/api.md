# API 接口文档

Base URL: `http://localhost:3000/api`

所有接口由 Next.js API Routes 提供，前后端同源，无跨域问题。

---

## 健康检查

### GET /api/health

```json
{"status": "ok"}
```

---

## Task（任务）

### POST /api/tasks

创建任务。

**请求体：**
```json
{
  "title": "用户登录功能",
  "description": "实现邮箱+密码登录",
  "stage": "requirement",
  "project_id": "project-id"
}
```

**响应：** Task 对象

### GET /api/tasks

获取所有任务。

**查询参数：**
| 参数 | 说明 |
|------|------|
| stage | 按阶段过滤，可选 |
| project_id | 按项目过滤，可选 |

**响应：** Task 对象数组

### GET /api/tasks/:id

获取单个任务。

### PATCH /api/tasks/:id

更新任务。

**请求体（所有字段可选）：**
```json
{
  "title": "新标题",
  "status": "running",
  "artifacts": "[\"需求文档\"]"
}
```

### POST /api/tasks/:id/advance

推进任务到下一阶段。

### DELETE /api/tasks/:id

删除任务。

### Task 对象结构

```json
{
  "id": "a1b2c3d4",
  "project_id": "project-id",
  "title": "用户登录功能",
  "description": "实现邮箱+密码登录",
  "stage": "requirement",
  "status": "pending",
  "artifacts": [],
  "agent_name": "",
  "conversation_id": "",
  "parent_task_id": null,
  "depends_on": [],
  "created_at": "2026-05-16T07:00:00Z",
  "updated_at": "2026-05-16T07:00:00Z"
}
```

---

## Agent（智能体）

### GET /api/agents

获取所有 Agent 列表（从 `agents/` 目录解析 `agent.yaml`）。

### GET /api/agents/reload

重新解析 `agents/` 目录，刷新缓存。

### GET /api/agents/stages

获取流水线阶段列表。

**响应：**
```json
[
  {"key": "requirement", "label": "需求分析师", "agent": "requirement"},
  {"key": "design", "label": "高级架构师", "agent": "design"},
  {"key": "development", "label": "全栈开发工程师", "agent": "developer"},
  {"key": "testing", "label": "测试工程师", "agent": "tester"}
]
```

---

## Chat（聊天）

### POST /api/chat

发送消息给 Agent，SSE 流式返回。

**请求体：**
```json
{
  "agent_name": "requirement",
  "message": "我需要一个用户登录功能",
  "conversation_id": "",
  "task_id": ""
}
```

**响应：** SSE 流

```
data: {"content":"你"}
data: {"content":"好"}
data: [DONE]
```

### GET /api/chat/history/:conversationId

获取对话历史。

---

## Session（会话）

### POST /api/sessions

创建 Agent 自主执行 session。

**请求体：**
```json
{
  "agent_name": "requirement",
  "task_id": "a1b2c3d4",
  "context": "分析用户登录需求"
}
```

**响应：**
```json
{
  "id": "session-uuid",
  "type": "main",
  "agent_name": "requirement",
  "task_id": "a1b2c3d4",
  "status": "running"
}
```

### GET /api/sessions

获取 session 列表。查询参数：`task_id`

### GET /api/sessions/:id

获取单个 session。

### GET /api/sessions/:id/stream

SSE 流式获取 session 事件。

**事件类型：**
- `text` — Agent 文本输出
- `tool_call` — Agent 调用工具
- `tool_result` — 工具执行结果
- `clarify_user` — 向用户提问
- `session_completed` — 执行完成
- `discussion_turn` — 讨论轮次
- `done` — SSE 流结束

### POST /api/sessions/:id/input

向 session 发送用户消息。

### POST /api/sessions/discuss

创建多 Agent 讨论 session。

**请求体：**
```json
{
  "initiator": "requirement",
  "participant": "design",
  "task_id": "a1b2c3d4",
  "topic": "讨论架构方案",
  "max_rounds": 10
}
```

---

## Events（SSE 全局推送）

### GET /api/events

全局 SSE 推送通道。任务状态变更、agent 执行进度、通知等所有实时事件都通过这个通道推送。

**事件类型：**
- `task_updated` — 任务状态/阶段变更
- `session_event` — Agent 执行事件（text / tool_call / tool_result）
- `notification` — 通知（等待审批、检查失败等）

---

## Project（项目）

### POST /api/projects

创建项目。

### GET /api/projects

获取项目列表。

### GET /api/projects/:id

获取单个项目。

### PATCH /api/projects/:id

更新项目。

### DELETE /api/projects/:id

删除项目。

---

## Memory（项目记忆）

### GET /api/projects/:id/memories

获取项目记忆列表。

### POST /api/projects/:id/memories

添加项目记忆。

### DELETE /api/projects/:id/memories/:memoryId

删除记忆。
