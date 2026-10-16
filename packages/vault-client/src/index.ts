import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





export interface Loan {
  borrower: string;
  duration_secs: u64;
  exposure_at_claim: i128;
  funded_at: u64;
  id: u64;
  interest_due: i128;
  last_accrued_at: u64;
  lender: Option<string>;
  lot_id: u64;
  maturity: u64;
  policy: VaultParams;
  principal: i128;
  principal_outstanding: i128;
  rate_bps: u32;
  status: LoanStatus;
}

export type LoanStatus = {tag: "Requested", values: void} | {tag: "Cancelled", values: void} | {tag: "Funded", values: void} | {tag: "PartiallyRepaid", values: void} | {tag: "Repaid", values: void} | {tag: "Defaulted", values: void} | {tag: "Liquidated", values: void};


export interface VaultConfig {
  admin: string;
  paused: boolean;
  registry: string;
  settlement_asset: string;
}


export interface VaultParams {
  base_haircut_bps: u32;
  drift_risk_bps: u32;
  edge_risk_bps: u32;
  grace_period_secs: u64;
  max_accelerated_duration_secs: u64;
  max_ltv_bps: u32;
  max_natural_duration_secs: u64;
  max_rate_bps: u32;
  moisture_edge_bps: u32;
  valuation_max_age_secs: u64;
}








export const Errors = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotAuthorized"},
  3: {message:"RoleMissing"},
  4: {message:"RoleConflict"},
  5: {message:"LotNotFound"},
  6: {message:"InvalidLotStatus"},
  7: {message:"MoistureOutOfBand"},
  8: {message:"WeightInvalid"},
  9: {message:"EvidenceMissing"},
  10: {message:"ReceiptLocked"},
  11: {message:"NotReceiptOwner"},
  12: {message:"LotImpaired"},
  13: {message:"ValuationStale"},
  14: {message:"ExceedsMaxPrincipal"},
  15: {message:"LoanNotFound"},
  16: {message:"InvalidLoanStatus"},
  17: {message:"NotMatured"},
  18: {message:"AmountInvalid"},
  19: {message:"MathOverflow"},
  20: {message:"ParamOutOfBounds"},
  21: {message:"Paused"},
  22: {message:"WithdrawalBreaksLtv"},
  23: {message:"OnlyVault"},
  24: {message:"UnsupportedCommodity"},
  25: {message:"VaultNotConfigured"},
  26: {message:"VaultAlreadyConfigured"},
  27: {message:"InvalidDuration"},
  28: {message:"InvalidAddress"}
}

export interface Client {
  /**
   * Construct and simulate a fund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Fund once with lender auth, transferring the configured SAC directly to borrower.
   * Emits LoanFunded. Errors: Paused, InvalidLoanStatus, InvalidAddress, ExceedsMaxPrincipal,
   * risk/registry errors; SAC failures roll back all effects.
   */
  fund: ({lender, loan_id}: {lender: string, loan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a repay transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Repay with payer auth until claim, interest first; cap transfer at actual debt.
   * Requires a prior bounded SAC allowance for this vault as spender (ADR-011).
   * Emits LoanRepaid and CollateralUnlocked on full payment. Errors: AmountInvalid,
   * InvalidLoanStatus, InvalidAddress, MathOverflow; SAC failures roll back all effects.
   */
  repay: ({payer, loan_id, amount}: {payer: string, loan_id: u64, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a debt_of transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public debt at ledger time, or frozen claim exposure; no auth or events.
   * Errors: LoanNotFound, MathOverflow. Liquidated exposure cannot be collected again on-chain.
   */
  debt_of: ({loan_id}: {loan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public vault revision 0.3 (bounded repayment allowance); no auth or events.
   */
  version: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_loan transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public loan query; no auth or events. Error: LoanNotFound.
   */
  get_loan: ({loan_id}: {loan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Loan>>>

  /**
   * Construct and simulate a get_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public immutable references and pause flag; no auth or events.
   */
  get_config: (options?: MethodOptions) => Promise<AssembledTransaction<VaultConfig>>

  /**
   * Construct and simulate a get_params transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public current policy for new requests; no auth or events.
   */
  get_params: (options?: MethodOptions) => Promise<AssembledTransaction<VaultParams>>

  /**
   * Construct and simulate a set_params transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set bounded policy for future requests with admin auth. Emits ParamsUpdated.
   * Errors: NotAuthorized, ParamOutOfBounds. Does not rewrite existing loans.
   */
  set_params: ({admin, params}: {admin: string, params: VaultParams}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_paused transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pause only new requests/funding with admin auth. Emits ParamsUpdated.
   * Error: NotAuthorized. Repayment, cancellation and claims remain available.
   */
  set_paused: ({admin, paused}: {admin: string, paused: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a mark_default transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Declare default with caller auth, no privileged role, after grace or attested impairment.
   * Emits LoanDefaulted without changing ownership. Errors: InvalidLoanStatus, NotMatured, MathOverflow.
   */
  mark_default: ({caller, loan_id}: {caller: string, loan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a request_loan transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Request debt against an owned eligible receipt with borrower auth; locks once.
   * Emits LoanRequested + CollateralLocked. Errors: Paused, NotReceiptOwner, RoleConflict,
   * InvalidDuration, AmountInvalid, ExceedsMaxPrincipal and registry/risk errors.
   */
  request_loan: ({borrower, lot_id, principal, rate_bps, duration_secs}: {borrower: string, lot_id: u64, principal: i128, rate_bps: u32, duration_secs: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a max_principal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public capacity for a new request under current policy; no auth or events.
   * Errors: registry/risk errors and MathOverflow.
   */
  max_principal: ({lot_id}: {lot_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a cancel_request transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cancel an unfunded request with borrower auth, even after impairment or pause.
   * Emits LoanCancelled + CollateralUnlocked. Errors: NotReceiptOwner, InvalidLoanStatus.
   */
  cancel_request: ({borrower, loan_id}: {borrower: string, loan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a claim_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claim once with the loan's lender auth after Defaulted; never transfers USDC.
   * Emits CollateralClaimed + ReceiptTransferred. Errors: NotAuthorized, InvalidLoanStatus,
   * MathOverflow; registry failures roll back all effects. Physical recovery remains off-chain.
   */
  claim_collateral: ({lender, loan_id}: {lender: string, loan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a partial_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw pledged mass with owner + custodian auth and a fresh collateral decision.
   * Emits registry PartialWithdrawal. Errors: NotReceiptOwner, InvalidLoanStatus, WeightInvalid,
   * WithdrawalBreaksLtv and risk errors; remains encumbered after success.
   */
  partial_withdraw: ({owner, loan_id, kg, evidence}: {owner: string, loan_id: u64, kg: u64, evidence: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, registry, settlement_asset}: {admin: string, registry: string, settlement_asset: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, registry, settlement_asset}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAOVGdW5kIG9uY2Ugd2l0aCBsZW5kZXIgYXV0aCwgdHJhbnNmZXJyaW5nIHRoZSBjb25maWd1cmVkIFNBQyBkaXJlY3RseSB0byBib3Jyb3dlci4KRW1pdHMgTG9hbkZ1bmRlZC4gRXJyb3JzOiBQYXVzZWQsIEludmFsaWRMb2FuU3RhdHVzLCBJbnZhbGlkQWRkcmVzcywgRXhjZWVkc01heFByaW5jaXBhbCwKcmlzay9yZWdpc3RyeSBlcnJvcnM7IFNBQyBmYWlsdXJlcyByb2xsIGJhY2sgYWxsIGVmZmVjdHMuAAAAAAAABGZ1bmQAAAACAAAAAAAAAAZsZW5kZXIAAAAAABMAAAAAAAAAB2xvYW5faWQAAAAABgAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAUBSZXBheSB3aXRoIHBheWVyIGF1dGggdW50aWwgY2xhaW0sIGludGVyZXN0IGZpcnN0OyBjYXAgdHJhbnNmZXIgYXQgYWN0dWFsIGRlYnQuClJlcXVpcmVzIGEgcHJpb3IgYm91bmRlZCBTQUMgYWxsb3dhbmNlIGZvciB0aGlzIHZhdWx0IGFzIHNwZW5kZXIgKEFEUi0wMTEpLgpFbWl0cyBMb2FuUmVwYWlkIGFuZCBDb2xsYXRlcmFsVW5sb2NrZWQgb24gZnVsbCBwYXltZW50LiBFcnJvcnM6IEFtb3VudEludmFsaWQsCkludmFsaWRMb2FuU3RhdHVzLCBJbnZhbGlkQWRkcmVzcywgTWF0aE92ZXJmbG93OyBTQUMgZmFpbHVyZXMgcm9sbCBiYWNrIGFsbCBlZmZlY3RzLgAAAAVyZXBheQAAAAAAAAMAAAAAAAAABXBheWVyAAAAAAAAEwAAAAAAAAAHbG9hbl9pZAAAAAAGAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAAKRQdWJsaWMgZGVidCBhdCBsZWRnZXIgdGltZSwgb3IgZnJvemVuIGNsYWltIGV4cG9zdXJlOyBubyBhdXRoIG9yIGV2ZW50cy4KRXJyb3JzOiBMb2FuTm90Rm91bmQsIE1hdGhPdmVyZmxvdy4gTGlxdWlkYXRlZCBleHBvc3VyZSBjYW5ub3QgYmUgY29sbGVjdGVkIGFnYWluIG9uLWNoYWluLgAAAAdkZWJ0X29mAAAAAAEAAAAAAAAAB2xvYW5faWQAAAAABgAAAAEAAAPpAAAACwAAAAM=",
        "AAAAAAAAAEtQdWJsaWMgdmF1bHQgcmV2aXNpb24gMC4zIChib3VuZGVkIHJlcGF5bWVudCBhbGxvd2FuY2UpOyBubyBhdXRoIG9yIGV2ZW50cy4AAAAAB3ZlcnNpb24AAAAAAAAAAAEAAAAE",
        "AAAAAAAAADpQdWJsaWMgbG9hbiBxdWVyeTsgbm8gYXV0aCBvciBldmVudHMuIEVycm9yOiBMb2FuTm90Rm91bmQuAAAAAAAIZ2V0X2xvYW4AAAABAAAAAAAAAAdsb2FuX2lkAAAAAAYAAAABAAAD6QAAB9AAAAAETG9hbgAAAAM=",
        "AAAAAAAAAD5QdWJsaWMgaW1tdXRhYmxlIHJlZmVyZW5jZXMgYW5kIHBhdXNlIGZsYWc7IG5vIGF1dGggb3IgZXZlbnRzLgAAAAAACmdldF9jb25maWcAAAAAAAAAAAABAAAH0AAAAAtWYXVsdENvbmZpZwA=",
        "AAAAAAAAADpQdWJsaWMgY3VycmVudCBwb2xpY3kgZm9yIG5ldyByZXF1ZXN0czsgbm8gYXV0aCBvciBldmVudHMuAAAAAAAKZ2V0X3BhcmFtcwAAAAAAAAAAAAEAAAfQAAAAC1ZhdWx0UGFyYW1zAA==",
        "AAAAAAAAAJZTZXQgYm91bmRlZCBwb2xpY3kgZm9yIGZ1dHVyZSByZXF1ZXN0cyB3aXRoIGFkbWluIGF1dGguIEVtaXRzIFBhcmFtc1VwZGF0ZWQuCkVycm9yczogTm90QXV0aG9yaXplZCwgUGFyYW1PdXRPZkJvdW5kcy4gRG9lcyBub3QgcmV3cml0ZSBleGlzdGluZyBsb2Fucy4AAAAAAApzZXRfcGFyYW1zAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABnBhcmFtcwAAAAAH0AAAAAtWYXVsdFBhcmFtcwAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAJBQYXVzZSBvbmx5IG5ldyByZXF1ZXN0cy9mdW5kaW5nIHdpdGggYWRtaW4gYXV0aC4gRW1pdHMgUGFyYW1zVXBkYXRlZC4KRXJyb3I6IE5vdEF1dGhvcml6ZWQuIFJlcGF5bWVudCwgY2FuY2VsbGF0aW9uIGFuZCBjbGFpbXMgcmVtYWluIGF2YWlsYWJsZS4AAAAKc2V0X3BhdXNlZAAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZwYXVzZWQAAAAAAAEAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAL5EZWNsYXJlIGRlZmF1bHQgd2l0aCBjYWxsZXIgYXV0aCwgbm8gcHJpdmlsZWdlZCByb2xlLCBhZnRlciBncmFjZSBvciBhdHRlc3RlZCBpbXBhaXJtZW50LgpFbWl0cyBMb2FuRGVmYXVsdGVkIHdpdGhvdXQgY2hhbmdpbmcgb3duZXJzaGlwLiBFcnJvcnM6IEludmFsaWRMb2FuU3RhdHVzLCBOb3RNYXR1cmVkLCBNYXRoT3ZlcmZsb3cuAAAAAAAMbWFya19kZWZhdWx0AAAAAgAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAAAdsb2FuX2lkAAAAAAYAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAPNSZXF1ZXN0IGRlYnQgYWdhaW5zdCBhbiBvd25lZCBlbGlnaWJsZSByZWNlaXB0IHdpdGggYm9ycm93ZXIgYXV0aDsgbG9ja3Mgb25jZS4KRW1pdHMgTG9hblJlcXVlc3RlZCArIENvbGxhdGVyYWxMb2NrZWQuIEVycm9yczogUGF1c2VkLCBOb3RSZWNlaXB0T3duZXIsIFJvbGVDb25mbGljdCwKSW52YWxpZER1cmF0aW9uLCBBbW91bnRJbnZhbGlkLCBFeGNlZWRzTWF4UHJpbmNpcGFsIGFuZCByZWdpc3RyeS9yaXNrIGVycm9ycy4AAAAADHJlcXVlc3RfbG9hbgAAAAUAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAAAAAAlwcmluY2lwYWwAAAAAAAALAAAAAAAAAAhyYXRlX2JwcwAAAAQAAAAAAAAADWR1cmF0aW9uX3NlY3MAAAAAAAAGAAAAAQAAA+kAAAAGAAAAAw==",
        "AAAAAAAAALZDb25zdHJ1Y3Qgd2l0aCBhZG1pbiBhdXRoLCBpbW11dGFibGUgZGVwbG95ZWQgcmVnaXN0cnkvU0FDIGFuZCBvbmUtdGltZSByZWdpc3RyeSBiaW5kaW5nLgpFbWl0cyByZWdpc3RyeSBQYXJhbXNVcGRhdGVkLiBFcnJvcnM6IE5vdEF1dGhvcml6ZWQsIEludmFsaWRBZGRyZXNzLCBWYXVsdEFscmVhZHlDb25maWd1cmVkLgAAAAAADV9fY29uc3RydWN0b3IAAAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACHJlZ2lzdHJ5AAAAEwAAAAAAAAAQc2V0dGxlbWVudF9hc3NldAAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAHlQdWJsaWMgY2FwYWNpdHkgZm9yIGEgbmV3IHJlcXVlc3QgdW5kZXIgY3VycmVudCBwb2xpY3k7IG5vIGF1dGggb3IgZXZlbnRzLgpFcnJvcnM6IHJlZ2lzdHJ5L3Jpc2sgZXJyb3JzIGFuZCBNYXRoT3ZlcmZsb3cuAAAAAAAADW1heF9wcmluY2lwYWwAAAAAAAABAAAAAAAAAAZsb3RfaWQAAAAAAAYAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAAKRDYW5jZWwgYW4gdW5mdW5kZWQgcmVxdWVzdCB3aXRoIGJvcnJvd2VyIGF1dGgsIGV2ZW4gYWZ0ZXIgaW1wYWlybWVudCBvciBwYXVzZS4KRW1pdHMgTG9hbkNhbmNlbGxlZCArIENvbGxhdGVyYWxVbmxvY2tlZC4gRXJyb3JzOiBOb3RSZWNlaXB0T3duZXIsIEludmFsaWRMb2FuU3RhdHVzLgAAAA5jYW5jZWxfcmVxdWVzdAAAAAAAAgAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAdsb2FuX2lkAAAAAAYAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAQFDbGFpbSBvbmNlIHdpdGggdGhlIGxvYW4ncyBsZW5kZXIgYXV0aCBhZnRlciBEZWZhdWx0ZWQ7IG5ldmVyIHRyYW5zZmVycyBVU0RDLgpFbWl0cyBDb2xsYXRlcmFsQ2xhaW1lZCArIFJlY2VpcHRUcmFuc2ZlcnJlZC4gRXJyb3JzOiBOb3RBdXRob3JpemVkLCBJbnZhbGlkTG9hblN0YXR1cywKTWF0aE92ZXJmbG93OyByZWdpc3RyeSBmYWlsdXJlcyByb2xsIGJhY2sgYWxsIGVmZmVjdHMuIFBoeXNpY2FsIHJlY292ZXJ5IHJlbWFpbnMgb2ZmLWNoYWluLgAAAAAAABBjbGFpbV9jb2xsYXRlcmFsAAAAAgAAAAAAAAAGbGVuZGVyAAAAAAATAAAAAAAAAAdsb2FuX2lkAAAAAAYAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAPZXaXRoZHJhdyBwbGVkZ2VkIG1hc3Mgd2l0aCBvd25lciArIGN1c3RvZGlhbiBhdXRoIGFuZCBhIGZyZXNoIGNvbGxhdGVyYWwgZGVjaXNpb24uCkVtaXRzIHJlZ2lzdHJ5IFBhcnRpYWxXaXRoZHJhd2FsLiBFcnJvcnM6IE5vdFJlY2VpcHRPd25lciwgSW52YWxpZExvYW5TdGF0dXMsIFdlaWdodEludmFsaWQsCldpdGhkcmF3YWxCcmVha3NMdHYgYW5kIHJpc2sgZXJyb3JzOyByZW1haW5zIGVuY3VtYmVyZWQgYWZ0ZXIgc3VjY2Vzcy4AAAAAABBwYXJ0aWFsX3dpdGhkcmF3AAAABAAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAdsb2FuX2lkAAAAAAYAAAAAAAAAAmtnAAAAAAAGAAAAAAAAAAhldmlkZW5jZQAAA+4AAAAgAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAQAAAAAAAAAAAAAABExvYW4AAAAPAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAADWR1cmF0aW9uX3NlY3MAAAAAAAAGAAAAAAAAABFleHBvc3VyZV9hdF9jbGFpbQAAAAAAAAsAAAAAAAAACWZ1bmRlZF9hdAAAAAAAAAYAAAAAAAAAAmlkAAAAAAAGAAAAAAAAAAxpbnRlcmVzdF9kdWUAAAALAAAAAAAAAA9sYXN0X2FjY3J1ZWRfYXQAAAAABgAAAAAAAAAGbGVuZGVyAAAAAAPoAAAAEwAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAAAAAAhtYXR1cml0eQAAAAYAAAAAAAAABnBvbGljeQAAAAAH0AAAAAtWYXVsdFBhcmFtcwAAAAAAAAAACXByaW5jaXBhbAAAAAAAAAsAAAAAAAAAFXByaW5jaXBhbF9vdXRzdGFuZGluZwAAAAAAAAsAAAAAAAAACHJhdGVfYnBzAAAABAAAAAAAAAAGc3RhdHVzAAAAAAfQAAAACkxvYW5TdGF0dXMAAA==",
        "AAAAAgAAAAAAAAAAAAAACkxvYW5TdGF0dXMAAAAAAAcAAAAAAAAAAAAAAAlSZXF1ZXN0ZWQAAAAAAAAAAAAAAAAAAAlDYW5jZWxsZWQAAAAAAAAAAAAAAAAAAAZGdW5kZWQAAAAAAAAAAAAAAAAAD1BhcnRpYWxseVJlcGFpZAAAAAAAAAAAAAAAAAZSZXBhaWQAAAAAAAAAAAAAAAAACURlZmF1bHRlZAAAAAAAAAAAAAAAAAAACkxpcXVpZGF0ZWQAAA==",
        "AAAAAQAAAAAAAAAAAAAAC1ZhdWx0Q29uZmlnAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGcGF1c2VkAAAAAAABAAAAAAAAAAhyZWdpc3RyeQAAABMAAAAAAAAAEHNldHRsZW1lbnRfYXNzZXQAAAAT",
        "AAAAAQAAAAAAAAAAAAAAC1ZhdWx0UGFyYW1zAAAAAAoAAAAAAAAAEGJhc2VfaGFpcmN1dF9icHMAAAAEAAAAAAAAAA5kcmlmdF9yaXNrX2JwcwAAAAAABAAAAAAAAAANZWRnZV9yaXNrX2JwcwAAAAAAAAQAAAAAAAAAEWdyYWNlX3BlcmlvZF9zZWNzAAAAAAAABgAAAAAAAAAdbWF4X2FjY2VsZXJhdGVkX2R1cmF0aW9uX3NlY3MAAAAAAAAGAAAAAAAAAAttYXhfbHR2X2JwcwAAAAAEAAAAAAAAABltYXhfbmF0dXJhbF9kdXJhdGlvbl9zZWNzAAAAAAAABgAAAAAAAAAMbWF4X3JhdGVfYnBzAAAABAAAAAAAAAARbW9pc3R1cmVfZWRnZV9icHMAAAAAAAAEAAAAAAAAABZ2YWx1YXRpb25fbWF4X2FnZV9zZWNzAAAAAAAG",
        "AAAABQAAAAAAAAAAAAAACkxvYW5GdW5kZWQAAAAAAAEAAAAKTG9hbkZ1bmRlZAAAAAAABgAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAQAAAAAAAAAHbG9hbl9pZAAAAAAGAAAAAQAAAAAAAAAEbG9hbgAAB9AAAAAETG9hbgAAAAAAAAAAAAAABWFjdG9yAAAAAAAAEwAAAAAAAAAAAAAAEHNldHRsZW1lbnRfYXNzZXQAAAATAAAAAAAAAAAAAAAJdGltZXN0YW1wAAAAAAAABgAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACkxvYW5SZXBhaWQAAAAAAAEAAAAKTG9hblJlcGFpZAAAAAAACQAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAQAAAAAAAAAHbG9hbl9pZAAAAAAGAAAAAQAAAAAAAAAEbG9hbgAAB9AAAAAETG9hbgAAAAAAAAAAAAAABXBheWVyAAAAAAAAEwAAAAAAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAAAAAADWludGVyZXN0X3BhcnQAAAAAAAALAAAAAAAAAAAAAAAOcHJpbmNpcGFsX3BhcnQAAAAAAAsAAAAAAAAAAAAAABBzZXR0bGVtZW50X2Fzc2V0AAAAEwAAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADUxvYW5DYW5jZWxsZWQAAAAAAAABAAAADUxvYW5DYW5jZWxsZWQAAAAAAAAGAAAAAAAAAAZsb3RfaWQAAAAAAAYAAAABAAAAAAAAAAdsb2FuX2lkAAAAAAYAAAABAAAAAAAAAARsb2FuAAAH0AAAAARMb2FuAAAAAAAAAAAAAAAFYWN0b3IAAAAAAAATAAAAAAAAAAAAAAAQc2V0dGxlbWVudF9hc3NldAAAABMAAAAAAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAGAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADUxvYW5EZWZhdWx0ZWQAAAAAAAABAAAADUxvYW5EZWZhdWx0ZWQAAAAAAAAHAAAAAAAAAAZsb3RfaWQAAAAAAAYAAAABAAAAAAAAAAdsb2FuX2lkAAAAAAYAAAABAAAAAAAAAARsb2FuAAAH0AAAAARMb2FuAAAAAAAAAAAAAAAFYWN0b3IAAAAAAAATAAAAAAAAAAAAAAAQc2V0dGxlbWVudF9hc3NldAAAABMAAAAAAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAGAAAAAAAAAAAAAAANYnlfaW1wYWlybWVudAAAAAAAAAEAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADUxvYW5SZXF1ZXN0ZWQAAAAAAAABAAAADUxvYW5SZXF1ZXN0ZWQAAAAAAAAGAAAAAAAAAAZsb3RfaWQAAAAAAAYAAAABAAAAAAAAAAdsb2FuX2lkAAAAAAYAAAABAAAAAAAAAARsb2FuAAAH0AAAAARMb2FuAAAAAAAAAAAAAAAFYWN0b3IAAAAAAAATAAAAAAAAAAAAAAAQc2V0dGxlbWVudF9hc3NldAAAABMAAAAAAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAGAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADVBhcmFtc1VwZGF0ZWQAAAAAAAABAAAADVBhcmFtc1VwZGF0ZWQAAAAAAAAFAAAAAAAAAAZwb2xpY3kAAAAAABEAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAAAAAAAZwYXJhbXMAAAAAB9AAAAALVmF1bHRQYXJhbXMAAAAAAAAAAAAAAAAGcGF1c2VkAAAAAAABAAAAAAAAAAAAAAAJdGltZXN0YW1wAAAAAAAABgAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAEUNvbGxhdGVyYWxDbGFpbWVkAAAAAAAAAQAAABFDb2xsYXRlcmFsQ2xhaW1lZAAAAAAAAAYAAAAAAAAABmxvdF9pZAAAAAAABgAAAAEAAAAAAAAAB2xvYW5faWQAAAAABgAAAAEAAAAAAAAABGxvYW4AAAfQAAAABExvYW4AAAAAAAAAAAAAAAVhY3RvcgAAAAAAABMAAAAAAAAAAAAAABBzZXR0bGVtZW50X2Fzc2V0AAAAEwAAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAAAAAAAAg==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAHAAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA1Ob3RBdXRob3JpemVkAAAAAAAAAgAAAAAAAAALUm9sZU1pc3NpbmcAAAAAAwAAAAAAAAAMUm9sZUNvbmZsaWN0AAAABAAAAAAAAAALTG90Tm90Rm91bmQAAAAABQAAAAAAAAAQSW52YWxpZExvdFN0YXR1cwAAAAYAAAAAAAAAEU1vaXN0dXJlT3V0T2ZCYW5kAAAAAAAABwAAAAAAAAANV2VpZ2h0SW52YWxpZAAAAAAAAAgAAAAAAAAAD0V2aWRlbmNlTWlzc2luZwAAAAAJAAAAAAAAAA1SZWNlaXB0TG9ja2VkAAAAAAAACgAAAAAAAAAPTm90UmVjZWlwdE93bmVyAAAAAAsAAAAAAAAAC0xvdEltcGFpcmVkAAAAAAwAAAAAAAAADlZhbHVhdGlvblN0YWxlAAAAAAANAAAAAAAAABNFeGNlZWRzTWF4UHJpbmNpcGFsAAAAAA4AAAAAAAAADExvYW5Ob3RGb3VuZAAAAA8AAAAAAAAAEUludmFsaWRMb2FuU3RhdHVzAAAAAAAAEAAAAAAAAAAKTm90TWF0dXJlZAAAAAAAEQAAAAAAAAANQW1vdW50SW52YWxpZAAAAAAAABIAAAAAAAAADE1hdGhPdmVyZmxvdwAAABMAAAAAAAAAEFBhcmFtT3V0T2ZCb3VuZHMAAAAUAAAAAAAAAAZQYXVzZWQAAAAAABUAAAAAAAAAE1dpdGhkcmF3YWxCcmVha3NMdHYAAAAAFgAAAAAAAAAJT25seVZhdWx0AAAAAAAAFwAAAAAAAAAUVW5zdXBwb3J0ZWRDb21tb2RpdHkAAAAYAAAAAAAAABJWYXVsdE5vdENvbmZpZ3VyZWQAAAAAABkAAAAAAAAAFlZhdWx0QWxyZWFkeUNvbmZpZ3VyZWQAAAAAABoAAAAAAAAAD0ludmFsaWREdXJhdGlvbgAAAAAbAAAAAAAAAA5JbnZhbGlkQWRkcmVzcwAAAAAAHA==" ]),
      options
    )
  }
  public readonly fromJSON = {
    fund: this.txFromJSON<Result<void>>,
        repay: this.txFromJSON<Result<i128>>,
        debt_of: this.txFromJSON<Result<i128>>,
        version: this.txFromJSON<u32>,
        get_loan: this.txFromJSON<Result<Loan>>,
        get_config: this.txFromJSON<VaultConfig>,
        get_params: this.txFromJSON<VaultParams>,
        set_params: this.txFromJSON<Result<void>>,
        set_paused: this.txFromJSON<Result<void>>,
        mark_default: this.txFromJSON<Result<void>>,
        request_loan: this.txFromJSON<Result<u64>>,
        max_principal: this.txFromJSON<Result<i128>>,
        cancel_request: this.txFromJSON<Result<void>>,
        claim_collateral: this.txFromJSON<Result<void>>,
        partial_withdraw: this.txFromJSON<Result<void>>
  }
}