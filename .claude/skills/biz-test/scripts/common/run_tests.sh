#!/usr/bin/env bash
# 执行 go test 并解析结果为结构化 JSON
# 输入: 项目根目录
# 输出: JSON {pass, fail, skip, total, duration_ms, details:[{test, status, duration}]}
set -euo pipefail

ROOT="${1:-.}"
BACKEND="$ROOT/backend"

if [ ! -f "$BACKEND/go.mod" ]; then
  echo '{"error":"no go.mod found"}'
  exit 1
fi

cd "$BACKEND"

# go test -json 输出每行一个 JSON
OUTPUT=$(go test -v -json -count=1 ./... 2>&1 || true)

python3 -c "
import json, sys

lines = sys.stdin.read().strip().split('\n')
results = {}
pass_count = 0
fail_count = 0
skip_count = 0

for line in lines:
    if not line.strip():
        continue
    try:
        ev = json.loads(line)
    except json.JSONDecodeError:
        continue

    test = ev.get('Test', '')
    action = ev.get('Action', '')

    if not test or action not in ('pass', 'fail', 'skip'):
        continue

    if action == 'pass':
        pass_count += 1
    elif action == 'fail':
        fail_count += 1
    elif action == 'skip':
        skip_count += 1

    results[test] = action

details = [{'test': t, 'status': s} for t, s in results.items()]

output = {
    'pass': pass_count,
    'fail': fail_count,
    'skip': skip_count,
    'total': pass_count + fail_count + skip_count,
    'details': details
}
print(json.dumps(output, indent=2, ensure_ascii=False))
" <<< "$OUTPUT"
