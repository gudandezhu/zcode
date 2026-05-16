#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
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

# Backend (Go)
if is_alive "$PID_DIR/backend.pid"; then
  echo "[backend] 已在运行 (PID $(cat "$PID_DIR/backend.pid"))"
else
  echo "[backend] 启动中..."
  cd "$ROOT_DIR/backend"
  DATABASE_PATH="$ROOT_DIR/zcode.db" \
  AGENT_CONFIG_PATH="$ROOT_DIR/agents/" \
  AGENTS_DIR="$ROOT_DIR/agents" \
  AGENT_ENGINE_URL="${AGENT_ENGINE_URL:-http://localhost:8001}" \
  go build -o zcode-server . 2>/dev/null
  DATABASE_PATH="$ROOT_DIR/zcode.db" \
  AGENT_CONFIG_PATH="$ROOT_DIR/agents/" \
  AGENTS_DIR="$ROOT_DIR/agents" \
  AGENT_ENGINE_URL="${AGENT_ENGINE_URL:-http://localhost:8001}" \
  nohup ./zcode-server > "$PID_DIR/backend.log" 2>&1 &
  echo $! > "$PID_DIR/backend.pid"
  echo "[backend] 已启动 (PID $(cat "$PID_DIR/backend.pid"))"
fi

# Agent Engine (Python)
if is_alive "$PID_DIR/engine.pid"; then
  echo "[engine] 已在运行 (PID $(cat "$PID_DIR/engine.pid"))"
else
  echo "[engine] 启动中..."
  cd "$ROOT_DIR/agent-engine"
  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    .venv/bin/pip install -q -r requirements.txt
  fi
  AGENTS_DIR="$ROOT_DIR/agents" \
  GO_CALLBACK_URL="${GO_CALLBACK_URL:-http://localhost:8000}" \
  nohup .venv/bin/python server.py > "$PID_DIR/engine.log" 2>&1 &
  echo $! > "$PID_DIR/engine.pid"
  echo "[engine] 已启动 (PID $(cat "$PID_DIR/engine.pid"))"
fi

# Frontend (Next.js)
if is_alive "$PID_DIR/frontend.pid"; then
  echo "[frontend] 已在运行 (PID $(cat "$PID_DIR/frontend.pid"))"
else
  echo "[frontend] 启动中..."
  cd "$ROOT_DIR/frontend"
  nohup pnpm dev > "$PID_DIR/frontend.log" 2>&1 &
  echo $! > "$PID_DIR/frontend.pid"
  echo "[frontend] 已启动 (PID $(cat "$PID_DIR/frontend.pid"))"
fi

# 健康检查
echo ""
echo "等待服务就绪..."
for i in $(seq 1 15); do
  BACKEND_OK=$(curl -sf http://localhost:8000/api/health 2>/dev/null && echo "ok" || echo "")
  ENGINE_OK=$(curl -sf http://localhost:8001/health 2>/dev/null && echo "ok" || echo "")
  FRONTEND_OK=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)

  if [ "$BACKEND_OK" = "ok" ] && [ "$ENGINE_OK" = "ok" ] && [ "$FRONTEND_OK" != "" ]; then
    echo "✓ 所有服务已就绪"
    echo "  Backend:       http://localhost:8000"
    echo "  Agent Engine:  http://localhost:8001"
    echo "  Frontend:      http://localhost:3000"
    exit 0
  fi
  sleep 1
done

echo "⚠ 部分服务可能未就绪，请检查日志："
echo "  Backend:  cat $PID_DIR/backend.log"
echo "  Engine:   cat $PID_DIR/engine.log"
echo "  Frontend: cat $PID_DIR/frontend.log"
