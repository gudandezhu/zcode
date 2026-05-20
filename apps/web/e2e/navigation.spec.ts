import { test, expect } from "@playwright/test";

test.describe("导航交互", () => {
  test("侧边栏切换页面", async ({ page }) => {
    await page.goto("/kanban");

    await page.getByRole("button", { name: "聊天" }).click();
    await expect(page).toHaveURL(/\/chat/);

    await page.getByRole("button", { name: "设置" }).click();
    await expect(page).toHaveURL(/\/settings/);

    await page.getByRole("button", { name: "看板" }).click();
    await expect(page).toHaveURL(/\/kanban/);
  });

  test("暗色模式切换", async ({ page }) => {
    await page.goto("/kanban");

    const toggleBtn = page.getByRole("button", { name: /切换.*模式/ });
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await expect(page.locator("html")).toHaveClass(/dark/);

      await toggleBtn.click();
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    }
  });

  test("点击任务卡片打开上下文面板", async ({ page }) => {
    await page.goto("/kanban");
    await expect(
      page.getByRole("button", { name: /新建任务/ })
    ).toBeVisible();

    // 创建唯一名称任务
    const uniqueName = `面板${Date.now()}`;
    await page.getByRole("button", { name: /新建任务/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[placeholder="任务标题"]').fill(uniqueName);
    await dialog.getByRole("button", { name: "创建" }).click();
    await expect(dialog).not.toBeVisible();

    // 等待任务出现并点击
    const cardTitle = page.getByText(uniqueName).first();
    await expect(cardTitle).toBeVisible({ timeout: 5000 });

    // 找到包含该标题的卡片容器并点击
    const card = page.locator("div.cursor-pointer").filter({ hasText: uniqueName });
    await card.click();

    // 面板出现 — 通过状态 badge 或阶段标签定位
    // 面板 header 包含 status badge + stage badge
    const statusBadge = page.getByText(/待处理|进行中|运行中|已完成|失败|待审批/).first();
    await expect(statusBadge).toBeVisible({ timeout: 5000 });

    // 面板 tab 应可见
    await expect(page.getByRole("button", { name: "时间线" })).toBeVisible();

    // 关闭面板 — h2 标题旁边的 X 按钮
    const panelHeader = page.locator("h2").filter({ hasText: uniqueName }).locator("..");
    await panelHeader.locator("button").click();

    // 面板关闭后 tab 消失
    await expect(page.getByRole("button", { name: "时间线" })).not.toBeVisible();
  });
});

test.describe("设置页标签切换", () => {
  test("切换流水线/Agent/记忆标签", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("流水线阶段")).toBeVisible();

    await page.getByRole("button", { name: "Agent", exact: true }).click();
    await expect(page.getByText("流水线 Agent")).toBeVisible();

    await page.getByRole("button", { name: "记忆", exact: true }).click();
    await expect(page.getByText("项目记忆").first()).toBeVisible();
  });
});
