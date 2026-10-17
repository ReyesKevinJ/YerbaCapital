import { StrKey } from "@stellar/stellar-sdk";
import { pinToIpfs } from "../../../../lib/evidence/ipfs";
import { evidenceRequest } from "../../../../lib/evidence/service";
import { clients, publicNetwork } from "../../../../lib/stellar/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory cache for IPFS metadata lookup by SHA-256 digest
const ipfsRegistry = new Map<
  string,
  {
    sha256: string;
    ipfsCid: string;
    ipfsUri: string;
    gatewayUrl: string;
    filename: string;
    mimeType: string;
    pinnedAt: string;
  }
>();

export function getIpfsMetadata(sha256: string) {
  return ipfsRegistry.get(sha256);
}

export function registerIpfsMetadata(data: {
  sha256: string;
  ipfsCid: string;
  ipfsUri: string;
  gatewayUrl: string;
  filename: string;
  mimeType: string;
  pinnedAt: string;
}) {
  ipfsRegistry.set(data.sha256, data);
}

/**
 * Dedicated IPFS upload endpoint restricted exclusively to authenticated Verifiers.
 * Physical inspection images are pinned to IPFS, hashed via SHA-256, and stored for on-chain anchoring.
 */
export async function POST(request: Request): Promise<Response> {
  // 1. Role Authentication & Authorization
  const verifierAddress =
    request.headers.get("x-verifier-address")?.trim() ||
    new URL(request.url).searchParams.get("verifier")?.trim();

  if (!verifierAddress || !StrKey.isValidEd25519PublicKey(verifierAddress)) {
    return Response.json(
      {
        error:
          "Acceso denegado: se requiere la dirección pública de una cuenta con rol de Verificador.",
      },
      { status: 401 }
    );
  }

  const network = publicNetwork();
  if (network.chainEnabled) {
    try {
      const registryClient = clients().registry;
      const roleCheck = await registryClient.has_role({
        address: verifierAddress,
        role: { tag: "Verifier", values: undefined },
      });
      const isVerifier = roleCheck.result;
      if (!isVerifier) {
        return Response.json(
          {
            error:
              "Acceso denegado: la cuenta informada no posee el rol autorizado de Verificador en el contrato.",
          },
          { status: 403 }
        );
      }
    } catch {
      return Response.json(
        {
          error:
            "No se pudo comprobar la autorización del Verificador en la red de Stellar.",
        },
        { status: 503 }
      );
    }
  }

  // 2. File Intake
  const contentType = request.headers.get("content-type") ?? "";
  let fileBytes: Uint8Array;
  let filename = "inspeccion-lote.jpg";
  let mimeType = "image/jpeg";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const fileEntry = formData.get("file");
      if (!fileEntry || typeof fileEntry === "string") {
        return Response.json(
          { error: "Seleccioná un archivo de imagen de la inspección." },
          { status: 400 }
        );
      }
      filename = (fileEntry as File).name || filename;
      mimeType = (fileEntry as File).type || mimeType;
      fileBytes = new Uint8Array(await (fileEntry as File).arrayBuffer());
    } catch {
      return Response.json(
        { error: "Formato de datos multipart inválido." },
        { status: 400 }
      );
    }
  } else if (
    contentType === "application/octet-stream" ||
    contentType.startsWith("image/")
  ) {
    const buffer = await request.arrayBuffer();
    fileBytes = new Uint8Array(buffer);
    mimeType = contentType.startsWith("image/") ? contentType : "image/jpeg";
  } else {
    return Response.json(
      {
        error:
          "Tipo de contenido no admitido. Enviá un archivo en multipart/form-data o image/jpeg / png.",
      },
      { status: 415 }
    );
  }

  if (fileBytes.byteLength === 0) {
    return Response.json({ error: "El archivo está vacío." }, { status: 400 });
  }

  const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MiB
  if (fileBytes.byteLength > MAX_IMAGE_BYTES) {
    return Response.json(
      { error: "La imagen de inspección no puede superar los 10 MiB." },
      { status: 413 }
    );
  }

  // 3. Pin to IPFS & calculate SHA-256 for on-chain proof
  try {
    const pinResult = await pinToIpfs(fileBytes, filename, mimeType);

    // Save to local evidence storage service for fast serving & backup
    try {
      await evidenceRequest("/evidence", {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: Buffer.from(fileBytes),
      });
    } catch {
      // Non-fatal if local evidence service is running independently or in cloud
    }

    const pinnedAt = new Date().toISOString();
    registerIpfsMetadata({
      sha256: pinResult.sha256,
      ipfsCid: pinResult.ipfsCid,
      ipfsUri: pinResult.ipfsUri,
      gatewayUrl: pinResult.gatewayUrl,
      filename,
      mimeType,
      pinnedAt,
    });

    return Response.json(
      {
        sha256: pinResult.sha256,
        ipfsCid: pinResult.ipfsCid,
        ipfsUri: pinResult.ipfsUri,
        gatewayUrl: pinResult.gatewayUrl,
        uri: `/api/evidence/${pinResult.sha256}`,
        filename,
        size: pinResult.size,
        mimeType: pinResult.mimeType,
        pinnedService: pinResult.pinnedService,
        verifier: verifierAddress,
      },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { error: "No se pudo anclar la imagen de inspección en IPFS." },
      { status: 502 }
    );
  }
}

/** Retrieve IPFS metadata by SHA-256 hash */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    return Response.json({ error: "Hash SHA-256 inválido." }, { status: 400 });
  }

  const meta = getIpfsMetadata(hash.toLowerCase());
  if (!meta) {
    const { computeIpfsCidV0 } = await import("../../../../lib/evidence/ipfs");
    const ipfsCid = computeIpfsCidV0(hash.toLowerCase());
    return Response.json({
      sha256: hash.toLowerCase(),
      ipfsCid,
      ipfsUri: `ipfs://${ipfsCid}`,
      gatewayUrl: `https://ipfs.io/ipfs/${ipfsCid}`,
      uri: `/api/evidence/${hash.toLowerCase()}`,
    });
  }

  return Response.json(meta);
}
