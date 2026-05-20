import { test, expect } from "@playwright/test";

test.describe("Chat 功能", () => {
  test("选择 Agent 后输入框可用", async ({ page }) => {
    await page.goto("/chat");

    // 等待 Agent 按钮出现
    const agentBtn = page.getByRole("button", { name: "需求分析师" });
    await expect(agentBtn).toBeVisible({ timeout: 5000 });

    await agentBtn.click();

    const input = page.locator("textarea").first();
    await expect(input).toBeEnabled();
  });

  test("未选择 Agent 时发送按钮禁用", async ({ page }) => {
    await page.goto("/chat");

    const sendBtn = page.getByRole("button", { name: "发送" });
    if (await sendBtn.isVisible()) {
      await expect(sendBtn).toBeDisabled();
    }
  });
});

test.describe("Settings — 记忆面板", () => {
  test("添加和删除记忆", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("流水线阶段")).toBeVisible();

    // 切换到记忆标签
    await page.getByRole("button", { name: "记忆", exact: true }).click();
    await expect(page.getByText("项目记忆").first()).toBeVisible();

    // 点击添加
    await page.getByRole("button", { name: "添加" }).click();

    // 输入框出现
    const input = page.locator('input[placeholder="输入项目事实..."]');
    await expect(input).toBeVisible();

    await input.fill("E2E测试记忆条目");

    // 保存
    await page.getByRole("button", { name: "保存" }).click();

    // 验证记忆条目出现
    await expect(page.getByText("E2E测试记忆条目")).toBeVisible({ timeout: 5000 });

    // 删除刚创建的记忆
    const memoryItem = page.locator("li").filter({ hasText: "E2E测试记忆条目" });
    // 删除按钮 hover 才显示，强制点击
    await memoryItem.getByRole("button", { name: "删除" }).click({ force: true });

    // 验证删除成功
    await expect(page.getByText("E2E测试记忆条目")).not.toBeVisible({ timeout: 5000 });
  });
});
