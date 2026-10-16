import { resolve } from "node:path";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export type ServiceConfig = {
  networkPassphrase: typeof TESTNET_PASSPHRASE;
  rpcUrl: string;
  port: number;
  storageDirectory: string;
  accessToken: string;
  maxEvidenceBytes: number;
};

/** Read operational configuration only; roles and financial state belong on-chain. */
export function loadServiceConfig(env: Readonly<Record<string, string | undefined>>): ServiceConfig {
  if (env.NETWORK_PASSPHRASE !== TESTNET_PASSPHRASE) {
    throw new Error("NETWORK_PASSPHRASE must identify Stellar Testnet.");
  }
  const rpcUrl = new URL(required(env, "STELLAR_RPC_URL"));
  if (rpcUrl.protocol !== "https:") {
    throw new Error("STELLAR_RPC_URL must use HTTPS.");
  }
  if (rpcUrl.username || rpcUrl.password) {
    throw new Error("STELLAR_RPC_URL must not contain credentials.");
  }
  const accessToken = required(env, "EVIDENCE_ACCESS_TOKEN");
  if (!/^[A-Za-z0-9_-]{32,}$/.test(accessToken)) {
    throw new Error("EVIDENCE_ACCESS_TOKEN must contain at least 32 URL-safe characters.");
  }
  return {
    networkPassphrase: TESTNET_PASSPHRASE,
    rpcUrl: rpcUrl.href,
    port: boundedInteger(env.EVIDENCE_PORT ?? "3001", "EVIDENCE_PORT", 1, 65535),
    storageDirectory: resolve(required(env, "EVIDENCE_STORAGE_DIR")),
    accessToken,
    maxEvidenceBytes: boundedInteger(env.EVIDENCE_MAX_BYTES ?? "5242880", "EVIDENCE_MAX_BYTES", 1, 20 * 1024 * 1024),
  };
}

function required(env: Readonly<Record<string, string | undefined>>, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function boundedInteger(value: string, name: string, minimum: number, maximum: number): number {
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be an integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}
