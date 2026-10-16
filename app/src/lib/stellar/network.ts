export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export type NetworkConfig = {
  network: "testnet";
  rpcUrl: string;
  chainEnabled: false;
};

/** No contract client exists yet. Do not enable financial operations from configuration alone. */
export function loadNetworkConfig(env: Readonly<Record<string, string | undefined>>): NetworkConfig {
  if (env.NEXT_PUBLIC_NETWORK_PASSPHRASE !== TESTNET_PASSPHRASE) {
    throw new Error("La aplicación requiere Stellar Testnet.");
  }
  const rpcUrl = new URL(env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "");
  if (rpcUrl.protocol !== "https:" || rpcUrl.username || rpcUrl.password) {
    throw new Error("La dirección RPC debe usar HTTPS y no contener credenciales.");
  }
  if (env.NEXT_PUBLIC_CHAIN_ENABLED !== "false") {
    throw new Error("Esta base requiere NEXT_PUBLIC_CHAIN_ENABLED=false; los clientes de contratos están pendientes.");
  }
  return { network: "testnet", rpcUrl: rpcUrl.href, chainEnabled: false };
}
