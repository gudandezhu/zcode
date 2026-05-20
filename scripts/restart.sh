#!/usr/bin/env bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 重启 zcode ==="
echo ""
bash "$SCRIPTS_DIR/stop.sh"
echo ""
bash "$SCRIPTS_DIR/start.sh"
