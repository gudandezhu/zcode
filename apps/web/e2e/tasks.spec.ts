import { test, expect } from "@playwright/test";

test.describe("任务 CRUD", () => {
  test("新建任务 — 输入标题选择阶段创建", async ({ page }) => {
    await page.goto("/kanban");
    await expect(
      page.getByRole("button", { name: /新建任务/ })
    ).toBeVisible();

    await page.getByRole("button", { name: /新建任务/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator('input[placeholder="任务标题"]').fill("E2E测试任务");
    await dialog.getByRole("button", { name: "高级架构师" }).click();
    await dialog.getByRole("button", { name: "创建" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("E2E测试任务").first()).toBeVisible({ timeout: 5000 });
  });

  test("删除任务", async ({ page }) => {
    await page.goto("/kanban");
    await expect(
      page.getByRole("button", { name: /新建任务/ })
    ).toBeVisible();

    // 创建唯一名称任务（避免历史数据冲突）
    const uniqueName = `删除${Date.now()}`;
    await page.getByRole("button", { name: /新建任务/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[placeholder="任务标题"]').fill(uniqueName);
    await dialog.getByRole("button", { name: "创建" }).click();
    await expect(dialog).not.toBeVisible();

    // 任务出现在看板
    await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 5000 });

    // 找到看板中的任务卡片
    const card = page.locator("div.cursor-pointer").filter({ hasText: uniqueName });
    await expect(card).toBeVisible();

    // 点击卡片内的删除按钮
    await card.getByRole("button", { name: "删除" }).click();

    // 任务从看板消失
    await expect(card).not.toBeVisible({ timeout: 5000 });
  });

  test("看板列正确展示任务", async ({ page }) => {
    await page.goto("/kanban");
    await expect(
      page.getByRole("button", { name: /新建任务/ })
    ).toBeVisible();

    const stageShortLabels = ["需求", "设计", "开发", "测试"];
    for (const stage of stageShortLabels) {
      await expect(page.getByText(stage, { exact: false }).first()).toBeVisible();
    }
  });
});

test.describe("任务状态流转", () => {
  test("点击任务卡片打开面板显示状态", async ({ page }) => {
    await page.goto("/kanban");
    await expect(
      page.getByRole("button", { name: /新建任务/ })
    ).toBeVisible();

    // 创建唯一名称任务确保可点击
    const uniqueName = `状态${Date.now()}`;
    await page.getByRole("button", { name: /新建任务/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[placeholder="任务标题"]').fill(uniqueName);
    await dialog.getByRole("button", { name: "创建" }).click();
    await expect(dialog).not.toBeVisible();

    // 点击任务卡片
    const card = page.locator("div.cursor-pointer").filter({ hasText: uniqueName });
    await expect(card).toBeVisible({ timeout: 5000 });
    await card.click();

    // 面板出现 — 检查状态 badge
    const statusBadge = page.getByText(/待处理|进行中|运行中|已完成|失败|待审批|检查中|阻塞中/).first();
    await expect(statusBadge).toBeVisible({ timeout: 5000 });

    // 面板 tab 可见（用文本定位避免和侧边栏导航按钮冲突）
    // 面板内的 tab 在一个 border-t border-b 的容器中
    const panelTabs = page.locator("div.flex.border-t");
    await expect(panelTabs.getByText("时间线")).toBeVisible();
    await expect(panelTabs.getByText("聊天")).toBeVisible();
    await expect(panelTabs.getByText("讨论区")).toBeVisible();
  });
});
