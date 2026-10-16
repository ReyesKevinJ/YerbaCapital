import { expect, test } from "@playwright/test";

test("appearance follows the device, persists an explicit choice and works in the pilot", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const appearance = page.getByLabel("Apariencia", { exact: true });
  await expect(appearance).toHaveValue("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".yc-card").first()).toHaveCSS("background-color", "rgb(25, 39, 31)");
  await appearance.selectOption("light");
  await page.reload();
  await expect(appearance).toHaveValue("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await appearance.selectOption("dark");
  await page.goto("/pilot");
  await expect(appearance).toHaveValue("dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 26, 21)");
  await page.emulateMedia({ media: "print" });
  await expect(appearance).toBeHidden();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.emulateMedia({ media: "screen", colorScheme: "dark" });
  await appearance.selectOption("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("appearance remains usable when browser storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", { value() { throw new Error("Storage unavailable"); } });
    Object.defineProperty(Storage.prototype, "setItem", { value() { throw new Error("Storage unavailable"); } });
  });
  await page.goto("/");
  await page.getByLabel("Apariencia", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Apariencia", { exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("mobile navigation exposes every destination without horizontal scrolling", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile navigation layout");
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Navegación principal" });
  const buttons = navigation.getByRole("button");
  for (const button of await buttons.all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
  }
  const rolePicker = page.getByLabel("Vista por rol", { exact: true });
  await expect(rolePicker).toHaveCSS("font-size", "16px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
