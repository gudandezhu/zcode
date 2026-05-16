#!/usr/bin/env bash
# 从 Go model 层提取结构体定义
# 输入: 项目根目录
# ���出: JSON [{name, fields, source}]
set -euo pipefail

ROOT="${1:-.}"
MODEL_DIR="$ROOT/backend/model"

if [ ! -d "$MODEL_DIR" ]; then
  echo "[]"
  exit 0
fi

cd "$ROOT"

python3 -c "
import re, json, glob

items = []
for f in sorted(glob.glob('backend/model/*.go')):
    with open(f) as fh:
        lines = fh.readlines()

    current_struct = ''
    struct_line = 0
    fields = []

    for i, line in enumerate(lines):
        # 匹配 type Xxx struct {
        m = re.match(r'^type\s+(\w+)\s+struct\s*\{', line)
        if m:
            current_struct = m.group(1)
            struct_line = i + 1
            fields = []
            continue

        # struct 结束
        if current_struct and re.match(r'^\}', line):
            if fields:
                items.append({
                    'name': current_struct,
                    'fields': fields,
                    'source': f'{f}:{struct_line}'
                })
            current_struct = ''
            fields = []
            continue

        # struct 内部字段: FieldName Type ...
        if current_struct:
            fm = re.match(r'^\s+(\w+)\s+', line)
            if fm and fm.group(1)[0].isupper():
                fields.append(fm.group(1))

print(json.dumps(items, indent=2, ensure_ascii=False))
"
