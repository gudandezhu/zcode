#!/usr/bin/env bash
# 从 db.go 的 migrate() 提取 SQL 约束
# 输入: 项目根目录
# 输出: JSON [{table, column, constraint_type, value}]
set -euo pipefail

ROOT="${1:-.}"
DB_FILE="$ROOT/backend/db/db.go"

if [ ! -f "$DB_FILE" ]; then
  echo "[]"
  exit 0
fi

python3 - "$DB_FILE" << 'PYEOF'
import re, json, sys

db_file = sys.argv[1]
with open(db_file) as f:
    content = f.read()

constraints = []

table_pattern = r'CREATE TABLE IF NOT EXISTS (\w+)\s*\((.*?)\);'
for tm in re.finditer(table_pattern, content, re.DOTALL):
    table = tm.group(1)
    body = tm.group(2)
    table_line = content[:tm.start()].count('\n') + 1

    pk = re.search(r'(\w+)\s+TEXT PRIMARY KEY', body)
    if pk:
        constraints.append({
            "table": table, "column": pk.group(1),
            "constraint_type": "PRIMARY_KEY",
            "value": None, "source": f"backend/db/db.go:{table_line}"
        })

    ai = re.search(r'(\w+)\s+INTEGER PRIMARY KEY AUTOINCREMENT', body)
    if ai:
        constraints.append({
            "table": table, "column": ai.group(1),
            "constraint_type": "AUTO_INCREMENT",
            "value": None, "source": f"backend/db/db.go:{table_line}"
        })

    col_pattern = r"(\w+)\s+\w+\s+NOT NULL\s+DEFAULT\s+'([^']*)'"
    for cm in re.finditer(col_pattern, body):
        constraints.append({
            "table": table, "column": cm.group(1),
            "constraint_type": "NOT_NULL_DEFAULT",
            "value": cm.group(2),
            "source": f"backend/db/db.go:{table_line}"
        })

    col_pattern2 = r"(\w+)\s+\w+\s+NOT NULL\s+DEFAULT\s+(\(.*?\)|\w+)"
    for cm in re.finditer(col_pattern2, body):
        col = cm.group(1)
        if not any(c["column"] == col and c["constraint_type"] == "NOT_NULL_DEFAULT" for c in constraints):
            constraints.append({
                "table": table, "column": col,
                "constraint_type": "NOT_NULL_DEFAULT",
                "value": cm.group(2),
                "source": f"backend/db/db.go:{table_line}"
            })

    fk_pattern = r'FOREIGN KEY\s*\((\w+)\)\s+REFERENCES\s+(\w+)\((\w+)\)'
    for fm in re.finditer(fk_pattern, body):
        constraints.append({
            "table": table, "column": fm.group(1),
            "constraint_type": "FOREIGN_KEY",
            "value": f"{fm.group(2)}.{fm.group(3)}",
            "source": f"backend/db/db.go:{table_line}"
        })

print(json.dumps(constraints, indent=2, ensure_ascii=False))
PYEOF
