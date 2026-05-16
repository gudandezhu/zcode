# 状态机

## Task

**初始状态**：stage=requirement, status=pending

```mermaid
stateDiagram-v2
    [*] --> requirement : createTask
    requirement --> design : advanceTask
    design --> development : advanceTask
    development --> testing : advanceTask
    testing --> done : advanceTask
    done --> done : advanceTask(幂等)
```

| 动作 | 从 | 到 | 说明 | 源码 |
|------|----|----|------|------|
| createTask | — | stage=requirement, status=pending | 创建新任务，初始进入需求阶段 | `service/task_service.go:CreateTask` |
| advanceTask | stage=requirement | stage=design | 需求确认后推进到设计阶段 | `service/task_service.go:AdvanceTask` |
| advanceTask | stage=design | stage=development | 设计完成后推进到开发阶段 | `service/task_service.go:AdvanceTask` |
| advanceTask | stage=development | stage=testing | 开发完成后推进到测试阶段 | `service/task_service.go:AdvanceTask` |
| advanceTask | stage=testing | stage=done | 测试通过后标记为完成 | `service/task_service.go:AdvanceTask` |
| advanceTask | stage=done | stage=done | 已完成的任务不能再推进，保持 done | `service/task_service.go:AdvanceTask` |

## Session

**初始状态**：status=running, current_round=0

```mermaid
stateDiagram-v2
    [*] --> running : createSession
    running --> completed : sessionCallback
    running --> failed : sessionCallback
```

| 动作 | 从 | 到 | 说明 | 源码 |
|------|----|----|------|------|
| createSession | — | status=running | 创建 Agent 执行会话，立即开始运行 | `service/session_service.go:CreateSession` |
| sessionCallback | status=running | status=completed/failed | Agent Engine 回调通知执行结果 | `handler/session_handler.go:SessionCallback` |
| completeSession | status=running | status=completed | Agent 执行完成，会话结束 | `service/session_service.go:UpdateSessionStatus` |
| failSession | status=running | status=failed | Agent 执行出错，会话失败 | `service/session_service.go:UpdateSessionStatus` |
