import { createHash } from "node:crypto";
import { readLimitedBody } from "./upload-auth";
export type IpfsPinResult = { sha256: string; ipfsCid: string; ipfsUri: string; gatewayUrl: string; size: number; mimeType: string; pinnedService: "pinata" };
/** Pinning is only reported after provider acceptance AND retrieval of identical bytes. */
export async function pinToIpfs(bytes: Uint8Array, filename = "inspection", mimeType = "image/jpeg"): Promise<IpfsPinResult> {
  const jwt = process.env.PINATA_JWT?.trim();
  if (!jwt) throw new Error("IPFS pinning is not configured.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(bytes)], { type: mimeType }), filename);
  form.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST", headers: { authorization: `Bearer ${jwt}` }, body: form,
    redirect: "error", signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Pin provider rejected the upload.");
  const data = await response.json() as { IpfsHash?: string };
  if (typeof data.IpfsHash !== "string" || !/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(data.IpfsHash)) throw new Error("Invalid pin provider response.");
  const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  const stored = await fetch(gatewayUrl, { redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!stored.ok) throw new Error("Pinned bytes are not yet retrievable.");
  const downloaded = await readLimitedBody(stored, 5 * 1024 * 1024);
  if (createHash("sha256").update(downloaded).digest("hex") !== sha256) throw new Error("Pinned bytes failed integrity verification.");
  return { sha256, ipfsCid: data.IpfsHash, ipfsUri: `ipfs://${data.IpfsHash}`, gatewayUrl, size: bytes.length, mimeType, pinnedService: "pinata" };
}
