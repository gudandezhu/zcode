#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"

stop_service() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$pid_file"
    echo "[$name] 已停止 (PID $pid)"
  else
    echo "[$name] 未运行"
  fi
}

stop_service "web"
stop_service "server"

# 兜底：按端口清理残留进程
for port in 8000 3333; do
  pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "端口 $port 仍有进程占用 (PID $pid)，强制清理"
    echo "$pid" | xargs kill -9 2>/dev/null || true
  fi
done

echo "所有服务已停止"
