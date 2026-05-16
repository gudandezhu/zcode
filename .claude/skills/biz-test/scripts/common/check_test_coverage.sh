#!/usr/bin/env bash
# 统计生成的测试函数 vs test-matrix 条目
# 输入: 项目根目录
# 输出: JSON {total_matrix, total_tests, matched, unmatched_matrix, unmatched_tests}
set -euo pipefail

ROOT="${1:-.}"
MATRIX="$ROOT/tests/model/test-matrix.yaml"
BACKEND="$ROOT/backend"

python3 -c "
import re, json, yaml, glob, os

root = '$ROOT'
matrix_path = os.path.join(root, 'tests/model/test-matrix.yaml')
backend_dir = os.path.join(root, 'backend')

# 解析 test-matrix
matrix_ids = []
matrix_actions = {}
if os.path.exists(matrix_path):
    with open(matrix_path) as f:
        data = yaml.safe_load(f)
    if data and 'testMatrix' in data:
        for tc in data['testMatrix']:
            tid = tc.get('id', '')
            action = tc.get('action', '')
            scenario = tc.get('scenario', '')
            matrix_ids.append(tid)
            matrix_actions[tid] = {'action': action, 'scenario': scenario}

# 提取测试函数名
test_funcs = []
for test_file in glob.glob(os.path.join(backend_dir, '**/*_test.go'), recursive=True):
    with open(test_file) as f:
        for line in f:
            m = re.match(r'func\s+(Test\w+)', line)
            if m:
                test_funcs.append(m.group(1))

result = {
    'total_matrix': len(matrix_ids),
    'total_tests': len(test_funcs),
    'test_functions': test_funcs,
    'matrix_ids': matrix_ids,
    'matrix_actions': matrix_actions,
}

print(json.dumps(result, indent=2, ensure_ascii=False))
"
