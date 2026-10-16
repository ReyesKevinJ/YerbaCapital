import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`landing explains the proposal and routes both audiences in ${theme} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await page.getByLabel("Apariencia", { exact: true }).selectOption(theme);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("La yerba necesita tiempo.");
    await expect(page.getByLabel("Vista por rol")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "El token no es la yerba." })).toBeVisible();
    await page.getByRole("navigation", { name: "Navegación de presentación" }).getByRole("link", { name: "Para quién" }).click();
    await expect(page).toHaveURL(/#para-quien$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`landing-${theme}.png`), fullPage: true });
    await page.getByRole("link", { name: "Entrar como entidad yerbera" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByLabel("Vista por rol")).toHaveValue("borrower");
    await page.getByRole("link", { name: "YerbaCapital, inicio" }).click();
    await page.getByRole("link", { name: "Explorar como inversor", exact: true }).click();
    await expect(page).toHaveURL(/\/investors$/);
    await expect(page.getByLabel("Vista por rol")).toHaveValue("lender");
    await expect(page.getByRole("heading", { name: "Mapa de oferta · demostración" })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("landing motion respects device preference and keeps content usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toBeVisible();
  expect(await title.evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  const illustration = page.getByLabel("Esquema conceptual: lote en custodia, certificado y financiamiento");
  expect(await illustration.evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  await page.getByRole("link", { name: "Cómo funciona", exact: true }).click();
  await expect(page).toHaveURL(/#como-funciona$/);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  expect(await title.evaluate(element => getComputedStyle(element).animationName)).toBe("landing-enter");
  await page.getByRole("link", { name: "Soy una entidad yerbera" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("landing story card elevates and tilts on hover and returns smoothly without interfering with motion preferences", async ({ page, isMobile }) => {
  await page.goto("/");
  const card = page.getByLabel("Esquema conceptual: lote en custodia, certificado y financiamiento");
  await expect(card).toBeVisible();

  if (!isMobile) {
    const initialTransform = await card.evaluate(el => getComputedStyle(el).transform);
    await card.hover();
    await page.waitForTimeout(300);
    const hoverTransform = await card.evaluate(el => getComputedStyle(el).transform);
    expect(hoverTransform).not.toBe(initialTransform);

    // Return to resting position on mouse leave
    await page.mouse.move(10, 10);
    await page.waitForTimeout(550);
    const returnedTransform = await card.evaluate(el => getComputedStyle(el).transform);
    expect(returnedTransform).toBe(initialTransform);
  }

  // Reduced motion guarantee
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const reducedCard = page.getByLabel("Esquema conceptual: lote en custodia, certificado y financiamiento");
  expect(await reducedCard.evaluate(el => getComputedStyle(el).transform)).toBe("none");
  if (!isMobile) {
    await reducedCard.hover();
    await page.waitForTimeout(200);
    expect(await reducedCard.evaluate(el => getComputedStyle(el).transform)).toBe("none");
  }
});

