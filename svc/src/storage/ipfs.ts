import { createHash } from "node:crypto";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

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

export function computeIpfsCidV0(sha256Hex: string): string {
  if (!/^[a-f0-9]{64}$/i.test(sha256Hex)) {
    throw new Error("Invalid SHA-256 digest.");
  }
  const sha256Bytes = Buffer.from(sha256Hex, "hex");
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
};

export async function pinToIpfs(bytes: Uint8Array): Promise<IpfsPinResult> {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const ipfsCid = computeIpfsCidV0(sha256);
  return {
    sha256,
    ipfsCid,
    ipfsUri: `ipfs://${ipfsCid}`,
    gatewayUrl: `https://ipfs.io/ipfs/${ipfsCid}`,
    size: bytes.byteLength,
  };
}
