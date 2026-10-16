import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const template = await readFile(new URL(".env.example", root), "utf8");
const content = template.replace(/^EVIDENCE_ACCESS_TOKEN=$/m, `EVIDENCE_ACCESS_TOKEN=${randomBytes(32).toString("base64url")}`);
try {
  await writeFile(new URL(".env", root), content, { flag: "wx", mode: 0o600 });
  console.log("Created private .env for local Testnet development. No existing file was overwritten.");
} catch (error) {
  if (error instanceof Error && "code" in error && error.code === "EEXIST") {
    console.error("A .env already exists. Keep it and configure any missing values using .env.example.");
    process.exitCode = 1;
  } else {
    throw error;
  }
}
