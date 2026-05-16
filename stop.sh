#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"

stop_service() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$pid_file"
    echo "[$name] 已杀死 (PID $pid)"
  else
    echo "[$name] 未运行"
  fi
}

stop_service "frontend"
stop_service "engine"
stop_service "backend"

echo "所有服务已停止"
