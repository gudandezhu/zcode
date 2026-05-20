# 开发规范

## Commit 规则

完成任务后必须 commit，无例外。

### 流程

1. 代码改完 → 跑测试（见下方测试规则）
2. 测试通过 → `git add` 相关文件（不要 `git add .`）
3. 更新 plan.md 任务状态
4. `git commit`，pre-commit hook 会自动检查覆盖率

### Commit 粒度

- 一个任务一次 commit，不要拆太碎，也不要攒太多
- commit message 格式：`类型: 简述`（feat/fix/refactor/docs/chore）

## 测试规则

改完代码必须跑测试验证，无例外。

### 执行规则

| 改了什么 | 跑什么 |
|----------|--------|
| `src/lib/` 下任何 TS 文件（service/agent/db） | `pnpm test` |
| `src/app/api/` 下任何 API Route | `pnpm test` |
| `src/` 下任何前端组件或页面 | `pnpm lint` |
| 两层都改了 | 两个都跑 |

### 失败处理

- 测试/lint 失败 → 修完再继续，不跳过
- 改了接口/模型但没对应测试 → 先写测试再改代码
- 连续 2 次失败 → 停下来思考，不盲目重试

## 启动前检查清单

启动项目给用户验收前，必须按顺序执行：

1. `pnpm test` — 单元测试通过
2. `pnpm lint` — lint 无 error
3. `pnpm build` — build 成功
4. 启动服务 → curl 健康检查（:3000/api/health）
5. 确认每个页面 HTTP 200 后再告诉用户
