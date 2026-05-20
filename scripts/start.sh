#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"
mkdir -p "$PID_DIR"

# 加载 .env
if [ -f "$ROOT_DIR/.env" ]; then
  set -a; source "$ROOT_DIR/.env"; set +a
fi

is_alive() {
  local pid_file="$1"
  [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

# Server (Hono)
if is_alive "$PID_DIR/server.pid"; then
  echo "[server] 已在运行 (PID $(cat "$PID_DIR/server.pid"))"
else
  echo "[server] 启动中..."
  cd "$ROOT_DIR"
  DATABASE_PATH="$ROOT_DIR/zcode.db" \
  AGENTS_DIR="$ROOT_DIR/agents" \
  nohup npx tsx --watch apps/server/src/index.ts > "$PID_DIR/server.log" 2>&1 &
  echo $! > "$PID_DIR/server.pid"
  echo "[server] 已启动 (PID $(cat "$PID_DIR/server.pid"))"
fi

# Frontend (Next.js)
if is_alive "$PID_DIR/web.pid"; then
  echo "[web] 已在运行 (PID $(cat "$PID_DIR/web.pid"))"
else
  echo "[web] 启动中..."
  cd "$ROOT_DIR/apps/web"
  nohup pnpm dev > "$PID_DIR/web.log" 2>&1 &
  echo $! > "$PID_DIR/web.pid"
  echo "[web] 已启动 (PID $(cat "$PID_DIR/web.pid"))"
fi

# 健康检查
echo ""
echo "等待服务就绪..."
for i in $(seq 1 15); do
  SERVER_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health 2>/dev/null || echo "")
  WEB_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3333 2>/dev/null || echo "")

  if [ "$SERVER_OK" = "200" ] && [ -n "$WEB_OK" ]; then
    echo "✓ 所有服务已就绪"
    echo "  Server:  http://localhost:8000"
    echo "  Web:     http://localhost:3333"
    exit 0
  fi
  sleep 1
done

echo "⚠ 部分服务可能未就绪，请检查日志："
echo "  Server:  cat $PID_DIR/server.log"
echo "  Web:     cat $PID_DIR/web.log"
