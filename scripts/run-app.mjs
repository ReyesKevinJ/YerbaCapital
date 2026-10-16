import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];
if (!["dev", "build", "start"].includes(mode)) {
  console.error("Usage: run-app.mjs <dev|build|start>");
  process.exitCode = 1;
} else {
  try {
    // Load before spawning Next: passing --env-file to Next can propagate an invalid NODE_OPTIONS.
    process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
    const cli = fileURLToPath(new URL("../app/node_modules/next/dist/bin/next", import.meta.url));
    // The generated SDK workspace imports trigger a Turbopack dev refresh loop.
    // Webpack keeps local forms/signatures stable; production build stays on Next's default.
    const args = mode === "build" ? [cli, mode] : [cli, mode, "--hostname", "127.0.0.1", ...(mode === "dev" ? ["--webpack"] : [])];
    const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env });
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.once(signal, () => child.kill(signal));
    }
    child.once("error", () => {
      console.error("Could not start Next.js.");
      process.exitCode = 1;
    });
    child.once("exit", (code) => { process.exitCode = code ?? 1; });
  } catch {
    console.error("Could not load the root .env. Run pnpm setup:local and check local configuration.");
    process.exitCode = 1;
  }
}
