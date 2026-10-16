import { Client as RegistryClient } from "registry-client";
import { Client as VaultClient } from "vault-client";
import { Client as SettlementClient } from "settlement-client";
import type { ClientOptions } from "@stellar/stellar-sdk/contract";
import { loadNetworkConfig, TESTNET_PASSPHRASE } from "./network";

export function publicNetwork() {
  // Next.js substitutes only direct NEXT_PUBLIC references in browser bundles.
  return loadNetworkConfig({
    NEXT_PUBLIC_NETWORK_PASSPHRASE: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE,
    NEXT_PUBLIC_STELLAR_RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
    NEXT_PUBLIC_CHAIN_ENABLED: process.env.NEXT_PUBLIC_CHAIN_ENABLED,
    NEXT_PUBLIC_REGISTRY_ID: process.env.NEXT_PUBLIC_REGISTRY_ID,
    NEXT_PUBLIC_VAULT_ID: process.env.NEXT_PUBLIC_VAULT_ID,
    NEXT_PUBLIC_USDC_ID: process.env.NEXT_PUBLIC_USDC_ID,
  });
}

export function clients(wallet: Pick<ClientOptions, "publicKey" | "signTransaction" | "signAuthEntry"> = {}) {
  const config = publicNetwork();
  if (!config.chainEnabled || !config.registryId || !config.vaultId || !config.usdcId) {
    throw new Error("La integración con Testnet está deshabilitada.");
  }
  const options = { ...wallet, rpcUrl: config.rpcUrl, networkPassphrase: TESTNET_PASSPHRASE };
  return {
    registry: new RegistryClient({ ...options, contractId: config.registryId }),
    vault: new VaultClient({ ...options, contractId: config.vaultId }),
    settlement: new SettlementClient({ ...options, contractId: config.usdcId }),
  };
}
