import { loadNetworkConfig } from "../../../lib/stellar/network";
import { evidenceRequest } from "../../../lib/evidence/service";
import { clients } from "../../../lib/stellar/clients";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  let config;
  try {
    config = loadNetworkConfig(process.env);
  } catch {
    return Response.json({ status: "configuration_required", network: "testnet", chainEnabled: false }, { status: 503 });
  }
  let evidenceAvailable = false;
  try {
    const response = await evidenceRequest("/health");
    const health: unknown = await response.json();
    evidenceAvailable = response.ok && !!health && typeof health === "object" &&
      "network" in health && health.network === "testnet" && "status" in health && health.status === "ok";
  } catch { /* The service is reported as unavailable, never as healthy. */ }
  let chainAvailable = false;
  if (config.chainEnabled) {
    try {
      const { registry, vault } = clients();
      const [bound, deployed] = await Promise.all([registry.get_vault(), vault.get_config()]);
      chainAvailable = bound.result === config.vaultId && deployed.result.registry === config.registryId &&
        deployed.result.settlement_asset === config.usdcId;
    } catch { /* Configured IDs alone are not proof that the deployment is available. */ }
  }
  return Response.json({
    status: !evidenceAvailable ? "evidence_unavailable" : config.chainEnabled ? (chainAvailable ? "testnet_ready" : "chain_unavailable") : "offchain_ready",
    network: "testnet",
    chainEnabled: config.chainEnabled,
    components: {
      evidence: evidenceAvailable ? "available" : "unavailable",
      registry: config.chainEnabled ? (chainAvailable ? "available" : "unavailable") : "disabled",
      vault: config.chainEnabled ? (chainAvailable ? "available" : "unavailable") : "disabled",
      generatedClients: "generated",
      indexer: "separate_process_check_lot_history",
      freighter: "browser_wallet_required",
    },
  }, { status: evidenceAvailable && (!config.chainEnabled || chainAvailable) ? 200 : 503 });
}
