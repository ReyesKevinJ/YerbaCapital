import { randomBytes } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const envFile = new URL(".env", root);
const content = await readFile(envFile, "utf8");
if (/^PILOT_MEMBERS_JSON=.+$/m.test(content)) {
  console.log("Pilot members already configured. No credentials were changed.");
} else {
  const members = ["editor", "reviewer", "observer"].map(role => ({ id: `${role}-demo`, role, token: randomBytes(32).toString("base64url") }));
  const directory = new URL(".stellar/", root);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const access = new URL("pilot-access.json", directory);
  await writeFile(access, JSON.stringify(members, null, 2), { flag: "wx", mode: 0o600 });
  const assignment = `PILOT_MEMBERS_JSON='${JSON.stringify(members)}'`;
  await writeFile(envFile, /^PILOT_MEMBERS_JSON=$/m.test(content) ? content.replace(/^PILOT_MEMBERS_JSON=$/m, assignment) : `${content.trimEnd()}\n\n# Synthetic document-workspace members; never NEXT_PUBLIC_.\n${assignment}\n`, { mode: 0o600 });
  console.log("Configured synthetic pilot members. Private codes: .stellar/pilot-access.json. Restart the evidence service. No codes were printed.");
}
