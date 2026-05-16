# Go + Gin + SQLite 技术栈适配

当 `detect_techstack.sh` 输出 `backend=go, framework=gin, database=sqlite` 时读取此文件。

## 提取脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| extract_structs.sh | `scripts/go/` | 从 `model/*.go` 或 `**/*_model.go` 提取 Go struct（name + fields + source） |
| extract_routes.sh | `scripts/go/` | 从 main.go 提取 Gin 路由注册（method + path + handler），支持 Group 嵌套 |
| extract_constraints.sh | `scripts/go/` | 从 db.go 或 migrate() 提取 SQL DDL 约束（PK/FK/NOT NULL/DEFAULT） |
| extract_validations.sh | `scripts/go/` | 从 model/handler 提取 binding tag（binding:"required"）和 ShouldBindJSON 调用 |

## 测试代码生成规则

### 文件位置
- 测试文件与被测文件同目录：`handler/task_handler_test.go` 放在 `handler/`
- 遵循 Go 惯例

### 命名
- `TestXxx` 驼峰式（如 `TestCreateTask_HappyPath`）
- 使用 `testing` + `net/http/httptest` 包

### Gin 测试模式
每个测试函数的固定模式：
1. `gin.SetMode(gin.TestMode)`
2. `r := gin.Default()`
3. 注册被测路由（与 main.go 路由注册一致）
4. 构造 `httptest.NewRequest` + `httptest.NewRecorder()`
5. `r.ServeHTTP(rec, req)`
6. 断言 `rec.Code` + `rec.Body`

### 外部依赖 mock
- LLM / 外部 API：通过接口注入 mock
- 数据库：使用 SQLite `:memory:` 内存数据库

### DB 初始化
```
func setupTestDB(t *testing.T) *sql.DB {
    db, _ := sql.Open("sqlite3", ":memory:?_journal_mode=WAL")
    // 执行 migrate() 建表
    return db
}
```

如项目 db 包使用 `sync.Once` 单例，需要：
- 添加 `ResetForTest()` 函数重置 once，或
- 测试直接调用 `sql.Open` 绕过单例

### SQLite 限制
- `SetMaxOpenConns(1)` 单写锁：并发测试需要独立的内存数据库实例
- 测试函数结束关闭连接，确保测试间隔离

### 验证层次
每个测试函数必须验证：
- API 响应：HTTP 状态码 + JSON body 结构
- 数据库状态：查询验证记录字段值
- 不变量断言：检查 invariants.yaml 定义的不变量
- 日志验证：检查关键操作是否有日志输出

### 测试执行
```bash
cd backend && go test -v -count=1 ./...
```

## Review 特定检查项

### Gate 2 Subagent A 额外检查
- `gin.SetMode(gin.TestMode)` 是否调用
- 路由注册是否与 main.go 一致
- `setupTestDB` 是否有 `t.Cleanup` 或 `defer Close`
- LLM 外部调用是否已 mock

### Gate 2 Subagent B 额外检查
- import 路径是否与 go.mod module 一致
- 函数签名是否匹配源码
- `setupTestDB` 是否正确调用 migrate()
- 是否有未导出字段导致编译错误
