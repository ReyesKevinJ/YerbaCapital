import { expect, test } from "@playwright/test";

/** Opt-in UI regression tests. Reads the existing synthetic Testnet lot; never signs. */
test("public evidence verifies actual document bytes instead of treating every hash as an IPFS photo", async ({ page }) => {
  await page.route(/\/api\/evidence\/[a-f0-9]{64}\/metadata$/, async route => {
    const hash = new URL(route.request().url()).pathname.split("/")[3];
    await route.fulfill({ json: { sha256: hash, mediaType: "image/png", storage: { kind: "local" } } });
  });
  await page.goto("/lots/1");
  const evidence = page.getByRole("region", { name: "Comprobante vinculado al lote" });
  await expect(evidence.getByText("Integridad comprobada: el archivo coincide con el código registrado.", { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(evidence.getByText("Este comprobante no es una imagen compatible. Podés descargarlo para revisarlo.", { exact: true })).toBeVisible();
  await expect(evidence.getByRole("img")).toHaveCount(0);
  await expect(evidence.getByRole("link", { name: "Consultar ubicación IPFS" })).toHaveCount(0);
  await expect(evidence.getByText("Archivo recuperado del almacenamiento local de la demo. No se publicó en IPFS.", { exact: true })).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), evidence.getByRole("link", { name: "Descargar archivo comprobado" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^[a-f0-9]{64}\.bin$/);
});

test("public evidence rejects mismatching bytes even if metadata claims IPFS and an image", async ({ page }) => {
  await page.route(/\/api\/evidence\/[a-f0-9]{64}(?:\/metadata)?$/, async route => {
    if (route.request().url().endsWith("/metadata")) {
      const hash = new URL(route.request().url()).pathname.split("/")[3];
      await route.fulfill({ json: { sha256: hash, mediaType: "image/png", storage: { kind: "ipfs", cid: "bafkreigh2akiscaildc6w453z7w2n6a3mdfcle5phk3fzslpoej3tqt3we" } } });
    } else await route.fulfill({ contentType: "image/png", body: "tampered synthetic evidence" });
  });
  await page.goto("/lots/1");
  const evidence = page.getByRole("region", { name: "Comprobante vinculado al lote" });
  await expect(evidence.getByRole("alert")).toContainText("El archivo recibido no coincide con el código registrado", { timeout: 45_000 });
  await expect(evidence.getByRole("img")).toHaveCount(0);
  await expect(evidence.getByRole("link")).toHaveCount(0);
  await expect(evidence.getByText(/Integridad comprobada:/)).toHaveCount(0);
});

test("public evidence reports unavailable originals and allows a fresh verification", async ({ page }) => {
  let unavailable = true;
  await page.route(/\/api\/evidence\/[a-f0-9]{64}$/, async route => {
    if (unavailable) await route.fulfill({ status: 404, json: { error: "Synthetic test: unavailable" } });
    else await route.continue();
  });
  await page.goto("/lots/1");
  const evidence = page.getByRole("region", { name: "Comprobante vinculado al lote" });
  await expect(evidence.getByRole("status")).toContainText("No se pudo recuperar y comprobar el archivo", { timeout: 45_000 });
  await expect(evidence.getByRole("link", { name: "Descargar archivo comprobado" })).toHaveCount(0);
  unavailable = false;
  await evidence.getByRole("button", { name: "Volver a comprobar archivo" }).click();
  await expect(evidence.getByRole("status")).toContainText("Integridad comprobada:", { timeout: 20_000 });
});
