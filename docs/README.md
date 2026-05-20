# Zcode

AI 驱动的个人开发助手。通过流水线（需求→设计→开发→测试）组织软件开发流程，每个环节由 AI Agent 自动执行。

## 核心功能

- **看板**：流水线视图，任务卡片在需求→设计→开发→测试四列间流转
- **聊天**：与 AI Agent 对话
- **Session**：Agent 自主执行任务，迭代调 LLM + 执行 tools
- **Discussion**：多 Agent 讨论，围绕主题多轮对话
- **Agent 配置**：每个 Agent 独立目录（YAML + prompt），灵活可扩展
- **项目记忆**：项目级 fact 跨 session 持久化，注入 agent prompt

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js + React + TypeScript + Tailwind + shadcn/ui |
| 服务端 | Hono (standalone HTTP server, port 8000) |
| Agent Engine | TypeScript（Anthropic SDK） |
| 数据库 | SQLite + Drizzle ORM |
| 实时推送 | SSE（Server-Sent Events） |

两个独立进程：**Server**（Hono, :8000）+ **Web**（Next.js, :3000）。Agent Engine 内嵌在 Server 进程内。

## 目录设计原则

1. **按职责分目录，不按技术层分** — `apps/`（可部署）、`shared/`（类型）、`agents/`（配置）、`docs/`（文档）、`scripts/`（运维），一眼看懂每个目录是什么
2. **能平铺就不嵌套** — `shared/` 直接放 `.ts` 文件，不套 `src/`；8 个类型文件不需要再包一层
3. **能合并就不拆包** — agent-engine 只有 server 用，直接合并进 `apps/server/src/engine/`，不做独立 npm 包
4. **非代码的不装包** — `shared/` 是纯类型文件，不需要 package.json / tsconfig.json / node_modules，通过 tsconfig paths 引用
5. **脚本不散落根目录** — `start.sh` / `stop.sh` 收进 `scripts/`，根目录只留配置文件
6. **根目录一眼看完** — 6 个目录 + 4 个配置文件，没有冗余

## 项目结构

```
zcode/
├── apps/                        # 可部署应用
│   ├── web/                     # Next.js 前端 (:3000)
│   │   └── src/
│   │       ├── app/             #   页面（kanban, chat, settings）
│   │       ├── components/      #   UI 组件
│   │       └── lib/             #   API 调用, SSE, 状态映射
│   │
│   └── server/                  # Hono HTTP + Agent Engine (:8000)
│       └── src/
│           ├── index.ts         #   入口
│           ├── app.ts           #   Hono app，路由 + 中间件
│           ├── db/              #   Drizzle schema + 自动建表
│           ├── engine/          #   Agent 引擎（Loop, Session, Provider, SkillLoader）
│           ├── routes/          #   REST + SSE
│           └── services/        #   业务逻辑
│
├── shared/                      # 前后端共享类型（纯文件，无 package.json）
│   ├── task.ts                  #   Task, TaskStage, Artifact
│   ├── session.ts               #   Session, SessionType
│   ├── agent.ts                 #   Agent, AgentConfig
│   ├── project.ts               #   Project
│   ├── memory.ts                #   Memory
│   ├── message.ts               #   Message, ChatRequest
│   ├── callback.ts              #   CallbackAction
│   └── index.ts                 #   统一 re-export
│
├── agents/                      # Agent 配置（YAML + prompt）
│   ├── requirement/
│   ├── design/
│   ├── developer/
│   └── tester/
│
├── scripts/                     # 运维脚本
│   ├── start.sh
│   ├── stop.sh
│   └── restart.sh
│
├── docs/                        # 文档
│   ├── plan.md                  #   任务看板（AI 必读）
│   ├── architecture.md          #   架构设计
│   ├── api.md                   #   REST API 文档
│   └── ...
│
├── pipeline.yaml                # 流水线阶段配置
├── package.json                 # monorepo root
├── pnpm-workspace.yaml          # workspace 定义
├── tsconfig.base.json           # 共享 TS 配置
├── .env.example                 # 环境变量模板
└── CLAUDE.md                    # AI 协作规则
```

## 进程模型

```
scripts/start.sh
  ├── Server (tsx apps/server/src/index.ts)  — :8000
  │     └── Agent Engine 内嵌（同进程）
  └── Web (next dev)                         — :3000
        └── API 请求 → Server :8000
```

## 快速开始

```bash
cp .env.example .env     # 编辑填入 ANTHROPIC_API_KEY
pnpm install             # 安装依赖
bash scripts/start.sh    # 启动
```

浏览器打开 `http://localhost:3000`。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| ANTHROPIC_API_KEY | （空） | Anthropic API 密钥 |
| DEFAULT_MODEL | claude-sonnet-4-20250514 | 默认 LLM 模型 |
| DATABASE_PATH | ./zcode.db | SQLite 数据库路径 |
| AGENTS_DIR | ./agents | Agent 配置目录 |
| NEXT_PUBLIC_API_URL | http://localhost:8000 | Server API 地址 |

## 常用命令

```bash
pnpm -r typecheck       # 类型检查
bash scripts/start.sh   # 启动
bash scripts/stop.sh    # 停止
bash scripts/restart.sh # 重启
```
