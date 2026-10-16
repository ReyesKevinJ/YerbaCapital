import { StrKey } from "@stellar/stellar-sdk";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export type NetworkConfig = {
  network: "testnet";
  rpcUrl: string;
  chainEnabled: boolean;
  registryId?: string;
  vaultId?: string;
  usdcId?: string;
};

/** Explicit Testnet configuration; IDs alone do not enable transactions. */
export function loadNetworkConfig(env: Readonly<Record<string, string | undefined>>): NetworkConfig {
  if (env.NEXT_PUBLIC_NETWORK_PASSPHRASE !== TESTNET_PASSPHRASE) {
    throw new Error("La aplicación requiere Stellar Testnet.");
  }
  const rpcUrl = new URL(env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "");
  if (rpcUrl.protocol !== "https:" || rpcUrl.username || rpcUrl.password) {
    throw new Error("La dirección RPC debe usar HTTPS y no contener credenciales.");
  }
  if (!["true", "false"].includes(env.NEXT_PUBLIC_CHAIN_ENABLED ?? "")) {
    throw new Error("Configurá NEXT_PUBLIC_CHAIN_ENABLED explícitamente.");
  }
  const chainEnabled = env.NEXT_PUBLIC_CHAIN_ENABLED === "true";
  const registryId = env.NEXT_PUBLIC_REGISTRY_ID;
  const vaultId = env.NEXT_PUBLIC_VAULT_ID;
  const usdcId = env.NEXT_PUBLIC_USDC_ID;
  if (chainEnabled && (![registryId, vaultId, usdcId].every(id => id && StrKey.isValidContract(id)) ||
      new Set([registryId, vaultId, usdcId]).size !== 3)) {
    throw new Error("Faltan direcciones de los contratos de Testnet.");
  }
  if (chainEnabled && rpcUrl.href !== "https://soroban-testnet.stellar.org/") {
    throw new Error("Esta demo requiere el RPC oficial de Stellar Testnet.");
  }
  return { network: "testnet", rpcUrl: rpcUrl.href, chainEnabled, registryId, vaultId, usdcId };
}
