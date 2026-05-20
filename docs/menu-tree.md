# UI 菜单交互树

> Zcode — 个人开发者 AI 编码助手，单用户产品。本地优先。

---

## L1: 看板 Menu → [C区 100%×100%] 任务流水线

```
┌─────────────────────────────────────────────────────────────────┐
│ Navbar: [看板] [聊天]                    🔔(通知)  ⚙(项目设置)  │
├─────────────────────────────────────────────────────────────────┤
│ 需求(requirement) │ 设计(design) │ 开发(development) │ 测试(testing) │ 完成(done) │
│                   │              │                    │               │            │
│ [TaskCard]        │ [TaskCard]   │ [TaskCard]         │ [TaskCard]    │            │
│                   │              │                    │               │            │
│                   │              │                    │               │            │
├─────────────────────────────────────────────────────────────────┤
│                                        [+ 新建任务]             │
└─────────────────────────────────────────────────────────────────┘
```

### 看板主区域

```
L1: 看板 [C区 100%×100%]
│
├── Navbar
│   ├── KB-NAV-KAN  click [看板] → L1: 看板 [C区 100%×100%]
│   │                transition: none
│   ├── KB-NAV-CHAT click [聊天] → L1: 聊天 [C区 100%×100%]
│   │                transition: fade 200ms
│   ├── NT-BELL     click [🔔通知] → L4: 通知下拉 [T区]
│   │                state: { loading: spinner("加载通知"), empty: "暂无通知", error: "加载失败" + click [重试] }
│   └── PRJ-SET     click [⚙项目设置] → L3: 项目设置 [E区 600×500px]
│
├── Column × 5 (requirement / design / development / testing / done)
│   ├── Column Header
│   │   └── 内容节点: {阶段名} + {任务数 badge}
│   │
│   └── Card List
│       state: {
│         loading: skeleton(3行卡片骨架),
│         empty: "暂无任务" + KB-CARD-CRT,
│         error: "加载失败" + click [重试]
│       }
│       scroll(vertical) 卡片列表
│       │
│       ├── TaskCard (顶层任务)
│       │   ├── 内容节点: {标题} + {状态指示器} + {最新动作摘要}
│       │   ├── 内容节点: Session 进度条 (running 时显示脉冲动画)
│       │   ├── KB-CARD-CLK  click [卡片标题] → L4: 任务详情抽屉 [S区 60%×100%]
│       │   │                 transition: slide-right 300ms
│       │   ├── KB-CARD-ADV  click [推进下一阶段]
│       │   │                 precondition: task.status == pending || task.status == completed | :disabled
│       │   │                 fail: { timeout: toast("操作超时"), 500: toast("推进失败") }
│       │   │                 expect: 卡片移到下一列
│       │   └── KB-CARD-DEL  click [删除]
│       │                   → L5: D区 确认删除 [D区 360×180px]
│       │                   fail: { timeout: toast("操作超时") }
│       │
│       └── TaskCard (子任务, 缩进显示)
│           ├── 内容节点: {父任务标题} > {子任务标题}
│           ├── 内容节点: 子任务进度 "2/5 已完成"
│           └── 同顶层卡片交互（KB-CARD-CLK / KB-CARD-ADV / KB-CARD-DEL）
│
└── KB-TASK-CRT  click [+ 新建任务] → L3: 新建任务弹窗 [E区 500×480px]
                  transition: fade-in 200ms
```

### L3: 新建任务弹窗 [E区 500×480px]

```
L3: 新建任务 [E区 500×480px]
│
├── 表单
│   ├── fill [任务标题]
│   │   precondition: 非空 | :border-red + "请输入标题"
│   ├── fill [任务描述] (textarea)
│   ├── select [所属阶段] (下拉: requirement / design / development / testing)
│   │   default: requirement
│   ├── select [所属项目] (下拉: 项目列表)
│   │   state: {
│   │     loading: spinner("加载项目"),
│   │     empty: "暂无项目" + PRJ-CRT-REDIR,
│   │     error: "加载失败"
│   │   }
│   └── TASK-SUB  click [创建]
│                  precondition: 标题非空 && 阶段已选 | :disabled
│                  fail: { timeout: toast("创建超时"), 400: toast("参数错误"), 500: toast("创建失败") }
│                  expect: 弹窗关闭 + 看板刷新 + 新卡片出现在对应列
│                  + toast("任务已创建")
│
├── TASK-CANCEL  click [取消] → 关闭弹窗
└── PRJ-CRT-REDIR  click [去创建项目] → L3: 项目设置 [E区 600×500px]
```

### L4: 任务详情抽屉 [S区 60%×100%]

```
L4: 任务详情 [S区 60%×100%]
│
├── Drawer Header
│   ├── 内容节点: {任务标题}
│   ├── 内容节点: {阶段 badge} + {状态 badge}
│   └── DRW-CLOSE  click [×关闭] → 关闭抽屉
│                   transition: slide-left 300ms
│
├── Pipeline 进度条 (横向 5 段: requirement → design → development → testing → done)
│   └── 内容节点: 当前阶段高亮, 已完成阶段标绿, 未来阶段灰显
│
├── Timeline (纵向时间线)
│   state: {
│     loading: skeleton(5行时间线骨架),
│     empty: "暂无执行记录",
│     error: "加载失败" + click [重试]
│   }
│   │
│   ├── TimelineStep (Session 事件卡片)
│   │   ├── 内容节点: {时间} + {Agent名} + {动作类型}
│   │   │   类型: text / tool_call / tool_result / clarify_user
│   │   ├── 内容节点: {内容摘要} (可折叠展开完整内容)
│   │   └── 活跃 Session: SSE 实时追加事件
│   │       state: { loading: spinner("执行中...") }
│   │
│   └── Discussion Session (对话气泡渲染)
│       ├── 内容节点: 讨论主题 + 参与者
│       ├── 内容节点: initiator 气泡 (靠左, 灰色)
│       ├── 内容节点: participant 气泡 (靠右, 主色)
│       ├── 内容节点: 轮次分隔线 "Round N"
│       └── 内容节点: 讨论结论摘要
│
├── ClarifyUser 内联输入 (当 Session 状态 = waiting_input 时显示)
│   ├── 内容节点: Agent 提问内容
│   ├── fill [回复输入框]
│   └── CLAR-SUB  click [发送回复]
│                  precondition: 输入非空 | :disabled
│                  fail: { timeout: toast("发送超时"), 500: toast("发送失败") }
│                  expect: Session 继续执行 + 时间线追加新事件
│
├── Artifacts 区域
│   ├── 内容节点: 产出物列表
│   │   state: {
│   │     loading: skeleton(2行产出物骨架),
│   │     empty: "暂无产出物",
│   │     error: "加载失败"
│   │   }
│   ├── ART-CLK  click [产出物] → L4: 产出物详情 [E区 800×600px]
│   └── ART-EDIT click [编辑] → L4: Artifact 编辑器 [E区 800×600px]
│                 precondition: task.status == waiting_review | :hidden
│
├── Gate 审批区域 (当 task.status == waiting_review 时显示)
│   ├── GATE-APPROVE  click [通过]
│   │   → toast("已通过，推进到下一阶段")
│   │   expect: 任务推进 + 抽屉状态更新 + 看板卡片移动
│   ├── GATE-REJECT  click [驳回]
│   │   → L5: 驳回反馈 [E区 500×300px]
│   │   expect: Agent 基于反馈修订
│   └── GATE-EDIT   click [编辑 Artifact]
│       → L4: Artifact 编辑器 [E区 800×600px]
│       expect: 编辑后版本成为正式 artifact
│
├── Auto Check 区域 (当 task.status == checking 时显示)
│   ├── 内容节点: 检查项列表 + 各项状态 (通过/失败/执行中)
│   │   state: { loading: spinner("检查执行中...") }
│   └── 内容节点: 命令输出日志 (可折叠)
│
├── Retry 区域 (当 task.status == failed 时显示)
│   └── RETRY-CLK  click [重试]
│                   fail: { timeout: toast("重试超时"), 500: toast("重试失败") }
│                   expect: 任务重新执行 + 状态变为 running
│
└── 操作栏
    ├── DRW-SESSION  click [启动 Session]
    │   precondition: task.status == pending | :disabled
    │   fail: { timeout: toast("启动超时"), 500: toast("启动失败") }
    │   expect: Session 开始执行 + 时间线追加事件
    ├── DRW-DISC  click [发起讨论]
    │   → L4: 发起讨论弹窗 [E区 500×400px]
    └── DRW-ADV  click [推进下一阶段]
                  precondition: task.status == completed | :disabled
                  fail: { timeout: toast("推进超时") }
                  expect: 任务推进到下一阶段 + 看板刷新
```

### L5: 驳回反馈弹窗 [E区 500×300px]

```
L5: 驳回反馈 [E区 500×300px]
│
├── fill [反馈意见] (textarea, 必填)
├── REJ-SUB   click [提交驳回]
│              precondition: 反馈非空 | :disabled
│              fail: { timeout: toast("提交超时"), 500: toast("提交失败") }
│              expect: Agent 收到反馈 + 开始修订
│              + toast("已驳回")
└── REJ-CANCEL click [取消] → 关闭弹窗
```

### L4: 产出物详情 [E区 800×600px]

```
L4: 产出物详情 [E区 800×600px]
│
├── 内容节点: Markdown 渲染的产出物内容
│   state: { loading: spinner("加载中"), empty: "暂无内容", error: "加载失败" }
├── ART-CLOSE  click [关闭] → 关闭弹窗
└── ART-DL     click [下载] → 下载产出物文件
                  fail: { timeout: toast("下载超时") }
```

### L4: Artifact 编辑器 [E区 800×600px]

```
L4: Artifact 编辑器 [E区 800×600px]
│
├── Markdown 编辑器 (textarea + 预览切换)
│   ├── fill [编辑区域]
│   └── toggle [预览/编辑]
├── ART-SAVE  click [保存]
│              fail: { timeout: toast("保存超时"), 500: toast("保存失败") }
│              expect: artifact 内容更新
│              + toast("已保存")
└── ART-CLOSE click [关闭] → 关闭弹窗
```

### L4: 发起讨论弹窗 [E区 500×400px]

```
L4: 发起讨论 [E区 500×400px]
│
├── select [发起者 Agent] (下拉: Agent 列表)
├── select [参与者 Agent] (下拉: Agent 列表)
├── fill [讨论主题] (input)
├── fill [最大轮次] (number input, default: 10, max: 200)
├── DISC-SUB  click [发起讨论]
│              precondition: 发起者已选 && 参与者已选 && 发起者≠参与者 | :disabled
│              fail: { timeout: toast("发起超时"), 500: toast("发起失败") }
│              expect: Discussion Session 创建 + 抽屉时间线追加气泡事件
│              + toast("讨论已发起")
└── DISC-CANCEL click [取消] → 关闭弹窗
```

---

## L1: 聊天 Menu → [C区 100%×100%] Agent 对话

```
┌─────────────────────────────────────────────────────────────────┐
│ Navbar: [看板] [聊天]                    🔔(通知)  ⚙(项目设置)  │
├─────────────────────────────────────────────────────────────────┤
│ Agent 选择器:                                                    │
│  [需求分析师] [高级架构师] [全栈开发工程师] [测试工程师] │ 文档助手 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│        Agent: 你好！我是需求分析师...                              │
│                                                                   │
│                              User: 我需要一个登录功能              │
│                                                                   │
│        Agent: 好的，让我分析一下...                                │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ [输入消息...                                        ] [发送]      │
└─────────────────────────────────────────────────────────────────┘
```

### 聊天主区域

```
L1: 聊天 [C区 100%×100%]
│
├── Agent 选择器 (顶部按钮组)
│   ├── 流水线 Agent 组 (左侧)
│   │   ├── CHAT-SEL-REQ  click [需求分析师] → 选中 Agent + 清空历史
│   │   ├── CHAT-SEL-DES  click [高级架构师] → 选中 Agent + 清空历史
│   │   ├── CHAT-SEL-DEV  click [全栈开发工程师] → 选中 Agent + 清空历史
│   │   └── CHAT-SEL-TST  click [测试工程师] → 选中 Agent + 清空历史
│   ├── 分隔线 (竖线)
│   └── 自定义 Agent 组 (右侧)
│       └── CHAT-SEL-CUS  click [{自定义Agent名}] → 选中 Agent + 清空历史
│
├── 消息列表
│   state: {
│     loading: skeleton(5条消息骨架),
│     empty: "选择一个 Agent 开始对话",
│     error: "加载失败" + click [重试]
│   }
│   scroll(vertical) 自动滚到底部
│   │
│   ├── User 消息 (右对齐, 深色背景)
│   │   └── 内容节点: {消息文本} + {时间}
│   │
│   └── Agent 消息 (左对齐, 浅色背景, 流式逐字显示)
│       └── 内容节点: {消息文本} + {时间}
│           流式渲染: cursor 闪烁 + 逐字追加
│           state: { loading: spinner("思考中...") }
│
├── 输入区域
│   ├── fill [消息输入框] (textarea, Enter 发送, Shift+Enter 换行)
│   └── CHAT-SEND  click [发送]
│                   precondition: Agent 已选中 && 输入非空 | :disabled
│                   fail: {
│                     timeout: toast("响应超时"),
│                     500: toast("Agent 执行错误"),
│                     network: toast("网络断开")
│                   }
│                   expect: 消息追加到列表 + Agent 流式回复
│
└── URL 参数预选 (从看板跳转时)
    内容节点: /chat?agent=xxx&task=xxx → 自动选中 Agent + 关联 Task
```

---

## L1: 导航共享组件

### L4: 通知下拉 [T区]

```
L4: 通知下拉 [T区, 右上角弹出]
│
├── 通知列表
│   state: {
│     loading: skeleton(3行通知骨架),
│     empty: "暂无通知",
│     error: "加载失败"
│   }
│   │
│   ├── 通知项
│   │   ├── 内容节点: {通知类型图标} + {通知摘要} + {时间}
│   │   │   类型:
│   │   │   - waiting_review: "任务 X 等待审批"
│   │   │   - checking_failed: "任务 X 自动检查失败"
│   │   │   - pipeline_completed: "任务 X 流水线完成"
│   │   │   - agent_failed: "任务 X Agent 执行失败"
│   │   ├── NT-CLK  click [通知项] → 跳转到看板 + 打开对应任务抽屉
│   │   └── 内容节点: 未读蓝点标记
│   │
│   └── NT-ALL  click [全部已读] → 清除未读蓝点
│                + toast("已全部标记为已读")
│
└── NT-CLOSE  click [关闭] → 关闭下拉
```

### L3: 项目设置 [E区 600×500px]

```
L3: 项目设置 [E区 600×500px]
│
├── Tab 切换
│   ├── PRJ-TAB-GEN  click [基本信息] → 基本信息 Tab
│   ├── PRJ-TAB-MEM  click [Agent 记忆] → Agent 记忆 Tab
│   └── PRJ-TAB-PIPE click [流水线配置] → 流水线配置 Tab
│
├── 基本信息 Tab
│   ├── 内容节点: 项目名称 (只读)
│   ├── 内容节点: 项目路径 (只读)
│   ├── 内容节点: Git URL (只读, 可编辑)
│   ├── 内容节点: 技术栈 (自动检测 badge 列表)
│   ├── fill [编码规范/约定] (textarea)
│   └── PRJ-SAVE  click [保存]
│                  fail: { timeout: toast("保存超时"), 500: toast("保存失败") }
│                  expect: 项目信息更新
│                  + toast("已保存")
│
├── Agent 记忆 Tab
│   ├── Fact 列表
│   │   state: {
│   │     loading: skeleton(5行fact骨架),
│   │     empty: "暂无记忆",
│   │     error: "加载失败" + click [重试]
│   │   }
│   │   │
│   │   └── Fact 项
│   │       ├── 内容节点: {内容} + {分类 badge} + {置信度}
│   │       ├── FACT-EDIT  click [编辑] → inline 编辑
│   │       └── FACT-DEL   click [删除]
│   │                       → L5: 确认删除 [D区 360×180px]
│   │
│   └── FACT-ADD  click [+ 添加记忆] → inline 新增行
│                  fill [内容] + select [分类] → click [确认]
│                  fail: { timeout: toast("添加超时") }
│
├── 流水线配置 Tab
│   ├── 内容节点: pipeline.yaml 内容 (只读预览, 带语法高亮)
│   └── 内容节点: 阶段列表 (从 pipeline.yaml 解析, 只读)
│       每行: {阶段 key} → {Agent} → {门控类型} → {下一阶段}
│
└── PRJ-CLOSE  click [关闭] → 关闭弹窗
```

---

## 全局交互

### L5: 确认弹窗 [D区 360×180px]

```
L5: 确认操作 [D区 360×180px]
│
├── 内容节点: {确认文案} (例: "确定删除任务「用户登录功能」?")
├── CONF-YES    click [确认]
│                expect: 执行操作 + 刷新 UI
│                + toast("操作成功")
├── CONF-NO     click [取消] → 关闭弹窗
```

### 全局 Toast [T区]

```
toast 文案列表:
- "任务已创建"
- "任务已删除"
- "已通过，推进到下一阶段"
- "已驳回"
- "讨论已发起"
- "操作超时"
- "操作失败"
- "网络断开"
- "已保存"
- "已全部标记为已读"
```

### 全局异常状态

```
网络断开:
  全局 toast("网络断开") → 自动重连 → 重连成功 toast("已恢复")

SSE 断开 (Session/Chat):
  消息区域显示 "连接已断开" + click [重新连接]
  → 重新建立 SSE 连接 → 追加历史消息
  fail: { 连续3次重连失败 → toast("请检查网络后刷新页面") }
```

---

## 交互编号索引

| 编号 | 位置 | 操作 |
|------|------|------|
| KB-NAV-KAN | Navbar | 切换到看板 |
| KB-NAV-CHAT | Navbar | 切换到聊天 |
| NT-BELL | Navbar | 打开通知下拉 |
| PRJ-SET | Navbar | 打开项目设置 |
| KB-CARD-CLK | 看板卡片 | 打开任务详情抽屉 |
| KB-CARD-ADV | 看板卡片 | 推进任务到下一阶段 |
| KB-CARD-DEL | 看板卡片 | 删除任务 |
| KB-TASK-CRT | 看板底部 | 新建任务 |
| TASK-SUB | 新建任务弹窗 | 提交创建 |
| TASK-CANCEL | 新建任务弹窗 | 取消创建 |
| PRJ-CRT-REDIR | 新建任务弹窗 | 跳转创建项目 |
| DRW-CLOSE | 任务抽屉 | 关闭抽屉 |
| CLAR-SUB | 任务抽屉 | 回复 Agent 提问 |
| ART-CLK | 任务抽屉 | 查看产出物详情 |
| ART-EDIT | 任务抽屉 | 编辑产出物 |
| GATE-APPROVE | 任务抽屉 | 审批通过 |
| GATE-REJECT | 任务抽屉 | 驳回 |
| GATE-EDIT | 任务抽屉 | 编辑 Artifact 后通过 |
| RETRY-CLK | 任务抽屉 | 重试失败任务 |
| DRW-SESSION | 任务抽屉 | 启动 Agent Session |
| DRW-DISC | 任务抽屉 | 发起多 Agent 讨论 |
| DRW-ADV | 任务抽屉 | 推进下一阶段 |
| REJ-SUB | 驳回弹窗 | 提交驳回反馈 |
| REJ-CANCEL | 驳回弹窗 | 取消驳回 |
| ART-SAVE | Artifact 编辑器 | 保存编辑 |
| ART-CLOSE | Artifact 编辑器/详情 | 关闭弹窗 |
| ART-DL | 产出物详情 | 下载产出物 |
| DISC-SUB | 发起讨论弹窗 | 提交讨论 |
| DISC-CANCEL | 发起讨论弹窗 | 取消讨论 |
| CHAT-SEL-REQ | 聊天页 | 选中需求分析师 |
| CHAT-SEL-DES | 聊天页 | 选中架构师 |
| CHAT-SEL-DEV | 聊天页 | 选中开发工程师 |
| CHAT-SEL-TST | 聊天页 | 选中测试工程师 |
| CHAT-SEL-CUS | 聊天页 | 选自定义 Agent |
| CHAT-SEND | 聊天页 | 发送消息 |
| NT-CLK | 通知下拉 | 点击通知项 |
| NT-ALL | 通知下拉 | 全部已读 |
| NT-CLOSE | 通知下拉 | 关闭下拉 |
| PRJ-TAB-GEN | 项目设置 | 基本信息 Tab |
| PRJ-TAB-MEM | 项目设置 | Agent 记忆 Tab |
| PRJ-TAB-PIPE | 项目设置 | 流水线配置 Tab |
| PRJ-SAVE | 项目设置 | 保存项目信息 |
| PRJ-CLOSE | 项目设置 | 关闭弹窗 |
| FACT-EDIT | 项目记忆 | 编辑记忆条目 |
| FACT-DEL | 项目记忆 | 删除记忆条目 |
| FACT-ADD | 项目记忆 | 添加记忆条目 |
| CONF-YES | 全局确认弹窗 | 确认操作 |
| CONF-NO | 全局确认弹窗 | 取消操作 |
