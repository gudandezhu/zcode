# Zcode

AI 驱动的软件开发平台。通过流水线（需求→设计→开发→测试）组织软件开发流程，每个环节由 AI Agent 自动执行。

## 核心功能

- **看板**：流水线视图，任务卡片在需求→设计→开发→测试四列间流转
- **聊天**：与 AI Agent 对话，包含流水线 Agent 和自定义 Agent
- **Session**：Agent 自主执行任务，迭代调 LLM + 执行 skills
- **Discussion**：多 Agent 讨论，两个 Agent 围绕主题多轮对话
- **Agent 配置**：每个 Agent 独立目录（YAML + prompt + skills），灵活可扩展

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 16 + React + TypeScript + Tailwind CSS + shadcn/ui |
| 后端 | Go + Gin + SQLite |
| Agent Engine | Python + FastAPI + Anthropic SDK / OpenAI SDK |
| AI | OpenAI API / Anthropic API |

三层架构：前端 → Go 后端（数据持久化、API网关）→ Agent Engine（LLM调用、Session管理）

## 项目结构

```
zcode/
├── docs/                   # 文档
├── agents/                 # Agent 配置（每个子目录一个 Agent）
│   ├── requirement/
│   │   ├── agent.yaml      # 元数据（name, role, stage, model, max_rounds）
│   │   ├── system_prompt.md # 系统提示词
│   │   └── skills/         # Agent 可执行的技能脚本
│   ├── design/
│   ├── developer/
│   └── tester/
├── backend/                # Go 后端
│   ├── main.go             # 入口 + 路由
│   ├── config/             # 环境变量配置
│   ├── db/                 # SQLite 数据库（4表：tasks, conversations, messages, sessions）
│   ├── model/              # 数据结构定义
│   ├── agent/              # LLM Provider（聊天用）
│   ├── service/            # 业务逻辑
│   │   ├── task_service.go # 任务 CRUD + 状态机
│   │   ├── agent_service.go# Agent 配置解析（YAML）
│   │   ├── chat_service.go # 聊天编排
│   │   ├── session_service.go  # Session 管理
│   │   └── agent_bridge.go # Agent Engine HTTP 代理
│   ├── handler/            # HTTP 处理器
│   └── packages/harness/   # deer-flow 参考（Python）
├── agent-engine/           # Python Agent Engine
│   ├── server.py           # FastAPI 入口
│   ├── engine/             # 核心引擎
│   │   ├── agent_loop.py   # Agent 执行循环
│   │   ├── session.py      # Session 管理
│   │   ├── discussion.py   # 多 Agent 讨论
│   │   ├── skill_loader.py # Skill 加载器
│   │   └── constants.py    # 常量配置
│   └── providers/          # LLM Provider
│       ├── base.py         # Provider 基类
│       ├── registry.py     # Provider 注册表
│       ├── openai_provider.py
│       └── anthropic_provider.py
├── frontend/
│   └── src/
│       ├── app/            # 页面路由（/kanban, /chat）
│       ├── components/     # UI 组件
│       └── lib/api.ts      # 后端 API 客户端
├── start.sh                # 一键启动
├── stop.sh                 # 一键停止
└── restart.sh              # 一键重启
```

## 快速开始

```bash
# 配置
cp .env.example .env  # 编辑填入 API Key

# 一键启动
./start.sh
```

三个服务自动启动：
- Backend: `http://localhost:8000`
- Agent Engine: `http://localhost:8001`
- Frontend: `http://localhost:3000`

浏览器打开前端地址，自动跳转看板页。
