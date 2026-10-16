import { evidenceServiceConfig, localAppOrigin } from "./lib/evidence/service";
import { loadNetworkConfig } from "./lib/stellar/network";

export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    loadNetworkConfig(process.env);
    evidenceServiceConfig(process.env);
    localAppOrigin(process.env);
  }
}
