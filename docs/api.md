# API 接口文档

Base URL: `http://localhost:8000`

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
  "stage": "requirement"
}
```

**响应：** Task 对象

### GET /api/tasks

获取所有任务。

**查询参数：**
| 参数 | 说明 |
|------|------|
| stage | 按阶段过滤，可选 |

**响应：** Task 对象数组

### GET /api/tasks/:id

获取单个任务。

**响应：** Task 对象

### PATCH /api/tasks/:id

更新任务。

**请求体（所有字段可选）：**
```json
{
  "title": "新标题",
  "status": "in_progress",
  "artifacts": "[\"需求文档\"]"
}
```

**响应：** Task 对象

### POST /api/tasks/:id/advance

将任务推进到下一阶段。

stage 流转顺序：requirement → design → development → testing → done

**响应：** Task 对象

### DELETE /api/tasks/:id

删除任务。

**响应：**
```json
{"ok": true}
```

### Task 对象结构

```json
{
  "id": "a1b2c3d4",
  "title": "用户登录功能",
  "description": "实现邮箱+密码登录",
  "stage": "requirement",
  "status": "pending",
  "artifacts": [],
  "agent_name": "",
  "conversation_id": "",
  "created_at": "2026-05-16T07:00:00Z",
  "updated_at": "2026-05-16T07:00:00Z"
}
```

---

## Agent（智能体）

### GET /api/agents

获取所有 Agent 列表（从 `agents/` 目录解析 `agent.yaml`）。

**响应：** Agent 对象数组

### GET /api/agents/reload

重新解析 `agents/` 目录，刷新缓存。修改 Agent 配置后调用。

**响应：** Agent 对象数组

### GET /api/agents/stages

获取流水线阶段列表（有 stage 字段的 Agent）。

**响应：**
```json
[
  {"key": "requirement", "label": "需求分析师", "agent": "requirement"},
  {"key": "design", "label": "高级架构师", "agent": "design"},
  {"key": "development", "label": "全栈开发工程师", "agent": "developer"},
  {"key": "testing", "label": "测试工程师", "agent": "tester"}
]
```

### Agent 对象结构

```json
{
  "name": "requirement",
  "role": "需求分析师",
  "stage": "requirement",
  "model": "claude-sonnet-4-20250514",
  "description": "需求分析师"
}
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

| 字段 | 说明 |
|------|------|
| agent_name | Agent 名称，必填 |
| message | 消息内容，必填 |
| conversation_id | 对话 ID，空=新建对话 |
| task_id | 关联的 Task ID，可选 |

**响应：** SSE 流

```
Content-Type: text/event-stream
X-Conversation-Id: abc123

data: {"content":"你"}
data: {"content":"好"}
data: {"content":"！"}
data: [DONE]
```

每条 `data:` 是 JSON：
- `{"content":"xxx"}` — Agent 输出的文本片段
- `{"error":"xxx"}` — 错误信息
- `[DONE]` — 流结束

### GET /api/chat/history/:conversationId

获取对话历史。

**响应：** Message 对象数组

### Message 对象结构

```json
{
  "id": 1,
  "conversation_id": "abc123",
  "role": "user",
  "content": "我需要一个登录功能",
  "created_at": "2026-05-16T07:00:00Z"
}
```

---

## Session（会话）

Session 用于 Agent 自主执行任务和多 Agent 讨论。Go 后端代理请求到 agent-engine（:8001）。

### POST /api/sessions

创建一个 Agent 自主执行 session。

**请求体：**
```json
{
  "agent_name": "requirement",
  "task_id": "a1b2c3d4",
  "context": "分析用户登录需求"
}
```

| 字段 | 说明 |
|------|------|
| agent_name | Agent 名称，必填 |
| task_id | 关联任务 ID，可选 |
| context | 上下文/初始提示，可选 |

**响应：**
```json
{
  "id": "session-uuid",
  "type": "main",
  "agent_name": "requirement",
  "task_id": "a1b2c3d4",
  "status": "running",
  "participants": [],
  "max_rounds": 50,
  "current_round": 0,
  "current_speaker": "",
  "artifacts": [],
  "created_at": "2026-05-16T07:00:00Z",
  "updated_at": "2026-05-16T07:00:00Z"
}
```

### GET /api/sessions

获取指定任务的 session 列表。

**查询参数：**
| 参数 | 说明 |
|------|------|
| task_id | 任务 ID，按任务过滤 |

**响应：** Session 对象数组

### GET /api/sessions/:id

获取单个 session。

**响应：** Session 对象

### GET /api/sessions/:id/stream

SSE 流式获取 session 事件。Agent Loop 执行过程中产生的事件实时推送。

**响应：** SSE 流

```
Content-Type: text/event-stream

data: {"type":"text","content":"正在分析...","agent":"requirement"}
data: {"type":"tool_call","name":"write_artifact","arguments":"...","agent":"requirement"}
data: {"type":"tool_result","name":"write_artifact","content":"制品已保存","agent":"requirement"}
data: {"type":"session_completed","agent":"requirement"}
data: {"type":"done"}
```

事件类型：
- `{"type":"text","content":"...","agent":"..."}` — Agent 文本输出（逐片段）
- `{"type":"tool_call","name":"...","arguments":"...","agent":"..."}` — Agent 调用工具
- `{"type":"tool_result","name":"...","content":"...","agent":"..."}` — 工具执行结果
- `{"type":"clarify_user","question":"...","agent":"..."}` — Agent 向用户提问，等待回复
- `{"type":"session_completed","agent":"..."}` — Session 执行完成
- `{"type":"session_state_changed","status":"...","agent":"..."}` — Session 状态变更
- `{"type":"error","content":"..."}` — 错误
- `{"type":"done"}` — SSE 流结束

### POST /api/sessions/:id/input

向等待输入的 session 发送用户消息。

**请求体：**
```json
{
  "message": "请继续分析登录的安全性需求"
}
```

**响应：**
```json
{"status": "ok"}
```

### POST /api/sessions/discuss

创建多 Agent 讨论 session。两个 Agent 交替发言进行讨论。

**请求体：**
```json
{
  "initiator": "requirement",
  "participant": "design",
  "task_id": "a1b2c3d4",
  "topic": "讨论用户登录功能的架构方案",
  "max_rounds": 10,
  "parent_session_id": ""
}
```

| 字段 | 说明 |
|------|------|
| initiator | 发起者 Agent 名称，必填 |
| participant | 参与者 Agent 名称，必填 |
| task_id | 关联任务 ID，可选 |
| topic | 讨论主题，可选 |
| max_rounds | 最大讨论轮次（上限200），可选，默认50 |
| parent_session_id | 父 session ID（嵌套讨论），可选 |

**响应：**
```json
{"session_id": "discussion-uuid", "status": "running"}
```

### POST /api/sessions/callback

Agent Engine 完成后的回调接口。由 agent-engine 自动调用。

**请求体：**
```json
{
  "session_id": "session-uuid",
  "task_id": "a1b2c3d4",
  "agent_name": "requirement",
  "status": "completed",
  "artifacts": [{"type": "doc", "content": "需求分析文档"}],
  "advance": true
}
```

| 字段 | 说明 |
|------|------|
| session_id | Session ID |
| task_id | 关联任务 |
| agent_name | Agent 名称 |
| status | 完成状态 |
| artifacts | 产出物列表 |
| advance | 是否自动推进任务到下一阶段 |

**响应：**
```json
{"status": "ok"}
```
