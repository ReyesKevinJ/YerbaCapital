import * as freighter from "@stellar/freighter-api";
import type { SignAuthEntry, SignTransaction } from "@stellar/stellar-sdk/contract";
import { TESTNET_PASSPHRASE } from "../stellar/network";

export async function assertWalletNetwork(): Promise<void> {
  const network = await freighter.getNetwork();
  if (network.error) throw new Error(network.error.message);
  if (network.networkPassphrase !== TESTNET_PASSPHRASE) throw new Error("Cambiá Freighter a Stellar Testnet antes de firmar.");
}

export async function connectWallet(): Promise<string> {
  const installed = await freighter.isConnected();
  if (!installed.isConnected) throw new Error("Instalá o desbloqueá Freighter para conectar una cuenta de Testnet.");
  const access = await freighter.requestAccess();
  if (access.error) throw new Error(access.error.message);
  await assertWalletNetwork();
  const account = await freighter.getAddress();
  if (account.error || !account.address) throw new Error(account.error?.message ?? "No se obtuvo la cuenta.");
  return account.address;
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
