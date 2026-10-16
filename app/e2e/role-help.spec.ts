import { expect, test } from "@playwright/test";

test("every non-technical workspace explains its work with touch and keyboard help", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dashboard");
  for (const [role, title, explanation] of [
    ["borrower", "¿Qué significa dejar el lote en garantía?", "El certificado queda comprometido con ese préstamo"],
    ["lender", "¿Qué recibo como respaldo?", "El préstamo queda vinculado al certificado"],
    ["custodian", "¿Qué es una cofirma y cuándo me toca?", "Es una segunda autorización sobre la misma operación"],
    ["verifier", "¿Guardar el informe ya verifica el lote?", "No. Guardarlo genera un código para vincular el archivo"],
    ["price_oracle", "¿Valuación y monto del préstamo son lo mismo?", "No. Publicás cuánto vale el lote completo"],
    ["observer", "¿Qué puedo comprobar desde acá?", "Podés revisar qué cuenta registró cada hecho"],
  ] as const) {
    await page.getByLabel("Vista por rol", { exact: true }).selectOption(role);
    await expect(page.getByRole("heading", { name: "Cómo seguir", exact: true })).toBeVisible();
    const summary = page.locator("summary").filter({ hasText: title });
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(explanation, { exact: false })).toBeVisible();
    await summary.click();
    await expect(page.getByText(explanation, { exact: false })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(page.getByText("No necesitás conectar una billetera ni firmar para leerlos.", { exact: false })).toBeVisible();
  await page.getByLabel("Vista por rol", { exact: true }).selectOption("admin");
  await expect(page.getByRole("heading", { name: "Cómo seguir", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Administrador · Habilitar una tarea", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
