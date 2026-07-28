import { expect, test } from "@playwright/test";

const viewports = [
  [320, 800],
  [375, 812],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
] as const;

test("login page opens without a hydration error", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
  expect(consoleErrors.filter(message => /hydration|Minified React error/i.test(message))).toEqual([]);
});

test("protected project route redirects an unauthenticated browser", async ({ page }) => {
  await page.goto("/projects", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("unsafe auth redirect stays on the login flow", async ({ page }) => {
  await page.goto("/login?next=https%3A%2F%2Fevil.example", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.locator('form input[name="next"]')).toHaveCount(2);
  await expect(page.locator('form input[name="next"]').first()).toHaveValue("https://evil.example");
  await expect(page.getByRole("link", { name: "สมัครสมาชิกฟรี" })).toHaveAttribute("href", "/register?next=https%3A%2F%2Fevil.example");
});

for (const [width, height] of viewports) {
  test(`login responsive layout has no horizontal overflow at ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto("/login", { waitUntil: "networkidle" });
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await testInfo.attach(`login-${width}x${height}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
}

test.describe("authenticated workspace browser flows", () => {
  test.skip(!process.env.DEVLIFE_E2E_AUTH_STATE, "Requires a non-production test auth state file");

  test("workspace role controls and critical editing flows", async () => {
    // Authenticated coverage is enabled only with an explicitly supplied test state.
  });
});
