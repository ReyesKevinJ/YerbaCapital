import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { createHash } from "node:crypto";

test("public link opens in an isolated visitor session and downloaded QR encodes that exact link", async ({ page, browser }) => {
  await page.goto("/lots/1");
  await expect(page.getByRole("heading", { name: "Lote #1", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Conectar Freighter", exact: true })).toHaveCount(0);
  const input = page.getByLabel("Enlace público de Testnet", { exact: true });
  await expect(input).toHaveValue(/\/lots\/1/);
  const url = await input.inputValue();
  const png = PNG.sync.read(await page.getByRole("img", { name: "QR de consulta del lote 1", exact: true }).screenshot());
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded?.data).toBe(url);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar QR en SVG", exact: true }).click()]);
  expect(download.suggestedFilename()).toBe("yerbacapital-testnet-lot-1.svg");
  const context = await browser.newContext(); const visitor = await context.newPage();
  await visitor.goto(url); await expect(visitor.getByRole("heading", { name: "Lote #1", exact: true })).toBeVisible();
  await expect(visitor.getByRole("button", { name: "Conectar Freighter", exact: true })).toHaveCount(0); await context.close();
  await page.goto("/lots/1?registry=other-deployment");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("otros contratos de Testnet");
  await expect(page.getByLabel("Enlace público de Testnet", { exact: true })).toHaveCount(0);
  const invalid = await page.goto("/lots/0"); expect(invalid?.status()).toBe(404);
});

test("borrower stores a reproducible manifest for inspection, dryer and synthetic insurance", async ({ page }) => {
  await page.goto("/dashboard"); await page.getByRole("navigation").getByRole("button", { name: "Lotes", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Preparar documentos de un lote:" }).click();
  await page.getByLabel("Alias ficticio del secadero (opcional)", { exact: true }).fill("Secadero de prueba A");
  for (const name of ["Informe o foto de inspección de prueba", "Comprobante del secadero (opcional, de prueba)", "Póliza de seguro (opcional, de prueba)"]) {
    await page.getByLabel(name, { exact: true }).setInputFiles({ name: "synthetic.txt", mimeType: "text/plain", buffer: Buffer.from("abc") });
  }
  await page.getByRole("button", { name: "Guardar carpeta de comprobantes", exact: true }).click();
  const digest = page.getByLabel("Código de la carpeta (SHA-256)", { exact: true });
  await expect(digest).toHaveValue(/^[a-f0-9]{64}$/);
  const sha256 = await digest.inputValue(); const response = await page.request.get(`/api/evidence/${sha256}`);
  expect(response.ok()).toBe(true); const bytes = await response.body();
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(sha256);
  const manifest = JSON.parse(bytes.toString()); expect(manifest.synthetic).toBe(true); expect(manifest.evidence).toHaveLength(3);
  for (const file of manifest.evidence) {
    const original = await page.request.get(`/api/evidence/${file.sha256}`); expect(await original.text()).toBe("abc");
  }
  await expect(page.getByRole("button", { name: "Usar carpeta en la operación actual", exact: true })).toBeDisabled();
  await page.getByLabel("Alias ficticio del secadero (opcional)", { exact: true }).fill("Otro alias ficticio");
  await expect(page.getByLabel("Código de la carpeta (SHA-256)", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
