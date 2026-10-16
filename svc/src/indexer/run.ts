import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { TESTNET_PASSPHRASE } from "../config/environment.js";
import { mergeEvents, publicEventData, readHistory, writeHistory, type History, type TimelineEvent } from "./store.js";

if (process.env.NETWORK_PASSPHRASE !== TESTNET_PASSPHRASE) throw new Error("Testnet only.");
const rpcUrl = process.env.STELLAR_RPC_URL;
if (rpcUrl !== "https://soroban-testnet.stellar.org") throw new Error("Indexer requires the official Testnet RPC.");
const contracts = [process.env.NEXT_PUBLIC_REGISTRY_ID, process.env.NEXT_PUBLIC_VAULT_ID];
if (!contracts.every((id): id is string => !!id && /^C[A-Z2-7]{55}$/.test(id))) throw new Error("Missing contract IDs.");
const fromLedger = Number(process.env.INDEXER_FROM_LEDGER);
if (!Number.isSafeInteger(fromLedger) || fromLedger < 1) throw new Error("INDEXER_FROM_LEDGER must cover contract deployment.");
const path = resolve(process.env.INDEXER_STORAGE_DIR ?? "../.indexer", "history.json");
const server = new rpc.Server(rpcUrl);
let state: History = await readHistory(path) ?? { network: "testnet", contracts, fromLedger, nextLedger: fromLedger, events: [] };
if (JSON.stringify(state.contracts) !== JSON.stringify(contracts) || state.fromLedger !== fromLedger) {
  throw new Error("The read model belongs to another deployment. Use another storage directory.");
}
const once = process.argv.includes("--once");
do {
  try {
    const health = await server.getHealth();
    if (state.nextLedger < health.oldestLedger) throw new Error("History gap: checkpoint predates RPC retention. Restore an archive; do not claim complete history.");
    if (state.nextLedger <= health.latestLedger) {
      let cursor: string | undefined;
      const collected: TimelineEvent[] = [];
      let latest = state.nextLedger - 1;
      do {
        const page = await server.getEvents({
          filters: [{ type: "contract", contractIds: contracts }], limit: 1000,
          ...(cursor ? { cursor } : { startLedger: state.nextLedger }),
        });
        for (const event of page.events) {
          if (!event.inSuccessfulContractCall || !event.contractId) continue;
          const topic: unknown[] = event.topic.map(value => scValToNative(value));
          if (typeof topic[0] !== "string") continue;
          const eventData = publicEventData(scValToNative(event.value));
          // Topic positions are specified in the Rust ABI; no financial calculations here.
          const lotId = typeof topic[1] === "bigint" ? topic[1].toString() : undefined;
          const loanId = lotId && typeof topic[2] === "bigint" ? topic[2].toString() : undefined;
          collected.push({ id: event.id, contractId: event.contractId.contractId(), name: topic[0], lotId, loanId,
            ledger: event.ledger, closedAt: event.ledgerClosedAt, txHash: event.txHash, data: eventData });
        }
        latest = page.latestLedger;
        cursor = page.events.length === 1000 ? page.cursor : undefined;
      } while (cursor);
      state = { ...state, nextLedger: latest + 1, events: mergeEvents(state.events, collected),
        updatedAt: new Date().toISOString(), error: undefined };
      await writeHistory(path, state);
      console.log(`Indexed ${collected.length} confirmed events; covered through ledger ${latest}.`);
    }
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Indexer unavailable.";
    await writeHistory(path, state);
    console.error(state.error);
    if (once) process.exitCode = 1;
  }
  if (!once) await setTimeout(10_000);
} while (!once);
