import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("application shell", () => {
  test("renders the environment-ready page", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "watnow-team-dokidoki" })).toBeVisible();
  });

  test("has no automatically detectable WCAG A or AA violations", async ({ page }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
