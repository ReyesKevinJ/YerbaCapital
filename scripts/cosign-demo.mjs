// Synthetic Testnet CLI bridge: CLI 28 cannot discover signers absent from ABI args.
// Secrets come only through this short-lived process environment, never argv/output.
import { Client as RegistryClient, Keypair, contract } from "../packages/registry-client/dist/index.js";
import { Client as VaultClient } from "../packages/vault-client/dist/index.js";

const networkPassphrase = "Test SDF Network ; September 2015";
if (process.env.NETWORK_PASSPHRASE !== networkPassphrase) throw new Error("Testnet only");
const source = Keypair.fromSecret(process.env.DEMO_SOURCE_SECRET ?? "");
const custody = Keypair.fromSecret(process.env.DEMO_CUSTODIAN_SECRET ?? "");
const [method, contractId, encoded] = process.argv.slice(2);
const args = JSON.parse(encoded);
const options = { contractId, networkPassphrase, rpcUrl: "https://soroban-testnet.stellar.org",
  publicKey: source.publicKey(), ...contract.basicNodeSigner(source, networkPassphrase) };
let tx;
if (method === "verify_lot") {
  tx = await new RegistryClient(options).verify_lot({ verifier: source.publicKey(),
    lot_id: BigInt(args.lot_id), net_kg: BigInt(args.net_kg), moisture_bps: Number(args.moisture_bps),
    evidence: Buffer.from(args.evidence, "hex") });
} else if (method === "partial_withdraw") {
  tx = await new VaultClient(options).partial_withdraw({ owner: source.publicKey(),
    loan_id: BigInt(args.loan_id), kg: BigInt(args.kg), evidence: Buffer.from(args.evidence, "hex") });
} else throw new Error("Unsupported demo co-sign operation");
const required = tx.needsNonInvokerSigningBy();
if (required.length !== 1 || required[0] !== custody.publicKey()) throw new Error("Unexpected co-sign authorization");
await tx.signAuthEntries({ address: custody.publicKey(), ...contract.basicNodeSigner(custody, networkPassphrase) });
const sent = await tx.signAndSend();
const hash = sent.sendTransactionResponse?.hash;
if (hash) console.error(hash);
if (sent.getTransactionResponse?.status !== "SUCCESS") throw new Error("Demo transaction confirmation is pending; do not resend");
console.log(JSON.stringify(sent.result.unwrap() ?? null, (_, value) => typeof value === "bigint" ? value.toString() : value));
