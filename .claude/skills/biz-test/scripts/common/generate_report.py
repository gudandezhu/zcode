#!/usr/bin/env python3
"""
从 tests/model/ + 测试执行结果生成最终报告。
输入: 项目根目录
输出: 格式化报告文本
"""
import json, sys, os, yaml

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
MODEL_DIR = os.path.join(ROOT, "tests/model")


def load_yaml(name):
    path = os.path.join(MODEL_DIR, name)
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return yaml.safe_load(f) or {}


def count_items(data, key):
    if not data or key not in data:
        return 0
    val = data[key]
    if isinstance(val, list):
        return len(val)
    if isinstance(val, dict):
        return len(val)
    return 0


domain = load_yaml("domain.yaml")
sm = load_yaml("state-machines.yaml")
impact = load_yaml("impact-graph.yaml")
invariants = load_yaml("invariants.yaml")
matrix = load_yaml("test-matrix.yaml")

# 统计
n_entities = count_items(domain, "entities")
n_rels = count_items(domain, "relationships")
n_actions_domain = count_items(domain, "actions")

n_sm = count_items(sm, "stateMachines")
n_transitions = 0
if sm and "stateMachines" in sm:
    for entity, cfg in sm["stateMachines"].items():
        n_transitions += len(cfg.get("transitions", []))

n_impact_actions = count_items(impact, "actions")
n_effects = 0
n_side_effects = 0
if impact and "actions" in impact:
    for act, data in impact["actions"].items():
        n_effects += len(data.get("effects", []))
        n_side_effects += len(data.get("sideEffects", []))

inv_list = invariants.get("invariants", [])
n_inv = len(inv_list)
n_critical = sum(1 for i in inv_list if i.get("severity") == "critical")
n_high = sum(1 for i in inv_list if i.get("severity") == "high")
n_medium = sum(1 for i in inv_list if i.get("severity") == "medium")

tc_list = matrix.get("testMatrix", [])
n_tc = len(tc_list)
p0 = sum(1 for t in tc_list if t.get("priority") == "P0")
p1 = sum(1 for t in tc_list if t.get("priority") == "P1")
p2 = sum(1 for t in tc_list if t.get("priority") == "P2")
p3 = sum(1 for t in tc_list if t.get("priority") == "P3")

# 读取测试执行结果（如果有）
test_result_path = os.path.join(ROOT, "tests/test_result.json")
pass_n = fail_n = skip_n = 0
if os.path.exists(test_result_path):
    with open(test_result_path) as f:
        tr = json.load(f)
    pass_n = tr.get("pass", 0)
    fail_n = tr.get("fail", 0)
    skip_n = tr.get("skip", 0)

report = f"""=== Biz-Test Report ===

Domain:     {n_entities} entities, {n_rels} relationships, {n_actions_domain} actions
States:     {n_sm} state machines, {n_transitions} transitions
Impacts:    {n_impact_actions} actions, {n_effects} effects, {n_side_effects} sideEffects
Invariants: {n_inv} rules (critical:{n_critical}, high:{n_high}, medium:{n_medium})
Matrix:     {n_tc} test cases (P0:{p0}, P1:{p1}, P2:{p2}, P3:{p3})

Executed:   PASS:{pass_n}  FAIL:{fail_n}  SKIP:{skip_n}

Coverage Factors:
  Modeling:    needs AI judgment (entity completeness)
  Path:        needs AI judgment (path enumeration completeness)
  Data:        needs AI judgment (data variation coverage)
  Execution:   {(pass_n / max(pass_n + fail_n, 1)) * 100:.0f}% ({pass_n}/{pass_n + fail_n} tests stable)
  Assertion:   needs AI judgment (effects/invariants verified)

Note: Modeling/Path/Data/Assertion factors require AI qualitative assessment.
      Run validate_models.py for deterministic consistency checks.
"""
print(report)
