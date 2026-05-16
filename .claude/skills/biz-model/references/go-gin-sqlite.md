# Go + Gin + SQLite 技术栈适配

当 detect_techstack.sh 输出 backend=go, framework=gin, database=sqlite 时读取。

## 项目结构假设

Go + Gin 项目通常：
- `model/` 或 `models/` — 业务实体定义
- `handler/` 或 `handlers/` — HTTP handler
- `service/` 或 `services/` — 业务逻辑
- `db/` — 数据库初始化和 migration
- `main.go` — 路由注册

## 提取脚本说明

| 脚本 | 输入 | 输出 |
|------|------|------|
| extract_structs.sh | `model/*.go` 或 `**/*_model.go` | Go struct name + fields + source |
| extract_routes.sh | `main.go` | Gin 路由 method + path + handler，支持 Group 嵌套 |
| extract_constraints.sh | `db.go` 或包含 migrate() 的文件 | SQL DDL 约束 PK/FK/NOT NULL/DEFAULT |
| extract_validations.sh | `model/*.go` + `handler/*.go` | binding tag + ShouldBindJSON 调用 |

## 状态字段识别规则

Go + SQLite 项目中，状态字段通常：
- 字段名为 `status`、`stage`、`state`、`type`
- 在 migrate() 中有 `DEFAULT 'xxx'` 值
- 在 service 层通过赋值改变

DEFAULT 值就是初始状态。非 DEFAULT 的枚举值需要从 service 层代码推导。

## 关系识别规则

Go struct 间的关系通常通过以下方式表达：
- 外键字段：`TaskID string` → Task belongs_to Task
- 切片字段：`Items []string` → 可能是 has_many
- 嵌套结构体：直接嵌入另一个 struct

从 structs.json 的扁平字段列表中，AI 需要识别以 `_id` 结尾的字段作为外键候选。

## 不变量识别规则

显式不变量来源：
- migrate() 的 NOT NULL → 字段不能为空
- migrate() 的 PRIMARY KEY → 唯一标识
- migrate() 的 FOREIGN KEY → 引用完整性
- binding:"required" → API 输入必填
- handler 中的 ShouldBindJSON + if err → 输入校验

语义不变量需要 AI 从业务逻辑推导，例如：
- service 方法中的 if 判断 → 隐式业务规则
- 状态跳转的合法性 → 隐式状态约束
- 错误返回的语义 → 不允许的操作
