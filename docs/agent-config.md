# Agent 配置指南

所有 Agent 定义在 `agents/` 目录下，每个 Agent 是一个独立子目录。修改后无需重启后端，调用 `/api/agents/reload` 即可生效。

## 目录结构

```
agents/
├── requirement/
│   ├── agent.yaml          # Agent 元数据配置
│   ├── system_prompt.md    # 系统提示词
│   └── skills/             # Agent 可执行的技能脚本
│       ├── advance_stage.py
│       ├── write_doc.py
│       └── discuss.py
├── design/
│   ├── agent.yaml
│   ├── system_prompt.md
│   └── skills/
├── developer/
│   ├── agent.yaml
│   ├── system_prompt.md
│   └── skills/
└── tester/
    ├── agent.yaml
    ├── system_prompt.md
    └── skills/
```

## agent.yaml 格式

```yaml
name: requirement           # Agent 唯一标识符
role: 需求分析师             # 中文名称，显示在看板和聊天选择器中
stage: requirement          # 流水线阶段名（流水线Agent填写，独立Agent留空）
model: claude-sonnet-4-20250514  # 使用的 LLM 模型名
max_rounds: 50              # Agent Loop 最大迭代轮次
```

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| name | 是 | Agent 唯一标识符，英文字母、数字、连字符 |
| role | 是 | 中文名称，用于 UI 显示 |
| stage | 否 | 流水线阶段名，填了就是流水线 Agent，不填就是独立 Agent |
| model | 否 | LLM 模型名，默认使用 DEFAULT_MODEL 环境变量 |
| max_rounds | 否 | Agent Loop 最大迭代轮次，默认50 |

## system_prompt.md

Agent 的系统提示词，存放为独立 markdown 文件。Agent 会以这段文字作为系统指令来工作。支持多行、多段落。

## Skills

每个 Agent 可定义 skills 目录（`agents/{name}/skills/`），存放 Python 脚本。Agent Engine 在执行 Agent Loop 时动态加载这些 skills 并注册为 LLM tool。

### 内置工具

Agent Loop（`agent_loop.py`）内置了以下工具，无需 skills 目录中定义：

| 工具名 | 说明 | 所有 Agent 可用 |
|--------|------|----------------|
| advance_stage | 推进任务到下一阶段 | 是 |
| write_artifact | 保存产出物���文档、代码等） | 是 |
| discuss_with_agent | 发起与其他 Agent 的讨论 | 是 |
| clarify_user | 向用户提问并等待回复 | 是 |

### 文件 Skills

skills 目录中的 Python 脚本由 `SkillLoader` 动态加载，作为额外工具注册：

| Agent | Skills |
|-------|--------|
| requirement | advance_stage, clarify_user, decompose, discuss, write_doc |
| design | advance_stage, discuss, write_doc |
| developer | advance_stage, discuss, write_doc |
| tester | advance_stage, discuss, write_doc |

## 流水线 Agent

流水线 Agent 会在看板上显示为独立的列，任务会按阶段顺序流转。

内置 4 个流水线 Agent：

| Agent | 阶段 | 角色 |
|-------|------|------|
| requirement | requirement | 需求分析师 |
| design | design | 高级架构师 |
| developer | development | 全栈开发工程师 |
| tester | testing | 测试工程师 |

## 自定义 Agent（独立）

不填 `stage` 或留空的 Agent 不会出现在看板上，只在聊天页的 Agent 选择器中显示。

## 模型名与 Provider 对应关系

| 模型名前缀 | Provider | 需要配置 |
|-----------|----------|---------|
| gpt-* | OpenAI | OPENAI_API_KEY |
| 其他（默认） | OpenAI | OPENAI_API_KEY |
| claude-* | Anthropic | ANTHROPIC_API_KEY |
| anthropic-* | Anthropic | ANTHROPIC_API_KEY |

## 新增 Agent

在 `agents/` 下创建新子目录：

1. 创建 `agents/new-agent/agent.yaml`，填写元数据
2. 创建 `agents/new-agent/system_prompt.md`，编写提示词
3. 可选：创建 `agents/new-agent/skills/` 目录，添加 skill 脚本
4. 调用 `/api/agents/reload` 刷新缓存

## prompt 编写建议

system_prompt 中应明确：
1. Agent 的角色定位和职责
2. 输出格式要求（方便下游 Agent 解析）
3. 工作原则和约束
4. 如果是流水线 Agent，说明它需要关注上游的什么产出物
