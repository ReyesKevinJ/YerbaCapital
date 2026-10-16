import { join } from "node:path";
import { loadServiceConfig } from "../config/environment.js";
import { backupPilot, verifyPilotBackup } from "./backup.js";
try {
  const [command, destination] = process.argv.slice(2);
  if (!destination || !["create", "verify"].includes(command ?? "")) throw new Error("Usage: pilot:backup create|verify <private-directory>");
  const config = loadServiceConfig(process.env);
  const revision = command === "create" ? await backupPilot(join(config.storageDirectory, "pilot"), destination) : await verifyPilotBackup(destination);
  console.log(`Synthetic pilot backup verified at revision ${revision}. Files and credentials were not printed.`);
} catch {
  console.error("Backup failed. Check destination, workspace lock and integrity; existing backups were not overwritten.");
  process.exitCode = 1;
}
