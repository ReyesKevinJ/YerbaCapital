import { expect, test } from "@playwright/test";

const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

test("synthetic evidence round trip works through the app, API and storage", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Ir al contenido" })).toBeFocused();
  await page.keyboard.press("Enter");
  const submit = page.getByRole("button", { name: "Guardar comprobante" });
  await submit.click();
  await expect(page.getByRole("region", { name: "Guardá un archivo de prueba" }).getByRole("alert")).toContainText("Seleccioná un archivo sintético");
  await expect(page.getByLabel("Archivo sintético")).toBeFocused();
  await page.getByLabel("Archivo sintético").setInputFiles({ name: "synthetic.txt", mimeType: "text/plain", buffer: Buffer.from("abc") });
  await submit.click();
  await expect(page.getByRole("heading", { name: "Evidencia guardada localmente" })).toBeVisible();
  await expect(page.getByLabel("SHA-256")).toHaveValue(ABC_SHA256);
  await expect(page.getByText("No está firmada ni registrada en blockchain.")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Descargar archivo original" }).click(),
  ]);
  const stream = await download.createReadStream();
  if (!stream) throw new Error("No download stream was created.");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString()).toBe("abc");
  const status = await page.request.get("/api/system");
  expect(status.ok()).toBe(true);
  expect(await status.json()).toMatchObject({ status: "offchain_ready", chainEnabled: false, components: { registry: "disabled", vault: "disabled" } });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("evidence.png"), fullPage: true });
});

test("a failed upload keeps the selected file and allows recovery", async ({ page }) => {
  await page.goto("/dashboard");
  await page.route("**/api/evidence", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Servicio no disponible. Volvé a intentar." }) }));
  await page.getByLabel("Archivo sintético").setInputFiles({ name: "synthetic.txt", mimeType: "text/plain", buffer: Buffer.from("abc") });
  await page.getByRole("button", { name: "Guardar comprobante" }).click();
  await expect(page.getByRole("region", { name: "Guardá un archivo de prueba" }).getByRole("alert")).toContainText("Servicio no disponible");
  await expect(page.getByRole("button", { name: "Guardar comprobante" })).toBeEnabled();
  expect(await page.getByLabel("Archivo sintético").evaluate((input: HTMLInputElement) => input.files?.[0]?.name)).toBe("synthetic.txt");
  await page.unroute("**/api/evidence");
  await page.getByRole("button", { name: "Guardar comprobante" }).click();
  await expect(page.getByLabel("SHA-256")).toHaveValue(ABC_SHA256);
});
