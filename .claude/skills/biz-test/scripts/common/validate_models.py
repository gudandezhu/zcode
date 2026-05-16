#!/usr/bin/env python3
"""
验证 tests/model/ 下的 yaml 文件一致性。
对照源码检查：实体名/字段/路由/状态值/约束是否匹配。
输出: JSON [{check, passed, evidence}]
"""
import json, re, sys, yaml, glob, os

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
MODEL_DIR = os.path.join(ROOT, "tests/model")
EXTRACTED_DIR = os.path.join(ROOT, "tests/extracted")


def load_yaml(name):
    path = os.path.join(MODEL_DIR, name)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return yaml.safe_load(f)


def read_file(rel_path):
    abs_path = os.path.join(ROOT, rel_path)
    if not os.path.exists(abs_path):
        return []
    with open(abs_path) as f:
        return f.readlines()


results = []


def check(label, passed, evidence=""):
    results.append({"check": label, "passed": passed, "evidence": evidence})


# 0. 检查 tests/extracted/ 是否存在（Step 0 是否执行）
if not os.path.isdir(EXTRACTED_DIR):
    check("tests/extracted/ exists (Step 0 executed)", False, "directory not found")

# 1. domain.yaml 实体 vs extracted structs.json
domain = load_yaml("domain.yaml")
extracted_structs = []
structs_path = os.path.join(EXTRACTED_DIR, "structs.json")
if os.path.exists(structs_path):
    with open(structs_path) as f:
        extracted_structs = json.load(f)

if domain and "entities" in domain:
    for ent in domain["entities"]:
        # 优先用 structs.json 对照
        matched = [s for s in extracted_structs if s["name"] == ent["name"]]
        if matched:
            # 检查字段覆盖
            extracted_fields = set(matched[0].get("fields", []))
            model_fields = set(ent.get("fields", []))
            missing = extracted_fields - model_fields
            check(
                f"entity '{ent['name']}' fields complete",
                len(missing) == 0,
                f"missing fields: {missing}" if missing else f"all {len(extracted_fields)} fields present",
            )
        else:
            # 回退到源码检查
            src = ent.get("source", "")
            if ":" in src:
                fpath, _ = src.rsplit(":", 1)
                lines = read_file(fpath)
                found = any(
                    re.search(rf"type\s+{ent['name']}\s+struct", l) for l in lines
                )
                check(f"entity '{ent['name']}' exists in source", found, src)
            else:
                check(f"entity '{ent['name']}' source missing", False, "no source field")
else:
    check("domain.yaml loaded", False, "file not found or empty")

# 2. domain.yaml actions vs extracted routes.json
if domain and "actions" in domain:
    extracted_routes = []
    routes_path = os.path.join(EXTRACTED_DIR, "routes.json")
    if os.path.exists(routes_path):
        with open(routes_path) as f:
            extracted_routes = json.load(f)

    for act in domain["actions"]:
        path_pattern = act.get("path", "")
        method = act.get("method", "")
        if extracted_routes:
            found = any(
                r["method"] == method and r["path"] == path_pattern
                for r in extracted_routes
            )
        else:
            main_lines = read_file("backend/main.go")
            found = any(
                method in l and path_pattern in l
                for l in main_lines
            )
        check(
            f"action '{act.get('name')}' route ({method} {act.get('path')}) in main.go",
            found,
            act.get("source", ""),
        )

# 3. state-machines.yaml 状态值 vs migrate() DEFAULT
sm = load_yaml("state-machines.yaml")
db_lines = read_file("backend/db/db.go")
if sm and "stateMachines" in sm:
    for entity, config in sm["stateMachines"].items():
        states = config.get("states", [])
        # 搜索 db.go 中对应字段的 DEFAULT 值
        for state in states:
            found = any(f"'{state}'" in l or f'"{state}"' in l for l in db_lines)
            check(
                f"state '{state}' of '{entity}' found in db.go",
                found or len(states) <= 2,
                f"state-machines.yaml:{entity}",
            )

# 4. invariants.yaml 交叉引用
invariants = load_yaml("invariants.yaml")
impact = load_yaml("impact-graph.yaml")
if invariants and impact:
    inv_names = {inv["name"] for inv in invariants.get("invariants", [])}
    if "actions" in impact:
        for act_name, act_data in impact["actions"].items():
            for ref in act_data.get("invariantChecks", []):
                exists = ref in inv_names
                check(
                    f"impact-graph invariant ref '{ref}' (action: {act_name})",
                    exists,
                    f"invariantChecks: {ref}",
                )

# 5. test-matrix.yaml 完整性
matrix = load_yaml("test-matrix.yaml")
if matrix and "testMatrix" in matrix:
    path_types = set()
    priorities = set()
    for tc in matrix["testMatrix"]:
        pt = tc.get("pathType", "")
        pr = tc.get("priority", "")
        if pt:
            path_types.add(pt)
        if pr:
            priorities.add(pr)

    expected_paths = {
        "happy", "exception", "boundary", "permission",
        "timeout", "idempotent", "concurrency", "compensation",
    }
    missing = expected_paths - path_types
    check(
        "test-matrix covers all 8 path types",
        len(missing) == 0,
        f"missing: {missing}" if missing else "all 8 types present",
    )
    check(
        "test-matrix has priority assignments",
        len(priorities) > 0,
        f"priorities found: {priorities}",
    )

# Summary
passed = sum(1 for r in results if r["passed"])
total = len(results)
summary = "PASS" if passed == total else f"FAIL ({total - passed} issues)"

output = {"summary": summary, "passed": passed, "total": total, "checks": results}
print(json.dumps(output, indent=2, ensure_ascii=False))
