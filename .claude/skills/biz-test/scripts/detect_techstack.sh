#!/usr/bin/env bash
# 探测项目技术栈
# 输入: 项目根目录
# 输出: JSON {backend, frontend, database, framework}
set -euo pipefail

ROOT="${1:-.}"

python3 - "$ROOT" << 'PYEOF'
import json, os, sys

root = sys.argv[1]
result = {"backend": "unknown", "frontend": "unknown", "database": "unknown", "framework": "unknown"}

# Backend detection
if os.path.exists(os.path.join(root, "go.mod")):
    result["backend"] = "go"
    # Detect framework
    with open(os.path.join(root, "go.mod")) as f:
        content = f.read()
    if "gin-gonic/gin" in content:
        result["framework"] = "gin"
    elif "labstack/echo" in content:
        result["framework"] = "echo"
    elif "gofiber/fiber" in content:
        result["framework"] = "fiber"
    else:
        result["framework"] = "stdlib"
elif os.path.exists(os.path.join(root, "backend/go.mod")):
    result["backend"] = "go"
    with open(os.path.join(root, "backend/go.mod")) as f:
        content = f.read()
    if "gin-gonic/gin" in content:
        result["framework"] = "gin"
    elif "labstack/echo" in content:
        result["framework"] = "echo"
    else:
        result["framework"] = "stdlib"
elif os.path.exists(os.path.join(root, "requirements.txt")) or os.path.exists(os.path.join(root, "pyproject.toml")):
    result["backend"] = "python"
    result["framework"] = "unknown"
elif os.path.exists(os.path.join(root, "pom.xml")) or os.path.exists(os.path.join(root, "build.gradle")):
    result["backend"] = "java"
    result["framework"] = "unknown"

# Database detection
for go_mod in [os.path.join(root, "go.mod"), os.path.join(root, "backend/go.mod")]:
    if os.path.exists(go_mod):
        with open(go_mod) as f:
            content = f.read()
        if "sqlite" in content.lower():
            result["database"] = "sqlite"
        elif "postgres" in content.lower():
            result["database"] = "postgres"
        elif "mysql" in content.lower():
            result["database"] = "mysql"
        break

# Frontend detection
pkg_json = os.path.join(root, "package.json")
fe_pkg_json = os.path.join(root, "frontend/package.json")
for p in [pkg_json, fe_pkg_json]:
    if os.path.exists(p):
        with open(p) as f:
            content = f.read()
        if '"next"' in content:
            result["frontend"] = "nextjs"
        elif '"nuxt"' in content:
            result["frontend"] = "nuxt"
        elif '"react"' in content:
            result["frontend"] = "react"
        elif '"vue"' in content:
            result["frontend"] = "vue"
        break

print(json.dumps(result, indent=2, ensure_ascii=False))
PYEOF
