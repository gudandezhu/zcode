# Agent 配置指南

所有 Agent 定义在 `agents/` 目录下，每个 Agent 是一个独立子目录。修改后无需重启，调用 `/api/agents/reload` 即可生效。

## 目录结构

```
agents/
├── requirement/
│   ├── agent.yaml          # Agent 元数据配置
│   ├── system_prompt.md    # 系统提示词
│   └── skills/             # Agent 技能（TypeScript 文件）
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
role: 需求分析师             # 中文名称，UI 显示用
stage: requirement          # 流水线阶段名（流水线Agent填写，独立Agent留空）
model: claude-sonnet-4-20250514  # LLM 模型名
max_rounds: 50              # Agent Loop 最大迭代轮次
auto_advance: true          # Session 完成后自动推进到下一阶段
backend: builtin            # 执行后端：builtin（自研）/ cc（Claude Code）
```

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| name | 是 | 唯一标识符，英文字母、数字、连字符 |
| role | 是 | 中文名称，UI 显示 |
| stage | 否 | 流水线阶段名，填了=流水线 Agent，不填=独立 Agent |
| model | 否 | LLM 模型名，默认使用 DEFAULT_MODEL 环境变量 |
| max_rounds | 否 | Agent Loop 最大迭代轮次，默认50 |
| auto_advance | 否 | 自动推进到下一阶段。默认：有 stage=true，无 stage=false |
| backend | 否 | 执行后端：`builtin`（自研 AgentLoop）/ `cc`（Claude Code CLI）。默认 builtin |

## system_prompt.md

Agent 的系统提示词，markdown 格式。支持多行、多段落。

## Skills

每个 Agent 可定义 skills 目录（`agents/{name}/skills/`），存放 TypeScript 文件。Agent Engine 动态加载并注册为 LLM tool。

### 内置工具

AgentLoop 内置以下工具，无需 skills 目录定义：

| 工具名 | 说明 |
|--------|------|
| advance_stage | 推进任务到下一阶段 |
| write_artifact | 保存产出物 |
| discuss_with_agent | 发起多 Agent 讨论 |
| clarify_user | 向用户提问并等待回复 |

### 文件 Skills

skills 目录中的 TypeScript 文件由 SkillLoader 动态加载：

| Agent | Skills |
|-------|--------|
| requirement | decompose |
| design | — |
| developer | — |
| tester | — |

### Skill 文件格式

```typescript
// agents/{name}/skills/decompose.ts
import { defineSkill } from "@/lib/agent/skill-loader";

export default defineSkill({
  name: "decompose",
  description: "将需求拆解为子任务",
  parameters: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: { type: "object" },
        description: "子任务列表"
      }
    },
    required: ["tasks"]
  },
  async execute(args, context) {
    // 创建子任务
  }
});
```

## 流水线 Agent

看板上显示为独立列，任务按阶段流转。

| Agent | 阶段 | 角色 |
|-------|------|------|
| requirement | requirement | 需求分析师 |
| design | design | 高级架构师 |
| developer | development | 全栈开发工程师 |
| tester | testing | 测试工程师 |

## 自定义 Agent（独立）

不填 `stage` 的 Agent 不出现在看板上，只在聊天页的 Agent 选择器中显示。

## 模型名与 Provider

| 模型名前缀 | Provider | 需要配置 |
|-----------|----------|---------|
| gpt-* | OpenAI | OPENAI_API_KEY |
| 其他（默认） | OpenAI | OPENAI_API_KEY |
| claude-* | Anthropic | ANTHROPIC_API_KEY |
| anthropic-* | Anthropic | ANTHROPIC_API_KEY |

## 新增 Agent

1. 创建 `agents/new-agent/agent.yaml`
2. 创建 `agents/new-agent/system_prompt.md`
3. 可选：创建 `agents/new-agent/skills/` 目录，添加 TypeScript skill 文件
4. 调用 `/api/agents/reload` 刷新

## prompt 编写建议

system_prompt 应明确：
1. 角色定位和职责
2. 输出格式要求（方便下游 Agent 解析）
3. 工作原则和约束
4. 流水线 Agent 需说明关注上游什么产出物
