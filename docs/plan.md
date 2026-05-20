# Plan — 项目任务看板

> **AI 每次启动必须读取此文件**，了解当前任务状态，才能开始工作。
> 完成任务后立即更新此文件状态。

---

## 设计决策

- **实时策略**：全局 SSE 连接（一个 `/api/events` 推送所有任务状态变更），替代轮询。流程：进看板 → GET `/api/tasks` 拿全量初始状态 → 建立 SSE 连接 → 收到 `task_updated` 事件按 taskId 增量更新卡片 → 离开页面自动断开。抽屉内 Session 详情仍用 SSE 实时流
- **抽屉交互**：纵向时间线，所有 Session 按时间串联成完整故事线，活跃 Session 实时追加
- **卡片动态**：底部展示 Session 进度条 + 最近动作 + 状态指示器（脉冲动画）
- **流水线闭环**：Task 状态机 pending→running→completed/failed，每阶段产出回写 Task，结构化上下文传递
- **流水线路由**：Phase A 配置驱动（pipeline.yaml 替代硬编码 stageOrder）→ Phase B 回调驱动（Agent 在 callback 中声明下一步动作）
- **Agent Backend 可插拔**：agent.yaml 声明 backend（builtin/deerflow），BuiltinBackend 文档型，DeerFlowBackend 执行型（包装 DeerFlowClient，真实文件读写/命令执行）
- **Agent 质量**：prompt 重写（方法论+示例+完成标准）、清理死代码 skills（13个被内置工具遮蔽）
- **阶段门控**：人工审批（需求/设计，含在线编辑 artifact）+ 自动化检查（开发/测试，lint/test/CI）
- **项目/工作区**：Project 是任务上下文容器，Agent 在项目目录下执行，任务归属于项目
- **多任务协调**：Task 支持 parent_task_id + depends_on，构建任务依赖图，子任务可并行
- **Agent 记忆**：项目级 fact 记忆，跨 session 持久化，注入 agent system prompt
- **通知系统**：SSE 通知通道，任务状态变化推送（waiting_review / checking_failed / completed）
- **Git/GitHub 集成**：项目 = Git 仓库，gh CLI 操作，feature branch → commit → PR → CI 反馈门控
- **CLAUDE.md 支持**：项目根目录 CLAUDE.md 注入 agent system prompt，用户自定义项目约定
- **单用户产品**：不考虑多用户/认证/权限，专注个人开发者
- **全栈统一 TypeScript**：Go 后端 + Python agent-engine 全部迁移到 Node.js + TypeScript + Next.js。理由：(1) 前端已是 Next.js/TS，统一后零桥接、零类型重复 (2) Anthropic/LangGraph TS SDK 是官方一等公民，AI 生态完整 (3) 单用户本地工具，Go 的性能优势用不上 (4) SSE 全局推送在同进程内直出，无需跨语言中转。迁移范围：Go 后端 → Next.js API Routes / standalone Hono server，Python agent-engine → TS agent module（anthropic SDK + 工具执行 + skill 加载）
- **Discussion 讨论区**：Task 级多 Agent 沟通空间，辅助 Agent 解决 Task。参与者动态拉入（Pipeline 流转自动加入 + Agent 按需 @mention 拉人）。三层触发漏斗：@mention（必须响应）→ Topic 匹配（可选响应）→ Protocol（结构化协作）。Board 不是 Session，消息触发短命 Mini-Session，结果回写 Board。详见 [docs/discussion.md](docs/discussion.md)

---

## 进行中

> 正在执行的任务，同一时间不宜超过 3 个。

（空）

## 待办

> Phase 1-14 已全部完成。当前聚焦 Phase 15：全栈迁移。

### Phase 15: 全栈迁移 Go/Python → TypeScript

> Go 后端 + Python agent-engine → Node.js + TypeScript + Next.js，统一技术栈。

| # | 任务 | 状态 | 依赖 | 说明 |
|---|------|------|------|------|
| M101 | ✅ 脚手架搭建 | completed | — | monorepo 结构、TS 配置、共享类型包 |
| M102 | ✅ 数据库层迁移 | completed | M101 | Go SQLite → Drizzle ORM，schema + CRUD |
| M103 | ✅ REST API 迁移 | completed | M102 | Go handler → Hono HTTP server，对齐现有接口 |
| M104 | ✅ Agent engine 迁移 | completed | M101 | Python agent_loop → TS（Anthropic SDK + tool runner） |
| M105 | ⬜ Agent 工具迁移 | deferred | M104 | 文件读写/命令执行/代码搜索 → TS 实现 |
| M106 | ⬜ Skill 加载迁移 | deferred | M104 | skill_loader → TS 扫描 skills 目录 + 解析 MD/YAML |
| M107 | ✅ SSE 通知迁移 | completed | M103 | 全局 `/api/events`，agent 状态变更进程内直推 |
| M108 | ✅ 流水线/状态机迁移 | completed | M103 + M104 | Task 状态机、pipeline 配置、callback 路由 |
| M109 | ✅ 前端对接 | completed | M103 + M107 | API 调用适配新接口、SSE 连接切换 |
| M110 | ✅ 集成测试 | completed | M109 | 全链路：创建任务 → agent 执行 → 状态推送 → 前端展示 |
| M111 | ✅ 旧代码清理 | completed | M110 | 删除 agent-engine/（Python）和 backend/（Go），重写 start/stop 脚本 |

状态图例：⬜ pending / 🔧 in_progress / ✅ completed

### Phase 16: Discussion 讨论区

> Task 级多 Agent 沟通空间，辅助 Agent 解决 Task。详见 [docs/discussion.md](docs/discussion.md)

| # | 任务 | 状态 | 依赖 | 说明 |
|---|------|------|------|------|
| D010 | ✅ 讨论区架构设计 | completed | — | 核心概念、数据模型、触发机制、Session 融合、UI 设计 |
| D011 | ✅ DiscussionBoard 数据模型 | completed | — | Board + Message 表，CRUD API |
| D012 | ✅ 讨论区 SSE 推送 | completed | D011 | Board 事件流 + 全局 SSE 扩展 |
| D013 | ✅ 抽屉 Tab 改造 | completed | D012 | 旧 Timeline 拆为 Tab[Timeline\|讨论区]，删掉旧[发起讨论]按钮和弹窗 |
| D014 | ✅ 讨论区面板 UI | completed | D013 | 参与者栏（动态渲染）+ 消息流（4种气泡样式）+ 输入框（@提及/协议选择） |
| D015 | ✅ @mention 触发 | completed | D011 | Layer 1 触发 + Mini-Session |
| D016 | ✅ Pipeline 自动拉入 | completed | D011 | 流转时 Agent 自动加入 Board |
| D017 | ✅ Topic 路由 | completed | D015 | Agent 配置 topics + 关键词匹配 |
| D018 | ✅ 协议系统 | completed | D015 | Review Request / Consensus / Escalation |
| D019 | ✅ discuss_with_agent 迁移 | completed | D015 | 旧工具底层迁移到 Board 基础设施，调用方无感 |

### 低优先级

（空）

## 已完成

> Phase 1-14 全部完成。完成的任务保留最近 30 条，超出的归档删除。

| # | 任务 | 完成日期 |
|---|------|----------|
| D012 | 讨论区 SSE 推送 | 2026-05-19 |
| D019 | discuss_with_agent 迁移 | 2026-05-19 |
| D018 | 协议系统 | 2026-05-19 |
| D017 | Topic 路由 | 2026-05-19 |
| D016 | Pipeline 自动拉入 Agent | 2026-05-19 |
| D015 | @mention 触发 Mini-Session | 2026-05-19 |
| D014 | 讨论区面板 UI | 2026-05-19 |
| D013 | 抽屉 Tab 改造 | 2026-05-19 |
| D012 | 讨论区 SSE 推送 | 2026-05-19 |
| D011 | DiscussionBoard 数据模型 | 2026-05-19 |
| E011 | Agent Backend 测试 | 2026-05-18 |
| E012 | 门控流程测试 | 2026-05-18 |
| N011 | 前端通知铃铛 | 2026-05-18 |
| N010 | 通知 SSE 通道 | 2026-05-18 |
| R013 | 记忆管理 UI | 2026-05-18 |
| R012 | 记忆自动提取 | 2026-05-18 |
| R011 | 记忆注入 agent | 2026-05-18 |
| R010 | ProjectMemory 存储 | 2026-05-18 |
| M013 | 看板子任务展示 | 2026-05-18 |
| M012 | 子任务创建 | 2026-05-18 |
| E010 | Pipeline 全链路测试 | 2026-05-18 |
| V012 | PR 自动创建 | 2026-05-18 |
| V010 | 项目 Git 初始化 | 2026-05-18 |
| M011 | 依赖调度器 | 2026-05-18 |
| M010 | Task 依赖字段 | 2026-05-18 |
| W010 | Project 数据模型 | 2026-05-18 |
| W011 | Task 关联 Project | 2026-05-18 |
| W012 | Project 设置页 | 2026-05-18 |
| W013 | DeerFlowBackend 接项目路径 | 2026-05-18 |
| G010 | pipeline.yaml gate 配置 | 2026-05-18 |
| G011 | Task 状态机扩展 | 2026-05-18 |
| G012 | 审批 API | 2026-05-18 |
| G013 | 自动检查执行器 | 2026-05-18 |
| G014 | 前端审批 UI | 2026-05-18 |
| P010 | AgentBackend 抽象接口 | 2026-05-18 |
| P011 | BuiltinBackend 适配 | 2026-05-18 |
| P012 | DeerFlowBackend 实现 | 2026-05-18 |
| P013 | Backend 路由 | 2026-05-18 |
| P014 | developer/tester 切 deerflow | 2026-05-18 |
| P023 | 重写 developer prompt | 2026-05-18 |
| P024 | 重写 tester prompt | 2026-05-18 |
| P020 | 清理死代码 skills | 2026-05-18 |
| P021 | 重写 requirement prompt | 2026-05-18 |
| P022 | 重写 design prompt | 2026-05-18 |
| B030 | callback action 字段 | 2026-05-18 |
| B031 | Go 验证路由合法性 | 2026-05-18 |
| B032 | agent prompt 路由引导 | 2026-05-18 |
| B020 | pipeline.yaml 配置文件 | 2026-05-18 |
| B021 | Go 加载 pipeline 配置 | 2026-05-18 |
| B022 | AdvanceTask 查路由表 | 2026-05-18 |
| B013 | retry 接口 | 2026-05-18 |
| F012 | 前端重试按钮 | 2026-05-18 |
| F010 | 卡片状态指示器 | 2026-05-18 |
| F011 | 抽屉 pipeline 进度条 | 2026-05-18 |
| B010 | callback 增强 | 2026-05-18 |
| B011 | 上下文格式化 | 2026-05-18 |
| B012 | done 列支持 | 2026-05-18 |
| B003 | Session callback 自动推进阶段 | 2026-05-18 |
| F007 | Discussion 对话气泡 | 2026-05-18 |
| B001 | 扩展 Task 响应字段 | 2026-05-18 |
| B002 | 创建 Task 自动触发 Session | 2026-05-18 |
| F001 | TaskCard 动态状态 | 2026-05-18 |
| F002 | TaskDetailDrawer 骨架 | 2026-05-18 |
| F003 | TimelineStep 事件卡片 | 2026-05-18 |
| F004 | 时间线 + 历史加载 | 2026-05-18 |
| F005 | 实时 SSE 接入 | 2026-05-18 |
| F006 | ClarifyUser 内联输入 | 2026-05-18 |
| F008 | Artifacts 产出物展示 | 2026-05-18 |
| F009 | 看板页接抽屉 | 2026-05-18 |
| T007 | 删除"推进下一阶段"按钮 | 2026-05-16 |

---

## 执行顺序

```
Phase 15: M101（脚手架）→ M102 + M103 + M104（并行，DB+API+Agent核心）→ M105 + M106 + M107（并行，工具+Skill+SSE）→ M108（流水线）→ M109（前端对接）→ M110（集成测试）
```

## 操作规则

1. **新增任务**：在「待办」区末尾添加，分配编号（递增）、标题、描述、优先级
2. **开始执行**：任务状态从 ⬜ pending 改为 🔧 in_progress，移入「进行中」
3. **完成**：任务状态改为 ✅ completed，移入「已完成」，填写完成日期
4. **编号规则**：全局递增，不回收。格式 T001、T002…（旧）B001/F001…（新，按层分前缀）
5. **优先级**：P0（紧急/阻塞）> P1（重要）> P2（正常）> P3（低优）
