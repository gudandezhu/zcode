#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 重启 zcode ==="
echo ""
bash "$ROOT_DIR/stop.sh"
echo ""
sleep 1
bash "$ROOT_DIR/start.sh"
