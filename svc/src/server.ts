import { loadServiceConfig } from "./config/environment.js";
import { createEvidenceServer } from "./http/server.js";

try {
  const config = loadServiceConfig(process.env);
  const server = createEvidenceServer(config);
  server.on("error", () => {
    console.error("Evidence service could not start.");
    process.exitCode = 1;
  });
  server.listen(config.port, "127.0.0.1", () => {
    console.log(`Evidence service: http://127.0.0.1:${config.port} (Testnet, synthetic files only)`);
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => server.close());
  }
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : "Invalid service configuration.");
  process.exitCode = 1;
}
