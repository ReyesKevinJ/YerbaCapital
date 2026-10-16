import { loadNetworkConfig } from "../../../lib/stellar/network";
import { evidenceRequest } from "../../../lib/evidence/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    loadNetworkConfig(process.env);
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
  return Response.json({
    status: evidenceAvailable ? "offchain_ready" : "evidence_unavailable",
    network: "testnet",
    chainEnabled: false,
    components: {
      evidence: evidenceAvailable ? "available" : "unavailable",
      registry: "not_implemented",
      vault: "not_implemented",
      generatedClients: "not_generated",
      indexer: "not_implemented",
      freighter: "not_integrated",
    },
  }, { status: evidenceAvailable ? 200 : 503 });
}
