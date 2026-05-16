# 功能说明

## 看板

流水线专用页面。展示需求→设计→开发→测试四个阶段列。

### 页面功能

- **4列看板**：每列对应一个流水线阶段，列名和颜色从后端 API 动态获取
- **任务卡片**：显示标题、描述、状态标记（待处理/进行中/已完成/失败）
- **新建任务**：点击右上角"新建任务"按钮，弹出对话框填写标题、描述、选择阶段
- **推进阶段**：每个卡片有"推进下一阶段"按钮，点击后任务移到下一列
- **删除任务**：每个卡片有删除按钮
- **跳转聊天**：点击卡片标题，跳转到聊天页面并自动选中对应阶段的 Agent
- **自动刷新**：每 5 秒轮询后端获取最新任务列表

### 任务状态

| 状态 | 含义 | 颜色 |
|------|------|------|
| pending | 待处理 | 灰色边框 |
| in_progress | 进行中 | 蓝色实心 |
| completed | 已完成 | 绿色实心 |
| failed | 失败 | 红色实心 |

## 聊天

与 AI Agent 对话的页面。所有 Agent（流水线+自定义）都在这里可选。

### 页面功能

- **Agent 选择器**：顶部按钮组，分两组显示
  - 左侧：流水线 Agent（需求分析师、高级架构师、全栈开发工程师、测试工程师）
  - 右侧：自定义 Agent（文档助手等）
  - 中间竖线分隔两组
- **消息列表**：用户消息（右对齐、深色）和 Agent 消息（左对齐、浅色）
- **流式显示**：Agent 回复逐字出现，有打字动画
- **快捷键**：Enter 发送，Shift+Enter 换行
- **URL 参数**：`/chat?agent=xxx&task=xxx` 从看板跳转时自动选中 Agent

### 对话流程

1. 点击 Agent 按钮 → 选中该 Agent（切换时清空历史）
2. 在输入框输入消息 → 点击"发送"或按 Enter
3. Go 后端转发到 agent-engine → agent-engine 调用 LLM → SSE 流式返回
4. 前端逐字渲染 Agent 回复
5. 对话记录自动保存到数据库

### 从看板跳转

点击看板上的任务卡片标题，自动跳转到聊天页：
- `agent` 参数：根据任务 stage 映射到对应 Agent（development→developer，design→design 等）
- `task` 参数：任务 ID，关联到对话记录

## Session（Agent 自主执行）

Agent 可以脱离人工对话，自主执行任务。前端创建 session 后，Agent 在后台迭代执行。

### 工作流程

1. 创建 session（指定 Agent 和任务）
2. Agent Engine 启动 Agent Loop
3. Agent 迭代调用 LLM + 执行 skills（推进阶段、写文档、发起讨论等）
4. 过程中产生 SSE 事件，前端实时显示
5. Agent 需要用户输入时暂停，等待用户回复后继续
6. 完成后回调 Go 后端，更新任务状态和产出物

### Session 状态

| 状态 | 含义 |
|------|------|
| running | Agent 正在执行 |
| waiting_input | 等待用户输入 |
| completed | 执行完成 |
| failed | 执行失败 |

### Agent Skills

Agent Loop 内置 4 个工具（所有 Agent 可用）：

| 工具名 | 说明 |
|--------|------|
| advance_stage | 推进任务到下一阶段 |
| write_artifact | 保存产出物（文档、��码等） |
| discuss_with_agent | 发起与其他 Agent 的讨论 |
| clarify_user | 向用户提问并等待回复 |

此外，每个 Agent 的 `skills/` 目录可定义额外的 Python 脚本工具，由 SkillLoader 动态加载。

## Discussion（多 Agent 讨论）

两个 Agent 围绕某个主题进行多轮对话讨论。

### 工作流程

1. 指定发起者和参与者 Agent
2. 发起者先发言
3. 参与者回应
4. 交替进行直到 max_rounds 或达成共识
5. 讨论过程中产生 SSE 事件流
6. 完成后产出物写回任务

### 讨论参数

| 参数 | 说明 |
|------|------|
| initiator | 发起讨论的 Agent |
| participant | 参与讨论的 Agent |
| topic | 讨论主题 |
| max_rounds | 最大轮次（上限200，默认50） |
| parent_session_id | 父 session（支持嵌套讨论） |
