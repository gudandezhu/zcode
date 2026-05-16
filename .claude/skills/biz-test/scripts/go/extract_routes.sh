#!/usr/bin/env bash
# 从 main.go 提取 Gin 路由注册
# 输入: 项目根目录
# 输出: JSON [{method, path, handler}]
set -euo pipefail

ROOT="${1:-.}"
MAIN="$ROOT/backend/main.go"

if [ ! -f "$MAIN" ]; then
  echo "[]"
  exit 0
fi

python3 - "$MAIN" << 'PYEOF'
import re, json, sys

main_file = sys.argv[1]
with open(main_file) as f:
    lines = f.readlines()

routes = []
route_pattern = re.compile(r'\.(GET|POST|PATCH|PUT|DELETE|OPTIONS)\s*\(\s*"([^"]*)"\s*,\s*([^)]+)\)')
group_pattern = re.compile(r'(\w+)\s*:=\s*(\w+)\.Group\(\s*"([^"]*)"')

# 变量名 -> 前缀路径的映射
var_prefix = {}
# 作用域栈：每个 { 压入当前 var_prefix 快照，每个 } 弹出恢复
scope_stack = []

for i, line in enumerate(lines):
    # 跟踪大括号作用域
    if '{' in line:
        # 检查是否在同一行有 Group 声明（如 xxx := r.Group("/api") {）
        scope_stack.append(dict(var_prefix))
    if '}' in line and scope_stack:
        var_prefix = scope_stack.pop()

    # 检测 Group 声明
    gm = group_pattern.search(line)
    if gm:
        var_name = gm.group(1)
        parent_var = gm.group(2)
        sub_path = gm.group(3)
        parent_prefix = var_prefix.get(parent_var, "")
        var_prefix[var_name] = parent_prefix + sub_path

    # 检测路由注册
    for m in re.finditer(route_pattern, line):
        # 获取注册变量的前缀
        dot_match = re.search(r'(\w+)\.(?:GET|POST|PATCH|PUT|DELETE|OPTIONS)', line)
        var_name = dot_match.group(1) if dot_match else ""
        prefix = var_prefix.get(var_name, "")
        path = prefix + m.group(2)
        routes.append({
            "method": m.group(1),
            "path": path if path else "/",
            "handler": m.group(3).strip(),
            "source": f"backend/main.go:{i+1}"
        })

print(json.dumps(routes, indent=2, ensure_ascii=False))
PYEOF
