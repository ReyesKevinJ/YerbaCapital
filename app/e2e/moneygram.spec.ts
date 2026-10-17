import { expect, test } from "@playwright/test";

test("off-ramp demo is explicitly illustrative, exact and never creates a transaction", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByLabel("Vista por rol").selectOption("borrower");
  const opener = page.getByRole("button", { name: "Simular conversión a pesos", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Simular conversión a pesos" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("No está conectada a MoneyGram");
  await expect(dialog.getByRole("textbox")).toHaveCount(1);
  const amount = dialog.getByLabel("Importe ilustrativo en USDC", { exact: true });
  const simulate = dialog.getByRole("button", { name: "Ver resultado de ejemplo" });
  for (const invalid of ["0", "-1", "1e3", "1.00000001", "1000001", "NaN"]) {
    await amount.fill(invalid);
    await expect(simulate).toBeDisabled();
    await expect(dialog.getByRole("alert")).toBeVisible();
  }
  await amount.fill("123.4567891");
  await expect(dialog).toContainText("158024.690048 ARS");
  await dialog.getByRole("radio", { name: "Cuenta bancaria (simulación)", exact: true }).check();
  await expect(dialog).toContainText("No ingreses nombre, CUIT, CBU, alias ni datos reales.");
  await expect(dialog.getByRole("textbox")).toHaveCount(1);
  await simulate.click();
  await expect(dialog.getByRole("heading", { name: "Resultado ilustrativo · Sin operación real" })).toBeVisible();
  await expect(dialog).toContainText("No se creó una transacción Stellar ni una orden de MoneyGram.");
  await expect(dialog.getByRole("link")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(dialog.getByRole("heading", { name: "Resultado ilustrativo · Sin operación real" })).toHaveCount(0);
  await expect(amount).toHaveValue("123.4567891");
});

test("off-ramp demo keeps keyboard focus inside dialog and supports cancellation", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByLabel("Apariencia", { exact: true }).selectOption("dark");
  await page.getByLabel("Vista por rol").selectOption("borrower");
  await page.getByRole("button", { name: "Simular conversión a pesos", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Simular conversión a pesos" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Zona del ejemplo · No es una sucursal")).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar simulación", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Cancelar simulación" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Cerrar simulación", exact: true })).toBeFocused();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("off-ramp-demo.png") });
  await dialog.getByRole("button", { name: "Cancelar simulación" }).click();
  await expect(dialog).not.toBeVisible();
});
