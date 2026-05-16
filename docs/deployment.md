# 部署指南

## 环境要求

- Go 1.23+
- Python 3.11+（agent-engine）
- Node.js 23+（Next.js 16 要求）
- pnpm 10+
- OpenAI 或 Anthropic API Key

## 配置

### 1. 环境变量

在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
OPENAI_API_KEY=sk-xxx           # OpenAI 模型使用
ANTHROPIC_API_KEY=sk-ant-xxx    # Anthropic 模型使用
DEFAULT_MODEL=gpt-4o            # 默认模型
```

至少配置一个 API Key。

### 2. Agent 配置

编辑 `agents/{name}/agent.yaml` 和 `agents/{name}/system_prompt.md`，定义 Agent 的角色、阶段、模型和 prompt。

修改后调用 reload API 生效，无需重启。

## 一键启动

```bash
./start.sh
```

自动启动三个服务：
- **Backend** Go Gin :8000
- **Agent Engine** Python FastAPI :8001
- **Frontend** Next.js :3000

启动后自动健康检查，等待所有服务就绪。

### 其他命令

```bash
./stop.sh      # 停止所有服务
./restart.sh   # 重启所有服务
```

## 手动启动

### Go 后端

```bash
cd backend
go build -o zcode-server .
DATABASE_PATH=../zcode.db \
AGENTS_DIR=../agents \
AGENT_ENGINE_URL=http://localhost:8001 \
./zcode-server
```

### Agent Engine

```bash
cd agent-engine
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
AGENTS_DIR=../agents \
GO_CALLBACK_URL=http://localhost:8000 \
.venv/bin/python server.py
```

### 前端

```bash
cd frontend
pnpm install
pnpm dev
```

前端默认在 `http://localhost:3000`。如端口被占用：

```bash
PORT=3333 pnpm dev
```

## 环境变量

### Go 后端

| 变量 | 默认值 | 说明 |
|------|--------|------|
| OPENAI_API_KEY | （空） | OpenAI API 密钥 |
| ANTHROPIC_API_KEY | （空） | Anthropic API 密钥 |
| DEFAULT_MODEL | gpt-4o | 默认 LLM 模型 |
| PORT | 8000 | 后端服务端口 |
| DATABASE_PATH | ./zcode.db | SQLite 数据库路径 |
| AGENT_CONFIG_PATH | ./agents/CLAUDE.md | Agent 配置路径（兼容旧版，实际使用 AGENTS_DIR） |
| AGENTS_DIR | ../agents | Agent 配置目录 |
| AGENT_ENGINE_URL | http://localhost:8001 | Agent Engine 地址 |

### Agent Engine (Python)

| 变量 | 默认值 | 说明 |
|------|--------|------|
| AGENTS_DIR | ../agents | Agent 配置目录 |
| GO_CALLBACK_URL | http://localhost:8000 | Go 后端回调地址 |
| ANTHROPIC_BASE_URL | （空） | Anthropic API 代理地址 |
| ENGINE_PORT | 8001 | Agent Engine 端口 |
| MAX_ITERATIONS | 50 | Agent Loop 最大迭代次数 |
| DEFAULT_MAX_ROUNDS | 50 | Session 默认最大轮次 |
| SESSION_TTL_SECONDS | 86400 | Session 过期时间 |
| SSE_CHANNEL_BUFFER | 64 | SSE 事件队列缓冲区大小 |
| DEFAULT_MAX_TOKENS | 8192 | LLM 默认最大 token |
| LLM_REQUEST_TIMEOUT | 120 | LLM 请求超时（秒） |
| CALLBACK_TIMEOUT | 10 | 回调超时（秒） |

### 前端

| 变量 | 默认值 | 说明 |
|------|--------|------|
| NEXT_PUBLIC_API_URL | http://localhost:8000 | 后端 API 地址 |

## 数据库

使用 SQLite，文件位于项目根目录 `zcode.db`。

四张表：
- `tasks` — 任务
- `conversations` — 对话
- `messages` — 消息记录
- `sessions` — Agent 会话（自主执行和多 Agent 讨论）

数据库在服务启动时自动创建和迁移，无需手动初始化。

## 生产部署建议

1. 前端 `pnpm build` 生成静态文件，用 Nginx 代理
2. 后端 `go build` 编译为二进制，直接运行或用 systemd 管理
3. Agent Engine 用 venv 或 conda 管理 Python 环境，同样用 systemd 管理
4. 配置 `GIN_MODE=release` 关闭 debug 日志
5. CORS 配置生产环境的域名白名单
