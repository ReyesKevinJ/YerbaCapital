import { pilotHandler } from "../pilot/http.js";
import { PilotError } from "../pilot/model.js";
import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { ServiceConfig } from "../config/environment.js";
import { EvidenceIntegrityError, EvidenceStore } from "../storage/evidence-store.js";
import { readHistory } from "../indexer/store.js";

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function createEvidenceServer(config: ServiceConfig) {
  const store = new EvidenceStore(config.storageDirectory);
  const handlePilot = pilotHandler(config.storageDirectory, config.pilotMembers ?? []);
  const tokenDigest = createHash("sha256").update(`Bearer ${config.accessToken}`).digest();
  const server = createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
      if (response.headersSent || response.destroyed) {
        response.destroy();
        return;
      }
      if (error instanceof RequestError || error instanceof PilotError) {
        request.resume();
        json(response, error.status, { error: error.message });
      } else if (error instanceof EvidenceIntegrityError) {
        json(response, 409, { error: "Evidence integrity check failed." });
      } else {
        // Do not expose paths, request bytes, tokens or private evidence in logs/responses.
        console.error("Evidence request failed.");
        json(response, 500, { error: "Evidence service unavailable." });
      }
    });
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, {
        service: "evidence",
        status: "ok",
        network: "testnet",
        scope: "local-synthetic-evidence",
        attestsPhysicalFacts: false,
      });
      return;
    }
    if (url.pathname === "/pilot" || url.pathname.startsWith("/pilot/")) {
      await handlePilot(request, response, url.pathname);
      return;
    }
    const provided = createHash("sha256").update(request.headers.authorization ?? "").digest();
    if (!timingSafeEqual(tokenDigest, provided)) {
      response.setHeader("WWW-Authenticate", "Bearer");
      throw new RequestError(401, "Evidence access requires authorization.");
    }
    const historyMatch = /^\/lots\/([1-9]\d*)\/history$/.exec(url.pathname);
    if (request.method === "GET" && historyMatch) {
      const history = config.historyPath ? await readHistory(config.historyPath) : undefined;
      if (!history) throw new RequestError(503, "Indexer is not initialized.");
      json(response, 200, { ...history, events: history.events.filter(event => event.lotId === historyMatch[1]) });
      return;
    }
    if (request.method === "POST" && url.pathname === "/evidence") {
      if (request.headers["content-type"]?.split(";")[0]?.trim() !== "application/octet-stream") {
        throw new RequestError(415, "Send exact evidence bytes as application/octet-stream.");
      }
      const bytes = await readBody(request, config.maxEvidenceBytes);
      const reference = await store.put(bytes);
      response.setHeader("Location", reference.uri);
      json(response, 201, reference);
      return;
    }
    const match = /^\/evidence\/([a-f0-9]{64})$/.exec(url.pathname);
    const sha256 = match?.[1];
    if (request.method === "GET" && sha256) {
      const bytes = await store.get(sha256);
      if (!bytes) throw new RequestError(404, "Evidence not found.");
      response.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sha256}.bin"`,
        "Content-Length": bytes.byteLength,
      });
      response.end(bytes);
      return;
    }
    throw new RequestError(404, "Route not found.");
  }
  return server;
}

async function readBody(request: IncomingMessage, maximum: number): Promise<Buffer> {
  const declared = request.headers["content-length"];
  if (declared && Number(declared) > maximum) throw new RequestError(413, "Evidence exceeds the upload limit.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > maximum) throw new RequestError(413, "Evidence exceeds the upload limit.");
    chunks.push(bytes);
  }
  if (size === 0) throw new RequestError(400, "Evidence must not be empty.");
  return Buffer.concat(chunks, size);
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}
