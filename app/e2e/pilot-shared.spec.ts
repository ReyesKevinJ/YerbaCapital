import { expect, test, type Page } from "@playwright/test";

function memberToken(role: string): string {
  const members = JSON.parse(process.env.PILOT_MEMBERS_JSON ?? "[]") as { role: string; token: string }[];
  const member = members.find(m => m.role === role);
  if (!member) throw new Error("Falta configurar integrantes sintéticos para el test compartido.");
  return member.token;
}
async function login(page: Page, role: string) {
  await page.goto("/pilot");
  await page.getByLabel("Código de integrante").fill(memberToken(role));
  await page.getByRole("button", { name: "Ingresar al expediente" }).click();
  await expect(page.getByRole("heading", { name: "Cobertura del expediente" })).toBeVisible();
}

test("team edits, independently reviews and downloads private evidence; observer cannot mutate", async ({ page, browser }) => {
  const title = `Acuerdo sintético ${crypto.randomUUID()}`;
  await login(page, "editor");
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Responsable (alias de prueba)").fill("custodian-demo");
  await page.getByLabel("Categoría", { exact: true }).selectOption("custody");
  await page.getByLabel("Estado documental").selectOption("InReview");
  await page.getByRole("checkbox", { name: "Identificación, segregación y control de inventario" }).check();
  await page.getByRole("checkbox", { name: "Responsabilidades, salidas y gravámenes externos" }).check();
  await page.getByLabel("Documento sintético (hasta 5 MiB)").setInputFiles({ name: "synthetic.txt", mimeType: "text/plain", buffer: Buffer.from("private pilot synthetic document") });
  await page.getByRole("button", { name: "Guardar acuerdo", exact: true }).click();
  const article = page.getByRole("article", { name: title });
  await expect(article).toContainText("En revisión");
  const href = await article.getByRole("link", { name: /Descargar documento/ }).getAttribute("href");
  expect(href).toBeTruthy();
  const [download] = await Promise.all([page.waitForEvent("download"), article.getByRole("link", { name: /Descargar documento/ }).click()]);
  const stream = await download.createReadStream();
  if (!stream) throw new Error("Falta descarga.");
  const chunks: Buffer[] = []; for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString()).toBe("private pilot synthetic document");
  const anonymous = await browser.newContext();
  try { expect((await anonymous.request.get(`http://127.0.0.1:3000${href}`)).status()).toBe(401); }
  finally { await anonymous.close(); }
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, "reviewer");
  await page.getByRole("button", { name: `Revisar ${title}`, exact: true }).click();
  await expect(article).toContainText("Revisado por:");
  await expect(page.getByRole("region", { name: "Historial documental" })).toContainText("Acuerdo revisado");
  await article.getByText("Comentarios y correcciones (0)", { exact: true }).click();
  await article.getByLabel(`Comentario para ${title}`, { exact: true }).fill("Revisar condiciones de salida");
  await article.getByLabel(`Tipo de comentario para ${title}`).selectOption("ChangesRequested");
  await article.getByRole("button", { name: "Enviar comentario" }).click();
  await expect(article).toContainText("Borrador");
  await expect(article).toContainText("Revisar condiciones de salida");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, "editor");
  await article.getByRole("button", { name: `Editar ${title}`, exact: true }).click();
  await page.getByLabel("Vigencia del acuerdo hasta").fill("2000-01-01");
  await page.getByRole("button", { name: "Guardar acuerdo", exact: true }).click();
  await expect(article).toContainText("Vencido: requiere actualización");
  await article.getByRole("button", { name: `Editar ${title}`, exact: true }).click();
  await page.getByLabel("Vigencia del acuerdo hasta").fill("2099-01-01");
  await page.getByLabel("Estado documental").selectOption("InReview");
  await page.getByLabel("Documento sintético (hasta 5 MiB)").setInputFiles({ name: "revision.txt", mimeType: "text/plain", buffer: Buffer.from("revised private synthetic document") });
  await page.getByRole("button", { name: "Guardar acuerdo", exact: true }).click();
  await expect(article).toContainText("Versiones de la documentación (2)");
  await expect(article.getByRole("link", { name: /Descargar documento/ })).toHaveCount(2);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, "reviewer");
  await page.getByRole("button", { name: `Revisar ${title}`, exact: true }).click();
  await expect(article).toContainText("Revisado por:");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, "observer");
  await expect(article).toContainText("Revisado");
  await expect(page.getByRole("button", { name: "Guardar acuerdo", exact: true })).toHaveCount(0);
  const response = await page.evaluate(async () => {
    const result = await fetch("/api/pilot/agreements", { method: "POST", headers: { "content-type": "application/json", "if-match": "0" }, body: "{}" });
    return result.status;
  });
  expect(response).toBe(403);
  await page.reload(); await expect(article).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("pilot-shared.png"), fullPage: true });
  await page.emulateMedia({ media: "print" });
  const report = page.getByRole("region", { name: "Resumen imprimible del piloto" });
  await expect(report).toBeVisible();
  await expect(report).toContainText(title);
  await expect(report).toContainText("Revisar condiciones de salida");
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeHidden();
  const pdf = await page.pdf({ path: test.info().outputPath("pilot-summary.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
});

test("invalid login creates no session and writes reject a foreign origin", async ({ page }) => {
  await page.goto("/pilot");
  await page.getByLabel("Código de integrante").fill("x".repeat(43));
  await page.getByRole("button", { name: "Ingresar al expediente" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("no autorizado");
  expect((await page.request.get("/api/pilot/dossier")).status()).toBe(401);
  expect((await page.request.post("/api/pilot/session", { headers: { origin: "https://other.example" }, data: { token: memberToken("editor") } })).status()).toBe(403);
});
