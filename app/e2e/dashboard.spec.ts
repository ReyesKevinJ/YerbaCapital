import { expect, test } from "@playwright/test";

test("imported dashboard navigates, preserves off-chain evidence and does not invent financial data", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Panel de control", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Ir al contenido" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Registrar lote", exact: true })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Guardá un archivo de prueba" })).toBeVisible();
  await expect(page.getByText("Cooperativa Monte Verde", { exact: true })).toHaveCount(0);
  await expect(page.getByText("US$ 18.000", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("dashboard-overview.png"), fullPage: true });
  for (const section of ["Lotes", "Financiamiento", "Actividad", "Integraciones", "Operaciones"]) {
    await page.getByRole("navigation").getByRole("button", { name: section, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: section, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("link", { name: "Acuerdos del piloto" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Acuerdos y documentación" })).toBeVisible();
  expect(errors).toEqual([]);
});
