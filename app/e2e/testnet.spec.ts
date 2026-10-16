import { expect, test } from "@playwright/test";

test("public view reads both confirmed synthetic Testnet paths without a wallet", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Protocolo y firmas por rol" })).toBeVisible();
  const health = await page.request.get("/api/system");
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ status: "testnet_ready", chainEnabled: true,
    components: { registry: "available", vault: "available", generatedClients: "generated" } });
  await page.getByLabel("Lote a consultar").fill("1");
  await page.getByRole("button", { name: "Consultar lote e historial" }).click();
  const trace = page.getByRole("region", { name: "Estado e historial del lote" });
  await expect(trace.getByText("Verified · 11000 kg · humedad 5 %")).toBeVisible({ timeout: 30_000 });
  await expect(trace.getByText("Receipted", { exact: true })).toBeVisible();
  const timeline = trace.getByRole("list", { name: "Eventos confirmados del lote" });
  await expect(timeline.getByText("LoanFunded", { exact: true })).toBeVisible();
  await expect(timeline.getByText("PartialWithdrawal", { exact: true })).toBeVisible();
  expect(await timeline.getByRole("link", { name: "Ver registro confirmado" }).first().getAttribute("href")).toMatch(/^https:\/\/stellar.expert\/explorer\/testnet\/tx\/[a-f0-9]{64}$/);
  await page.getByLabel("Consultar un préstamo, incluso después de liberar el lote").fill("1");
  await page.getByRole("button", { name: "Consultar préstamo", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Préstamo 1: Repaid" })).toContainText("deuda actual: 0 USDC");
  await page.getByLabel("Lote a consultar").fill("2");
  await page.getByRole("button", { name: "Consultar lote e historial" }).click();
  await expect(trace.getByText("Impaired · 12000 kg · humedad 5 %")).toBeVisible({ timeout: 30_000 });
  await expect(timeline.getByText("CollateralClaimed", { exact: true })).toBeVisible();
  await expect(page.getByText(/Reclamar el certificado no recupera físicamente la yerba/)).toBeVisible();
  await page.getByRole("button", { name: "Conectar Freighter", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Freighter/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("testnet-public.png"), fullPage: true });
});
