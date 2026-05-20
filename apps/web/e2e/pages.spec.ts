import { test, expect } from "@playwright/test";

test.describe("页面展示", () => {
  test("根路径重定向到看板", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/kanban/);
  });

  test("看板页加载 — 显示列、新建按钮、侧边栏", async ({ page }) => {
    await page.goto("/kanban");

    // 侧边栏导航
    await expect(page.getByRole("button", { name: "看板" })).toBeVisible();
    await expect(page.getByRole("button", { name: "聊天" })).toBeVisible();
    await expect(page.getByRole("button", { name: "设置" })).toBeVisible();

    // 看板列 — stageLabels 在 Column 中显示
    await expect(page.getByText("需求").first()).toBeVisible();
    await expect(page.getByText("设计").first()).toBeVisible();
    await expect(page.getByText("开发").first()).toBeVisible();
    await expect(page.getByText("测试").first()).toBeVisible();

    // 新建任务按钮
    await expect(
      page.getByRole("button", { name: /新建任务/ })
    ).toBeVisible();
  });

  test("聊天页加载 — 显示空状态提示", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByText("请先选择一个 Agent")).toBeVisible();
  });

  test("设置页加载 — 显示标签页和重新加载按钮", async ({ page }) => {
    await page.goto("/settings");

    // 标签按钮（tab bar 内的 button，exact 匹配避免匹配"重新加载 Agent"）
    await expect(
      page.getByRole("button", { name: "流水线", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Agent", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "记忆", exact: true })
    ).toBeVisible();

    // 重新加载按钮
    await expect(
      page.getByRole("button", { name: "重新加载 Agent" })
    ).toBeVisible();
  });
});
