import { expect, test } from "@playwright/test";

test("public view reads both confirmed synthetic Testnet paths without a wallet", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const lots = page.getByRole("table", { name: "Lotes leídos del registry de Testnet" });
  await expect(lots.getByText("11.000 kg", { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(lots.getByText("Deteriorado", { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("dashboard-testnet.png"), fullPage: true });
  await page.getByRole("button", { name: "Operaciones", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Protocolo y firmas por rol" })).toBeVisible();
  const health = await page.request.get("/api/system");
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ status: "testnet_ready", chainEnabled: true,
    components: { registry: "available", vault: "available", generatedClients: "generated" } });
  await page.getByLabel("Lote a consultar").fill("1");
  await page.getByRole("button", { name: "Consultar lote e historial" }).click();
  const trace = page.getByRole("region", { name: "Estado e historial del lote" });
  await expect(trace.getByText("Verificado · 11000 kg · humedad 5 %")).toBeVisible({ timeout: 30_000 });
  await expect(trace.getByText("Emitido / libre", { exact: true })).toBeVisible();
  const timeline = trace.getByRole("list", { name: "Eventos confirmados del lote" });
  await expect(timeline.getByText("Préstamo financiado", { exact: true })).toBeVisible();
  await expect(timeline.getByText("Retiro parcial registrado", { exact: true })).toBeVisible();
  expect(await timeline.getByRole("link", { name: "Ver registro confirmado" }).first().getAttribute("href")).toMatch(/^https:\/\/stellar.expert\/explorer\/testnet\/tx\/[a-f0-9]{64}$/);
  await page.getByLabel("Consultar un préstamo, incluso después de liberar el lote").fill("1");
  await page.getByRole("button", { name: "Consultar préstamo", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Préstamo 1: Pagado" })).toContainText("deuda actual: 0 USDC", { timeout: 30000 });
  await page.getByLabel("Lote a consultar").fill("2");
  await page.getByRole("button", { name: "Consultar lote e historial" }).click();
  await expect(trace.getByText("Deteriorado · 12000 kg · humedad 5 %")).toBeVisible({ timeout: 30_000 });
  await expect(timeline.getByText("Certificado reclamado", { exact: true })).toBeVisible();
  await expect(page.getByText(/Reclamar el certificado no recupera físicamente la yerba/)).toBeVisible();
  await page.getByRole("button", { name: "Conectar Freighter", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Freighter/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("testnet-public.png"), fullPage: true });
});

test("Testnet role task selectors match each actor without preparing or signing", async ({ page }) => {
  await page.goto("/");
  const expected: Record<string, string[]> = {
    borrower: ["register_lot", "request_loan", "cancel_request", "approve_repayment", "repay", "revoke_allowance", "partial_withdraw", "mark_default"],
    lender: ["fund", "mark_default", "claim_collateral", "approve_repayment", "repay", "revoke_allowance"],
    custodian: ["verify_lot", "partial_withdraw"],
    verifier: ["verify_lot", "issue_receipt", "record_inspection", "impair"],
    price_oracle: ["post_valuation"], admin: ["grant_role"],
  };
  for (const [role, operations] of Object.entries(expected)) {
    await page.getByLabel("Vista por rol").selectOption(role);
    await page.getByRole("navigation").getByRole("button", { name: "Operaciones", exact: true }).click();
    await expect(page.getByLabel("Operación", { exact: true })).toHaveValue(operations[0] ?? "");
    expect(await page.getByLabel("Operación", { exact: true }).locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(operations);
  }
  await page.getByLabel("Vista por rol").selectOption("observer");
  await page.getByRole("navigation").getByRole("button", { name: "Actividad", exact: true }).click();
  await expect(page.getByRole("button", { name: "Conectar Freighter", exact: true })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Estado e historial del lote", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("role-public.png"), fullPage: true });
});

test("field-friendly units and guidance keep contract units out of entry forms", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("button", { name: "Operaciones", exact: true }).click();
  await expect(page.getByLabel("Inicio del estacionamiento (fecha y hora local)")).toHaveAttribute("type", "datetime-local");
  await expect(page.getByText("Pedí este código al equipo que prepara la demo. No escribas una dirección ni inventes un código.")).toBeVisible();
  await page.getByLabel("Operación", { exact: true }).selectOption("request_loan");
  await expect(page.getByLabel("Tasa anual (%)", { exact: true })).toHaveValue("12");
  await expect(page.getByLabel("Plazo del préstamo (días)", { exact: true })).toHaveValue("180");
  await page.getByLabel("Vista por rol").selectOption("verifier");
  await page.getByRole("navigation").getByRole("button", { name: "Operaciones", exact: true }).click();
  await page.getByLabel("Número de lote", { exact: true }).fill("1");
  await page.getByLabel("Peso en kg enteros", { exact: true }).fill("12000");
  await page.getByLabel("Humedad (%)", { exact: true }).fill("cinco");
  await page.getByLabel("Código del comprobante (SHA-256)", { exact: true }).fill("a".repeat(64));
  await page.getByRole("button", { name: "Revisar datos antes de firmar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Ingresá un porcentaje" })).toBeVisible();
  await expect(page.getByLabel("Humedad (%)", { exact: true })).toHaveValue("cinco");
});

test("specialist tasks explain signatures, valuation and payment before any wallet action", async ({ page }) => {
  await page.goto("/");
  for (const [role, operation, heading, help, explanation] of [
    ["lender", "fund", "Financiar una solicitud", "¿Qué es USDC de prueba?", "No son pesos ni dinero real"],
    ["custodian", "verify_lot", "Confirmar el ingreso con el depósito", "¿Quién firma primero?", "Para preparar la verificación usá la cuenta del inspector"],
    ["verifier", "record_inspection", "Registrar una inspección aprobada", "¿Qué pasa si encuentro un problema?", "Esta tarea registra una inspección aprobada"],
    ["price_oracle", "post_valuation", "Publicar cuánto vale el lote completo", "¿Qué importe tengo que escribir?", "El valor de todo el lote, no el precio de un kilo"],
    ["lender", "claim_collateral", "Reclamar el certificado por incumplimiento", "¿La deuda que se muestra después se puede volver a cobrar?", "No es una orden de cobro adicional"],
  ] as const) {
    await page.getByLabel("Vista por rol", { exact: true }).selectOption(role);
    await page.getByRole("navigation").getByRole("button", { name: "Operaciones", exact: true }).click();
    await page.getByLabel("Operación", { exact: true }).selectOption(operation);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await page.locator("summary").filter({ hasText: help }).click();
    await expect(page.getByText(explanation, { exact: false })).toBeVisible();
    if (role === "price_oracle") await expect(page.getByLabel("Valor total del lote (USDC de prueba)", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("public deep links read physical and financial history and catalog discovers this deployment", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/lots/1");
  await expect(page.getByRole("heading", { name: "Lote #1", exact: true })).toBeVisible();
  await expect(page.getByText("Verificado · 11.000 kg · Humedad 5 %", { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Préstamo pagado", { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Pago parcial registrado", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Conectar Freighter", exact: true })).toHaveCount(0);
  const response = await page.request.get("/api/catalog?offset=0"); expect(response.ok()).toBe(true);
  const catalog = await response.json(); expect(catalog.network).toBe("testnet"); expect(catalog.lotIds).toEqual(expect.arrayContaining(["1", "2"]));
  expect(catalog.loanIds).toEqual(expect.arrayContaining(["1", "2"])); expect(catalog.nextLedger).toBeGreaterThan(catalog.fromLedger);
  await page.goto("/lots/2");
  await expect(page.getByText("Deteriorado · 12.000 kg · Humedad 5 %", { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Certificado reclamado", { exact: true })).toBeVisible({ timeout: 30000 });
});

test("borrower can reuse a consulted warehouse and query contract capacity without signing", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByRole("navigation").getByRole("button", { name: "Operaciones", exact: true }).click();
  const warehouse = page.getByLabel("Usar la referencia de un depósito ya consultado (opcional)", { exact: true });
  await expect(warehouse).toBeVisible({ timeout: 30000 }); await warehouse.selectOption("1");
  await expect(page.getByLabel("Cuenta del custodio", { exact: true })).toHaveValue(/^G[A-Z2-7]{55}$/);
  await expect(page.getByLabel("Código del depósito entregado por el equipo", { exact: true })).toHaveValue(/^[a-f0-9]{64}$/);
  await page.getByLabel("Operación", { exact: true }).selectOption("request_loan");
  await page.getByLabel("Número de lote", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Consultar monto máximo del contrato", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Monto máximo consultado:" })).toContainText("USDC de prueba", { timeout: 30000 });
});

test("verifier can explicitly apply an uploaded digest without replacing the rest of the form", async ({ page }) => {
  await page.goto("/"); await page.getByLabel("Vista por rol", { exact: true }).selectOption("verifier");
  await page.getByRole("navigation").getByRole("button", { name: "Operaciones", exact: true }).click();
  await page.getByLabel("Número de lote", { exact: true }).fill("1"); await page.getByLabel("Peso en kg enteros", { exact: true }).fill("11000");
  await page.getByRole("navigation").getByRole("button", { name: "Resumen", exact: true }).click();
  await page.getByLabel("Archivo sintético", { exact: true }).setInputFiles({ name: "synthetic-inspection.txt", mimeType: "text/plain", buffer: Buffer.from("abc") });
  await page.getByRole("button", { name: "Guardar comprobante", exact: true }).click();
  await page.getByRole("button", { name: "Usar comprobante en la operación actual", exact: true }).click();
  await expect(page.getByRole("region", { name: "Protocolo y firmas por rol", exact: true }).getByLabel("Código del comprobante (SHA-256)", { exact: true })).toHaveValue("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  await expect(page.getByLabel("Número de lote", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Peso en kg enteros", { exact: true })).toHaveValue("11000");
});
