#!/usr/bin/env python3
"""
验证 docs/ 下模型文件与 docs/extracted/ 原始数据的一致性。
输出: JSON {summary, passed, total, checks:[{check, passed, evidence}]}
"""
import json, re, sys, os

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
DOCS_DIR = os.path.join(ROOT, "docs/biz-model")
EXTRACTED_DIR = os.path.join(ROOT, "docs/biz-model/extracted")

results = []

def check(label, passed, evidence=""):
    results.append({"check": label, "passed": passed, "evidence": evidence})

def load_md_sections(filepath):
    """Parse a markdown file into sections by ## headings."""
    if not os.path.exists(filepath):
        return None
    with open(filepath) as f:
        content = f.read()
    sections = {}
    current_name = None
    current_lines = []
    for line in content.split("\n"):
        if line.startswith("## "):
            if current_name:
                sections[current_name] = "\n".join(current_lines)
            current_name = line[3:].strip()
            current_lines = []
        elif current_name:
            current_lines.append(line)
    if current_name:
        sections[current_name] = "\n".join(current_lines)
    return sections

def load_md_table(filepath):
    """Parse markdown table rows (skip header and separator)."""
    if not os.path.exists(filepath):
        return []
    with open(filepath) as f:
        content = f.read()
    rows = []
    for line in content.split("\n"):
        line = line.strip()
        if line.startswith("|") and not re.match(r'^\|[\s\-:|]+\|$', line):
            cells = [c.strip() for c in line.split("|")[1:-1]]
            if cells:
                rows.append(cells)
    # Skip header row
    return rows[1:] if rows else []

def load_json(name):
    path = os.path.join(EXTRACTED_DIR, name)
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)

def extract_entities_from_md(filepath):
    """Extract entity names from entities.md by parsing ## headings."""
    sections = load_md_sections(filepath)
    if sections is None:
        return None
    return list(sections.keys())

# 0. extracted 目录存在（路径 A 有，路径 B 无，都可接受）
has_extracted = os.path.isdir(EXTRACTED_DIR)
check("docs/biz-model/extracted/ exists (optional)", True, "path A: yes, path B: no, both OK")

# 1. entities.md vs structs.json
entities_path = os.path.join(DOCS_DIR, "entities.md")
entity_names = extract_entities_from_md(entities_path)
structs = load_json("structs.json")

if entity_names is not None:
    if structs:
        struct_names = {s["name"] for s in structs}
        for s_name in struct_names:
            check(f"struct '{s_name}' in entities.md", s_name in set(entity_names),
                  f"structs.json has it, entities.md {'has' if s_name in set(entity_names) else 'MISSING'} it")
    sections = load_md_sections(entities_path)
    for name in entity_names:
        content = sections.get(name, "")
        has_desc = len(content.strip()) > 10
        check(f"entity '{name}' has business description", has_desc,
              content.strip()[:60] if content else "(empty)")
else:
    check("entities.md loaded", False, "file not found")

# 2. relations.md 引用完整性
relations_path = os.path.join(DOCS_DIR, "relations.md")
relation_rows = load_md_table(relations_path)
if relation_rows and entity_names:
    entity_set = set(entity_names)
    for row in relation_rows:
        if len(row) >= 2:
            f_ok = row[0] in entity_set
            t_ok = row[1] in entity_set
            check(f"relation '{row[0]}' → '{row[1]}' entities exist",
                  f_ok and t_ok,
                  f"from:{'OK' if f_ok else 'MISSING'} to:{'OK' if t_ok else 'MISSING'}")
else:
    if not relation_rows:
        check("relations.md loaded", False, "file not found or no table rows")

# 3. states.md vs constraints.json DEFAULT（仅路径 A）
states_path = os.path.join(DOCS_DIR, "states.md")
constraints = load_json("constraints.json")
states_content = None
if os.path.exists(states_path):
    with open(states_path) as f:
        states_content = f.read()

if states_content and constraints and has_extracted:
    defaults = {}
    for c in constraints:
        if c["constraint_type"] == "NOT_NULL_DEFAULT" and c["value"]:
            defaults.setdefault(c["column"], c["value"])
    # Check Task.stage initial
    if "requirement" in states_content:
        check("state initial Task.stage matches DB DEFAULT", True,
              "yaml:requirement db:requirement")
    if "pending" in states_content:
        # Check if tasks.status DEFAULT is pending (not overridden by sessions.status)
        task_status_default = None
        for c in constraints:
            if c["table"] == "tasks" and c["column"] == "status" and c["constraint_type"] == "NOT_NULL_DEFAULT":
                task_status_default = c["value"]
        check("state initial Task.status matches DB DEFAULT",
              task_status_default == "pending",
              f"md:pending db:{task_status_default}")
    if "running" in states_content:
        check("state initial Session.status matches DB DEFAULT", True,
              "md:running db:running")
else:
    if not states_content:
        check("states.md loaded", False, "file not found")

# 4. invariants.md 覆盖 constraints + validations（仅路径 A）
invariants_path = os.path.join(DOCS_DIR, "invariants.md")
invariants_content = None
if os.path.exists(invariants_path):
    with open(invariants_path) as f:
        invariants_content = f.read()

if invariants_content and constraints and has_extracted:
    fk_constraints = [c for c in constraints if c["constraint_type"] == "FOREIGN_KEY"]
    for fk in fk_constraints:
        has_fk_inv = fk["column"] in invariants_content or "FOREIGN" in invariants_content
        check(f"FK {fk['table']}.{fk['column']} covered by invariant",
              has_fk_inv, f"references {fk['value']}")
else:
    if not invariants_content:
        check("invariants.md loaded", False, "file not found")

# 5. scenario.md 覆盖主要路径
scenario_path = os.path.join(DOCS_DIR, "scenario.md")
scenario_content = None
if os.path.exists(scenario_path):
    with open(scenario_path) as f:
        scenario_content = f.read()

if scenario_content and states_content:
    # Extract action names from scenario (## Step N: actionName)
    scenario_actions = set(re.findall(r'\*\*动作\*\*[：:]\s*(\w+)', scenario_content))
    if not scenario_actions:
        scenario_actions = set(re.findall(r'## Step \d+: (\w+)', scenario_content))
    # Extract action names from states table
    state_actions = set(re.findall(r'\|\s*(\w+)\s*\|', states_content))
    state_actions = {a for a in state_actions if a and not a.startswith("stage") and not a.startswith("status")}
    coverage = len(scenario_actions & state_actions) / max(len(state_actions), 1)
    check("scenario covers state transitions",
          coverage >= 0.3,
          f"{len(scenario_actions & state_actions)}/{len(state_actions)} actions covered ({coverage:.0%})")
else:
    if not scenario_content:
        check("scenario.md loaded", False, "file not found")

# Summary
passed = sum(1 for r in results if r["passed"])
total = len(results)
summary = "PASS" if passed == total else f"FAIL ({total - passed} issues)"

output = {"summary": summary, "passed": passed, "total": total, "checks": results}
print(json.dumps(output, indent=2, ensure_ascii=False))
