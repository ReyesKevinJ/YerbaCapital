import { hashEvidence, verifyEvidence } from "./evidence.js";

async function main(): Promise<void> {
  const [command, path, expected, ...extra] = process.argv.slice(2);
  if (extra.length > 0 || !path ||
      !((command === "hash" && expected === undefined) ||
        (command === "verify" && expected !== undefined))) {
    throw new Error("Usage: evidence hash <file> | evidence verify <file> <sha256>");
  }
  if (command === "hash") {
    console.log(await hashEvidence(path));
    return;
  }
  if (expected === undefined) throw new Error("Missing SHA-256 hash.");
  const matches = await verifyEvidence(path, expected);
  console.log(matches ? "Evidence hash matches." : "Evidence hash mismatch.");
  if (!matches) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Evidence command failed.");
  process.exitCode = 1;
});
