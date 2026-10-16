import { fileURLToPath } from "node:url";
process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({ testDir: "./e2e", testMatch: ["pilot.spec.ts", "pilot-shared.spec.ts"], workers: 1,
  use: { baseURL: "http://127.0.0.1:3000", channel: "chrome" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "mobile", use: { ...devices["Pixel 7"] } }],
});
