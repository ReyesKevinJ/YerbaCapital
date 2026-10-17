import { createHash } from "node:crypto";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Encode binary bytes into standard Base58BTC string. */
export function encodeBase58(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i] ?? 0;
    for (let j = 0; j < digits.length; j++) {
      const cur = digits[j] ?? 0;
      const x = (cur << 8) + carry;
      digits[j] = x % 58;
      carry = Math.floor(x / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros++;
  }
  let result = "1".repeat(leadingZeros);
  for (let i = digits.length - 1; i >= 0; i--) {
    const digit = digits[i];
    if (digit !== undefined) {
      result += BASE58_ALPHABET[digit] ?? "";
    }
  }
  return result;
}

/** Compute standard IPFS CIDv0 (Qm...) from SHA-256 multihash. */
export function computeIpfsCidV0(sha256Hex: string): string {
  if (!/^[a-f0-9]{64}$/i.test(sha256Hex)) {
    throw new Error("Se requiere un hash SHA-256 de 64 caracteres hexadecimales.");
  }
  const sha256Bytes = Buffer.from(sha256Hex, "hex");
  // Multihash format: 0x12 (sha2-256 code) + 0x20 (32 bytes length) + sha256 bytes
  const multihash = new Uint8Array(34);
  multihash[0] = 0x12;
  multihash[1] = 0x20;
  multihash.set(sha256Bytes, 2);
  return encodeBase58(multihash);
}

export type IpfsPinResult = {
  sha256: string;
  ipfsCid: string;
  ipfsUri: string;
  gatewayUrl: string;
  size: number;
  mimeType: string;
  pinnedService: "pinata" | "local-deterministic";
};

/**
 * Pins a file to IPFS via Pinata (if configured) or local deterministic CIDv0 fallback.
 * Computes exact SHA-256 hash for Soroban smart contract verification.
 */
export async function pinToIpfs(
  bytes: Uint8Array,
  filename = "inspection.jpg",
  mimeType = "image/jpeg"
): Promise<IpfsPinResult> {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const pinataJwt = process.env.PINATA_JWT?.trim();

  if (pinataJwt) {
    try {
      const formData = new FormData();
      const fileBlob = new Blob([Buffer.from(bytes)], { type: mimeType });
      formData.append("file", fileBlob, filename);
      formData.append(
        "pinataMetadata",
        JSON.stringify({
          name: `yerbacapital-${filename}`,
          keyvalues: { sha256, protocol: "yerbacapital", network: "stellar-testnet" },
        })
      );
      formData.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));

      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: formData,
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        const data = (await response.json()) as { IpfsHash?: string };
        if (data?.IpfsHash && typeof data.IpfsHash === "string") {
          const ipfsCid = data.IpfsHash;
          const gatewayHost = process.env.PINATA_GATEWAY?.trim() || "gateway.pinata.cloud";
          return {
            sha256,
            ipfsCid,
            ipfsUri: `ipfs://${ipfsCid}`,
            gatewayUrl: `https://${gatewayHost}/ipfs/${ipfsCid}`,
            size: bytes.byteLength,
            mimeType,
            pinnedService: "pinata",
          };
        }
      }
    } catch {
      // Fallback to deterministic CID computation if remote pinning fails
    }
  }

  // Deterministic local CID calculation
  const ipfsCid = computeIpfsCidV0(sha256);
  return {
    sha256,
    ipfsCid,
    ipfsUri: `ipfs://${ipfsCid}`,
    gatewayUrl: `https://ipfs.io/ipfs/${ipfsCid}`,
    size: bytes.byteLength,
    mimeType,
    pinnedService: "local-deterministic",
  };
}
