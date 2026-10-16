import { expect, test } from "@playwright/test";

test("pilot agreement persists, requires evidence for review and exports its references", async ({ page }) => {
  await page.goto("/pilot/local");
  await page.getByLabel("Título", { exact: true }).fill("Custodia sintética");
  await page.getByLabel("Responsable (alias de prueba)").fill("custodian-demo");
  await page.getByLabel("Categoría", { exact: true }).selectOption("custody");
  await page.getByLabel("Estado documental").selectOption("InReview");
  await page.getByRole("button", { name: "Guardar acuerdo", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Adjuntá un documento");
  await page.getByLabel("Documento sintético (hasta 5 MiB)").setInputFiles({ name: "synthetic.txt", mimeType: "text/plain", buffer: Buffer.from("abc") });
  await page.getByRole("button", { name: "Guardar acuerdo", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Acuerdo guardado");
  await page.reload();
  const agreement = page.getByRole("article", { name: "Custodia sintética" });
  await expect(agreement).toContainText("En revisión");
  await page.getByRole("button", { name: "Editar Custodia sintética" }).click();
  await expect(page.getByLabel("Título", { exact: true })).toBeFocused();
  await page.getByLabel("Estado documental").selectOption("Reviewed");
  await page.getByRole("button", { name: "Guardar acuerdo", exact: true }).click();
  await expect(agreement).toContainText("Revisado");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar expediente" }).click()]);
  expect(download.suggestedFilename()).toBe("yerbacapital-pilot.json");
  await page.getByLabel("Importar copia JSON", { exact: false }).setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Expediente inválido");
  await expect(agreement).toContainText("Revisado");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("pilot.png"), fullPage: true });
});

test("imports a copy and rejects conflicts without replacing existing agreements", async ({ page }) => {
  await page.goto("/pilot/local");
  const agreement = { id: "import-demo", title: "Seguro sintético", owner: "insurance-demo", category: "insurance", status: "Blocked", pending: "Falta cotización", evidence: [], updatedAt: "2026-10-16T12:00:00Z" };
  const input = page.getByLabel("Importar copia JSON", { exact: false });
  await input.setInputFiles({ name: "pilot.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ version: 1, agreements: [agreement] })) });
  await expect(page.getByRole("article", { name: "Seguro sintético" })).toContainText("Falta cotización");
  await input.setInputFiles({ name: "conflict.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ version: 1, agreements: [{ ...agreement, title: "Versión diferente" }] })) });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("versiones distintas");
  await page.reload();
  await expect(page.getByRole("article", { name: "Seguro sintético" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Versión diferente" })).toHaveCount(0);
});
