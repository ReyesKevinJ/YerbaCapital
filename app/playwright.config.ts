import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    channel: process.env.PLAYWRIGHT_CHROME_CHANNEL,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    { command: "pnpm dev:svc", cwd: root, url: "http://127.0.0.1:3001/health", reuseExistingServer: false, timeout: 60_000 },
    { command: "pnpm dev:app", cwd: root, url: "http://127.0.0.1:3000", reuseExistingServer: false, timeout: 60_000 },
  ],
});
