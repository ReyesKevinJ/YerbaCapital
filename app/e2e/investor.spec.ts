import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`investor map filters synthetic offers and opens financing in ${theme} mode`, async ({ page }) => {
    await page.goto("/investors");
    await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
    await expect(page.getByLabel("Vista por rol")).toHaveValue("lender");
    await expect(page.getByRole("heading", { name: "Mapa de oferta · demostración" })).toBeVisible();
    await expect(page.getByText("Ejemplos ficticios, sin ofertas de venta reales.")).toBeVisible();
    const map = page.getByRole("group", { name: "Mapa esquemático interactivo del NEA" });
    await expect(map.getByRole("button")).toHaveCount(3);
    await map.getByRole("button", { name: "Explorar Eldorado, ejemplo ficticio" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Secadero Tierra Roja · ficticio" })).toBeVisible();
    await page.getByLabel("Provincia", { exact: true }).selectOption("Corrientes");
    await expect(map.getByRole("button")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Depósito Las Palmeras · ficticio" })).toBeVisible();
    await page.getByLabel("Provincia", { exact: true }).selectOption("Todas");
    await expect(map.getByRole("button")).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("heading", { name: "Mapa de oferta · demostración" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`investor-${theme}.png`), fullPage: true });
    await page.getByRole("button", { name: "Ver solicitudes de Testnet" }).click();
    await expect(page.getByRole("heading", { name: "Financiamiento", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Catálogo de financiamiento" })).toBeVisible();
    await page.goto("/");
    await page.getByRole("link", { name: "Explorar como inversor" }).click();
    await expect(page).toHaveURL(/\/investors$/);
  });
}
