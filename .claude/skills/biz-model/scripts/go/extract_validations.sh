#!/usr/bin/env bash
# 从 Go handler/model 提取 binding 校验标签
# 输入: 项目根目录
# 输出: JSON [{struct, field, rule, source}]
set -euo pipefail

ROOT="${1:-.}"
HANDLER_DIR="$ROOT/backend/handler"
MODEL_DIR="$ROOT/backend/model"

if [ ! -d "$HANDLER_DIR" ]; then
  echo "[]"
  exit 0
fi

python3 -c "
import re, json, glob

results = []

# 扫描 model 层的 binding tag
for f in glob.glob('$MODEL_DIR/*.go'):
    with open(f) as fh:
        lines = fh.readlines()
    current_struct = ''
    for i, line in enumerate(lines):
        struct_m = re.match(r'type\s+(\w+)\s+struct\s*{', line)
        if struct_m:
            current_struct = struct_m.group(1)
            continue
        # 匹配 binding:\"required\" 等
        binding_m = re.search(r'binding:\"([^\"]+)\"', line)
        if binding_m and current_struct:
            field_m = re.match(r'\s+(\w+)\s+', line)
            field = field_m.group(1) if field_m else '?'
            results.append({
                'struct': current_struct,
                'field': field,
                'rule': binding_m.group(1),
                'source': f'backend/model/{f.split(\"/\")[-1]}:{i+1}'
            })

# 扫描 handler 层的 ShouldBindJSON / ShouldBindQuery
for f in glob.glob('$HANDLER_DIR/*.go'):
    with open(f) as fh:
        lines = fh.readlines()
    for i, line in enumerate(lines):
        bind_m = re.search(r'ShouldBind(JSON|Query|Uri)\(', line)
        if bind_m:
            results.append({
                'struct': '',
                'field': '',
                'rule': f'must_bind_{bind_m.group(1).lower()}',
                'source': f'backend/handler/{f.split(\"/\")[-1]}:{i+1}'
            })

print(json.dumps(results, indent=2, ensure_ascii=False))
"
