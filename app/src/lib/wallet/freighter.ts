import * as freighter from "@stellar/freighter-api";
import type { SignAuthEntry, SignTransaction } from "@stellar/stellar-sdk/contract";
import { TESTNET_PASSPHRASE } from "../stellar/network";
import { connectFreighter } from "./connection";

export async function assertWalletNetwork(): Promise<void> {
  const network = await freighter.getNetwork();
  if (network.error) throw new Error(network.error.message);
  if (network.networkPassphrase !== TESTNET_PASSPHRASE) throw new Error("Cambiá Freighter a Stellar Testnet antes de firmar.");
}

export async function connectWallet(): Promise<string> {
  return connectFreighter(freighter, TESTNET_PASSPHRASE);
}

export function walletSigners(address: string) {
  const signTransaction: SignTransaction = async (xdr, options) => {
    await assertWalletNetwork();
    const current = await freighter.getAddress();
    if (current.address !== address) throw new Error("La cuenta cambió; reconectá antes de firmar.");
    const result = await freighter.signTransaction(xdr, { ...options, address, networkPassphrase: TESTNET_PASSPHRASE });
    if (result.error) throw new Error(result.error.message);
    if (result.signerAddress !== address || !result.signedTxXdr) throw new Error("La firma no corresponde a la cuenta conectada.");
    return result;
  };
  const signAuthEntry: SignAuthEntry = async (entry, options) => {
    await assertWalletNetwork();
    const current = await freighter.getAddress();
    if (current.address !== address) throw new Error("La cuenta cambió; reconectá antes de co-firmar.");
    const result = await freighter.signAuthEntry(entry, { ...options, address, networkPassphrase: TESTNET_PASSPHRASE });
    if (result.error) throw new Error(result.error.message);
    if (result.signerAddress !== address || !result.signedAuthEntry) throw new Error("No se obtuvo una co-firma válida.");
    return { ...result, signedAuthEntry: result.signedAuthEntry };
  };
  return { publicKey: address, signTransaction, signAuthEntry };
}

/** Off-chain SEP-53 proof of this key for a single evidence upload; never signs a transaction. */
export async function signEvidenceMessage(address: string, message: string): Promise<string> {
  await assertWalletNetwork();
  const current = await freighter.getAddress();
  if (current.error || current.address !== address) throw new Error("La cuenta cambió; reconectá antes de autorizar.");
  const result = await freighter.signMessage(message, { address, networkPassphrase: TESTNET_PASSPHRASE });
  if (result.error) throw new Error(result.error.message);
  if (result.signerAddress !== address || !result.signedMessage) throw new Error("No se obtuvo una firma válida de la cuenta conectada.");
  return typeof result.signedMessage === "string" ? result.signedMessage : result.signedMessage.toString("base64");
}
