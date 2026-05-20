# 部署指南

## 环境要求

- Node.js 23+（Next.js 16 要求）
- pnpm 10+
- OpenAI 或 Anthropic API Key

## 配置

### 1. 环境变量

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

编辑 `agents/{name}/agent.yaml` 和 `agents/{name}/system_prompt.md`。修改后调用 `/api/agents/reload` 生效，无需重启。

## 启动

```bash
pnpm install
pnpm dev
```

单进程启动，所有功能在 `http://localhost:3000` 上运行。

## 构建

```bash
pnpm build
pnpm start
```

生产模式运行优化后的 Next.js 应用。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| OPENAI_API_KEY | （空） | OpenAI API 密钥 |
| ANTHROPIC_API_KEY | （空） | Anthropic API 密钥 |
| DEFAULT_MODEL | gpt-4o | 默认 LLM 模型 |
| PORT | 3000 | 服务端口 |
| DATABASE_PATH | ./zcode.db | SQLite 数据库路径 |
| AGENTS_DIR | ./agents | Agent 配置目录 |
| ANTHROPIC_BASE_URL | （空） | Anthropic API 代理地址 |
| MAX_ITERATIONS | 50 | Agent Loop 最大迭代次数 |
| DEFAULT_MAX_ROUNDS | 50 | Session 默认最大轮次 |
| SESSION_TTL_SECONDS | 86400 | Session 过期时间 |
| DEFAULT_MAX_TOKENS | 8192 | LLM 默认最大 token |
| LLM_REQUEST_TIMEOUT | 120 | LLM 请求超时（秒） |

## 数据库

使用 SQLite，文件位于项目根目录 `zcode.db`。通过 Drizzle ORM 管理 schema 和迁移。

五张表：
- `tasks` — 任务
- `conversations` — 对话
- `messages` — 消息记录
- `sessions` — Agent 会话
- `project_memories` — 项目记忆

数据库在服务启动时自动迁移，无需手动初始化。

## 生产部署

1. `pnpm build` 构建优化产物
2. `pnpm start` 启动生产服务
3. 用 Nginx 反向代理（可选）
4. 用 systemd / PM2 管理进程
