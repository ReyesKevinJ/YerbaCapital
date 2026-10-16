import { expect, test } from "@playwright/test";

test("role workspaces expose relevant tasks and public view stays read-only", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const picker = page.getByLabel("Vista por rol");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  for (const [role, heading, section] of [
    ["borrower", "Cooperativa / quien pide el préstamo", "Financiamiento"],
    ["lender", "Prestamista", "Financiamiento"],
    ["custodian", "Depósito / custodio", "Verificaciones"],
    ["verifier", "Inspector / verificador", "Verificaciones"],
    ["price_oracle", "Valuador del lote", "Operaciones"],
    ["admin", "Administrador", "Operaciones"],
    ["observer", "Consulta pública", "Actividad"],
  ] as const) {
    await picker.selectOption(role);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await nav.getByRole("button", { name: section, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: section })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(nav.getByRole("button", { name: "Operaciones", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registrar lote", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Revisar datos antes de firmar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Conectar Freighter" })).toHaveCount(0);
  await picker.selectOption("admin");
  await expect(page.getByRole("button", { name: "Administrador · Habilitar una tarea", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /(Financiar un préstamo|Pagar préstamo|Retirar parte)/ })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("role-admin.png"), fullPage: true });
  expect(errors).toEqual([]);
});
