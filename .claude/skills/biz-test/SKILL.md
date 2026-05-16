---
name: biz-test
description: "AI 业务影响图测试。基于统一业务模型（领域图+状态机+影响图+不变量）驱动自动化测试。触发：用户说 biz-test、业务测试、影响图测试、生成测试用例、测试矩阵、测试覆盖率分析。当用户提到需要为业务逻辑生成测试、分析测试覆盖率、或需要系统化测试策略时，也应使用此 skill。"
---

# Biz-Test: AI Business Impact Graph Testing

基于统一业务模型驱动测试生成。核心公式：

```
Coverage = Modeling × Path × Data × Execution × Assertion
```

各因子含义：
- Modeling（业务建模完整度）：领域实体、关系、状态机、影响图是否完整
- Path（路径枚举能力）：是否覆盖所有 8 种路径类型
- Data（测试数据构造能力）：能否构造合法/非法/边界数据
- Execution（执行稳定性）：测试是否可重复执行、无 flaky
- Assertion（断言准确性）：是否验证所有 effects + invariants

## 输入

用户指定测试目标，可以是：
- 模块名（如 "chat模块"、"task service"）
- 功能点（如 "任务创建"、"支付流程"）
- 文件路径
- 全量测试（不指定目标时扫描整个项目）

## 目录结构

```
biz-test/
├── SKILL.md                    # 本文件 — 通用流程
├── references/                 # 技术栈适配指南（按需读取）
│   └── go-gin-sqlite.md        # Go + Gin + SQLite
├── scripts/
│   ├── detect_techstack.sh     # 探测技术栈
│   ├── go/                     # Go 技术栈提取脚本
│   │   ├── extract_structs.sh
│   │   ├── extract_routes.sh
│   │   ├── extract_constraints.sh
│   │   └── extract_validations.sh
│   └── common/                 # 通用验证/执行脚本
│       ├── validate_models.py
│       ├── check_test_coverage.sh
│       ├── run_tests.sh
│       └── generate_report.py
```

## 执行流程

严格按以下 9 步顺序执行。模型文件写入 `tests/model/` 目录。

---

### Step 0: Detect & Extract（技术栈探测 + 数据提取，强制前置）

**目标**：探测项目技术栈，运行对应提取脚本，缓存确定性数据。

**操作**：
1. 运行 `bash scripts/detect_techstack.sh <ROOT>` 探测技术栈
2. 根据输出读取对应的 `references/<tech>.md` 适配指南
3. 根据技术栈选择 `scripts/<tech>/` 下的提取脚本
4. 创建 `tests/extracted/` 目录，并行运行提取脚本：

```
mkdir -p tests/extracted
bash scripts/<tech>/extract_structs.sh <ROOT> > tests/extracted/structs.json
bash scripts/<tech>/extract_routes.sh <ROOT> > tests/extracted/routes.json
bash scripts/<tech>/extract_constraints.sh <ROOT> > tests/extracted/constraints.json
bash scripts/<tech>/extract_validations.sh <ROOT> > tests/extracted/validations.json
```

5. 读取所有输出文件，确认非空

**为什么必须先跑**：后续所有步骤的数据源来自这些提取结果。没有 structs.json 就不知道项目有哪些实体，没有 routes.json 就不知道有哪些 API，没有 constraints.json 就不知道有哪些约束。

---

### Step 1: Domain Discovery（领域发现）

**前提**：`tests/extracted/structs.json` 和 `tests/extracted/routes.json` 已存在。

**操作**：
1. 读取 `tests/extracted/structs.json` 获取所有业务结构体（实体名、字段、源码位置）
2. 读取 `tests/extracted/routes.json` 获取所有 API 路由（方法、路径、handler）
3. **AI 推理**：分析结构体间的语义关系（has_many/belongs_to/has_one）—— 提取脚本只提供扁平列表，关系类型需要 AI 从业务语义判断
4. **AI 推理**：识别 service 层业务逻辑方法（无固定模式，需阅读代码理解）

**输出** → `tests/model/domain.yaml`

```yaml
entities:
  - name: EntityName
    fields: [field1, field2]
    source: "path/to/model.go:LineNo"

relationships:
  - from: EntityA
    to: EntityB
    type: has_many | belongs_to | has_one | many_to_many
    source: "file:line"

actions:
  - name: actionName
    method: HTTP方法
    path: /api/path
    handler: "handler/file.go:funcName"
    source: "file:line"
```

---

### Step 2: State Machine（状态机建模）

**前提**：`tests/extracted/constraints.json` 已存在。

**操作**：
1. 读取 `tests/extracted/constraints.json`，其中 `NOT_NULL_DEFAULT` 项的 `value` 字段给出状态字段的初始值
2. **AI 推理**：从 service 层代码推导状态迁移路径和前置条件——需要理解业务逻辑的因果链
3. **AI 推理**：识别合法 vs 非法的状态跳转

**输出** → `tests/model/state-machines.yaml`

```yaml
stateMachines:
  EntityName:
    states: [Created, Paid, Shipped]
    initial: Created
    transitions:
      - action: pay
        from: Created
        to: Paid
        preconditions:
          - "字段条件表达式"
        source: "service/file.go:funcName"
```

---

### Step 3: Impact Graph（业务影响图）

完全由 AI 推理驱动。

**操作**：
1. 对 Step 2 每个 transition，追踪 service 方法内的所有副作用
2. **AI 推理**：理解跨实体的状态联动语义
3. **AI 推理**：识别隐式的业务副作用

**输出** → `tests/model/impact-graph.yaml`

```yaml
actions:
  actionName:
    preconditions:
      - "Entity.field == Value"
    effects:
      - entity: EntityA
        field: status
        change: "OldValue -> NewValue"
    sideEffects:
      - type: api | cache | db | mq | llm
        description: "描述"
        source: "file:line"
    invariantChecks:
      - InvariantName
```

---

### Step 4: Invariants（业务不变量）

**前提**：`tests/extracted/constraints.json` 和 `tests/extracted/validations.json` 已存在。

**操作**：
1. 读取 `tests/extracted/constraints.json` 获取显式约束（NOT NULL/PK/FK/DEFAULT）
2. 读取 `tests/extracted/validations.json` 获取校验规则（required 字段、输入验证调用）
3. **AI 推理**：从原始数据推导语义不变量——脚本提供"字段 X 不能为空"，AI 推导"已支付订单必须存在支付记录"等跨实体规则
4. **AI 推理**：交叉验证 Step 3 的 impact graph 是否违反不变量

**输出** → `tests/model/invariants.yaml`

```yaml
invariants:
  - name: InvariantName
    expression: "逻辑表达式"
    severity: critical | high | medium
    source: "推导来源"
```

---

### Step 5: Path Enumeration & Test Matrix（路径枚举与测试矩阵）

完全由 AI 推理驱动。

**操作**：
1. 从状态机推导所有合法路径（Happy Path）
2. **AI 推理**：对每个 action 枚举异常路径：
   - 前置条件不满足（Exception Path）
   - 边界值（Boundary Path）
   - 权限问题（Permission Path）
   - 超时（Timeout Path）
   - 重复操作（Idempotent Path）
   - 并发冲突（Concurrency Path）
   - 补偿回滚（Compensation Path）
3. **AI 推理**：按 P0-P3 分级

**输出** → `tests/model/test-matrix.yaml`

```yaml
testMatrix:
  - id: TC-001
    action: actionName
    scenario: "场景描述"
    pathType: happy | exception | boundary | permission | timeout | idempotent | concurrency | compensation
    priority: P0 | P1 | P2 | P3
    preconditions:
      - "前置条件"
    expectedEffects:
      - entity: EntityA
        field: status
        expected: Value
    expectedInvariants:
      - InvariantName
```

---

### Step 6: Test Code Generation（测试代码生成）

**目标**：根据测试矩阵生成可执行的测试代码。

**读取技术栈适配指南**：`references/<tech>.md`，其中包含：
- 测试文件位置规范
- 命名规范
- 测试框架用法
- 外部依赖 mock 策略
- 验证层次要求
- 测试执行命令

**通用生成规则**（所有技术栈适用）：
1. 每个 testMatrix 条目生成一个测试函数
2. 测试结构：Arrange（构造数据）→ Act（执行动作）→ Assert（验证 effects + invariants）
3. 验证层次：
   - API 响应：状态码 + body 结构
   - 数据库状态：查询验证记录字段值
   - 不变量断言：检查 Step 4 定义的不变量是否满足
4. 外部依赖（LLM/第三方 API）：必须 mock，禁止测试时调用真实外部服务

---

### Step 7: Verification（验证）

**操作**：
1. 运行 `bash scripts/common/run_tests.sh <ROOT>` 执行测试并获取结构化结果
2. 运行 `bash scripts/common/check_test_coverage.sh <ROOT>` 统计测试函数 vs 矩阵条目
3. **AI 推理**：分析五因子覆盖率中需要定性判断的部分（Modeling/Path/Data/Assertion）
4. **AI 推理**：失败用例根因分析
5. 运行 `python3 scripts/common/generate_report.py <ROOT>` 生成报告

---

### Step 8: Self-Healing（自愈修复，可选）

完全由 AI 推理驱动。

**操作**：
1. 比对失败测试与当前��码，定位变更点
2. 区分失败类型：
   - API 路径/参数变更 → 更新测试中的请求构造
   - 响应结构变更 → 更新断言字段
   - 业务逻辑变更 → 重新执行 Step 2-5 更新模型和测试
3. 自动修复后重新运行 `run_tests.sh` 验证
4. 无法自动修复的标注为需要人工介入

---

## Review Protocol（审查机制）

每个关键里程碑完成后，用独立 subagent 审查。

### Review Gate 1: Modeling Review（Step 1-4 完成后）

先运行确定性验证：`python3 scripts/common/validate_models.py <ROOT>`

启动 2 个并行 subagent：

**Subagent A — 模型一致性审查**：
```
你是一个业务建模审查专家。你没有参与建模过程，只看结果。
默认立场：假设模型有错，直到验证通过。

必须读取（不可跳过）：
1. tests/extracted/structs.json — 提取的结构体原始数据
2. tests/extracted/routes.json — 提取的路由原始数据
3. tests/extracted/constraints.json — 提取的约束原始数据
4. validate_models.py 的执行输出
5. tests/model/ 下的 4 个 yaml 文件

审查流程：
1. 先看 validate_models.py 输出中的 FAIL 项
2. domain.yaml entity 逐个与 structs.json 对照
3. domain.yaml action 逐个与 routes.json 对照
4. state-machines.yaml 状态值与 constraints.json DEFAULT 值对照
5. invariants.yaml 与 constraints.json + validations.json 对照
6. 检查四层模型间交叉引用一致性

输出：| 检查项 | 通过/失败 | 证据 |
```

**Subagent B — 不变量完整性审查**：
```
你是一个业务规则审查专家。默认立场：假设有遗漏的不变量。

必须读取（不可跳过）：
1. tests/extracted/constraints.json
2. tests/extracted/validations.json
3. tests/model/invariants.yaml

审查流程：
1. 从 constraints.json 列出所有约束
2. 从 validations.json 列出所有校验规则
3. 对比 invariants.yaml 是否覆盖每一项
4. 补充检查语义不变量

输出：| 源文件 | 原始约束 | 是否已建模 |
```

**Gate 1 结果处理**：都 PASS → 继续 Step 5；FAIL → 修复重试，最多 3 轮；3 轮后上交用户

### Review Gate 2: Test Code Review（Step 6 完成后）

先运行：`bash scripts/common/check_test_coverage.sh <ROOT>`

启动 2 个并行 subagent：

**Subagent A — 测试代码质量审查**：
```
读取 check_test_coverage.sh 输出 + test-matrix.yaml + 生成的测试文件。
逐项检查：testMatrix 覆盖、命名规范、断言完整性、外部依赖 mock。
参考 references/<tech>.md 中的技术栈特定检查项。
```

**Subagent B — 测试可执行性审查**：
```
静态分析测试代码：import 路径、函数签名匹配、编译风险。
参考 references/<tech>.md 中的技术栈特定检查项。
```

**Gate 2 结果处理**：同 Gate 1

### Review Gate 3: Final Review（Step 7 完成后）

先运行：`python3 scripts/common/generate_report.py <ROOT>`

启动 1 个 subagent：
```
读取报告 + 测试执行结果。
验证数据一致性，补充四因子定性评分，检查 P0 用例状态。
```

**Gate 3 结果处理**：数据不一致 → 修正；P0 FAIL → 尝试 Step 8；都 PASS → 输出报告

---

## 执行约束

1. **增量更新**：`tests/model/` 已存在时，读取现有模型只更新变化部分
2. **代码溯源**：模型中每个字段标注 `source: file:line`
3. **不修改业务代码**：只生成测试文件和模型文件
4. **每步验证**：完成一步后先让用户确认模型是否正确，再继续下一步
5. **外部依赖 mock**：禁止测试时调用真实外部服务（LLM/第三方 API）
6. **测试隔离**：每个测试函数独立初始化和清理数据
