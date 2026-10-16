import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** Opt-in read-only Testnet/browser checks. App, evidence and indexer must already run. */
export default defineConfig({ ...base, testIgnore: [], testMatch: "**/testnet.spec.ts", webServer: undefined });
