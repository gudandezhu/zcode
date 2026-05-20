# 核心理念
一切皆task

# 需求规划规则
做需求规划时，必须同步维护 [UI 菜单交互树](docs/menu-tree.md) 和 [需求功能树](docs/function-tree.md)，确保两份文档与最新需求一致。

# 产品边界
- **单用户产品**：不考虑多用户、认证、权限、团队协作。个人开发者 AI 编码助手
- **本地优先**：先专注本地快速开发体验，Docker/云端部署后续再考虑
- **GitHub 集成**：默认打通 GitHub 生态（issue/PR/CI），gh CLI 驱动
- **Agent 可扩展**：用户通过 skills 和 CLAUDE.md 自定义 agent 行为，不用硬编码模板

# currentDate
Today's date is 2026/05/18.

# 文档索引

| 文档 | 用途 |
|------|------|
| [docs/README.md](docs/README.md) | 项目总览、技术栈、快速开始 |
| [docs/architecture.md](docs/architecture.md) | 全栈架构、数据模型、流水线 |
| [docs/discussion.md](docs/discussion.md) | Discussion 讨论区架构设计 |
| [docs/api.md](docs/api.md) | REST API 接口文档 |
| [docs/features.md](docs/features.md) | 功能说明 |
| [docs/deployment.md](docs/deployment.md) | 部署指南 |
| [docs/agent-config.md](docs/agent-config.md) | Agent 配置指南 |
| [docs/menu-tree.md](docs/menu-tree.md) | UI 菜单交互树 |
| [docs/function-tree.md](docs/function-tree.md) | 需求功能树 |
| [docs/conventions.md](docs/conventions.md) | 开发规范（commit/测试/前端/启动检查） |

# 规则触发时机（docs/conventions.md）

- **改代码时** → 先跑测试/lint，改完必须通过
- **提交时** → 一个任务一次 commit，pre-commit hook 会检查
- **启动验收前** → 必须按启动检查清单逐项通过

# 交接文档（必读）
- [任务看板](docs/plan.md) — **AI 启动必读** — 当前待办/进行中/已完成的任务状态

## Agent skills

### Issue tracker

Issues 跟踪在 GitHub Issues，用 `gh` CLI 操作。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用默认标签体系（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。详见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局：根目录 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。

# Matt Pocock Skills 工作流

用户执行完一个 skill 命令后，**必须主动提示用户下一个推荐命令**。

推荐链路：
```
/prototype → /grill-me → /to-prd → /to-issues → /tdd 或 /diagnose → /improve-codebase-architecture
```

提示格式：一句话说明下一个命令是什么 + 一句话解释为什么。
示例：「下一步可以 `/grill-me` — 让 AI 反过来追问你，把模糊想法逼清晰。」
