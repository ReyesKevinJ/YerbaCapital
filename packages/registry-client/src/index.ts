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





export interface Lot {
  aging_method: AgingMethod;
  aging_started_at: u64;
  commodity: string;
  custodian: string;
  id: u64;
  initial_verified_kg: u64;
  last_attestation: Attestation;
  loan_id: Option<u64>;
  moisture_bps: u32;
  moisture_drift: boolean;
  net_kg: u64;
  original_borrower: string;
  owner: string;
  physical_status: PhysicalStatus;
  receipt_status: ReceiptStatus;
  recorded_losses_kg: u64;
  valuation: i128;
  valued_at: u64;
  valued_kg: u64;
  verification_evidence: Option<Buffer>;
  verifier: Option<string>;
  warehouse_id: Buffer;
  withdrawn_kg: u64;
}

export type Role = {tag: "Custodian", values: void} | {tag: "Verifier", values: void} | {tag: "PriceOracle", values: void};

export type AgingMethod = {tag: "Natural", values: void} | {tag: "Accelerated", values: void};


export interface Attestation {
  actor: string;
  co_signer: Option<string>;
  evidence: Buffer;
  kind: AttestationKind;
  recorded_at: u64;
}

export type ReceiptStatus = {tag: "Unissued", values: void} | {tag: "Receipted", values: void} | {tag: "Encumbered", values: void} | {tag: "Retired", values: void};

export type InspectionKind = {tag: "Passed", values: void} | {tag: "MoistureDrift", values: void};

export type PhysicalStatus = {tag: "Registered", values: void} | {tag: "Verified", values: void} | {tag: "Rejected", values: void} | {tag: "Impaired", values: void} | {tag: "Closed", values: void};


export interface RegistryParams {
  min_lot_kg: u64;
  moisture_max_bps: u32;
  moisture_min_bps: u32;
}

export type AttestationKind = {tag: "Declared", values: void} | {tag: "DepositVerified", values: void} | {tag: "Rejected", values: void} | {tag: "Valued", values: void} | {tag: "Inspection", values: readonly [InspectionKind]} | {tag: "Impaired", values: readonly [ImpairmentReason]} | {tag: "PartialWithdrawal", values: void} | {tag: "FinalWithdrawal", values: void};

export type ImpairmentReason = {tag: "Moisture", values: void} | {tag: "Pest", values: void} | {tag: "Fire", values: void} | {tag: "Theft", values: void} | {tag: "Flood", values: void} | {tag: "Other", values: void};

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
   * Construct and simulate a lock transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Lock an eligible receipt for a single loan; ONLY linked vault auth. Emits CollateralLocked.
   * Errors: VaultNotConfigured, ReceiptLocked, NotReceiptOwner, LotImpaired, InvalidLotStatus.
   */
  lock: ({lot_id, loan_id, owner}: {lot_id: u64, loan_id: u64, owner: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a impair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Attest impairment with verifier auth, preserving ownership and encumbrance. Emits LotImpaired.
   * Errors: RoleMissing, RoleConflict, InvalidLotStatus, LotImpaired, EvidenceMissing.
   */
  impair: ({verifier, lot_id, reason, evidence}: {verifier: string, lot_id: u64, reason: ImpairmentReason, evidence: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a unlock transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Release matching encumbrance; ONLY linked vault auth, including Impaired lots.
   * Emits CollateralUnlocked. Errors: VaultNotConfigured, InvalidLotStatus.
   */
  unlock: ({lot_id, loan_id}: {lot_id: u64, loan_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_lot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public lot query; no auth or events. Error: LotNotFound.
   */
  get_lot: ({lot_id}: {lot_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Lot>>>

  /**
   * Construct and simulate a version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public design revision 0.2; no auth or events.
   */
  version: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a has_role transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public role query; no auth or events.
   */
  has_role: ({address, role}: {address: string, role: Role}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public admin reference; no auth or events.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_vault transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public vault reference; no auth or events.
   */
  get_vault: (options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a bind_vault transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Bind a deployed vault once before lots exist; admin + vault auth. Emits ParamsUpdated.
   * Errors: NotAuthorized, InvalidAddress, VaultAlreadyConfigured.
   */
  bind_vault: ({admin, vault}: {admin: string, vault: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_params transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Public policy query; no auth or events.
   */
  get_params: (options?: MethodOptions) => Promise<AssembledTransaction<RegistryParams>>

  /**
   * Construct and simulate a grant_role transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Grant role with admin auth; no asset rights. Emits RoleGranted only on change.
   * Errors: NotAuthorized.
   */
  grant_role: ({admin, address, role}: {admin: string, address: string, role: Role}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a reject_lot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Reject unissued Registered/Verified inventory with verifier auth and evidence.
   * Emits LotRejected. Errors: RoleMissing, RoleConflict, InvalidLotStatus, EvidenceMissing.
   */
  reject_lot: ({verifier, lot_id, evidence}: {verifier: string, lot_id: u64, evidence: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_params transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set bounded registry policy with admin auth. Emits ParamsUpdated; never changes prior facts.
   * Errors: NotAuthorized, ParamOutOfBounds.
   */
  set_params: ({admin, params}: {admin: string, params: RegistryParams}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a verify_lot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Verify Registered inventory with verifier AND custodian auth over the same evidence.
   * Emits LotVerified. Errors: RoleMissing, RoleConflict, InvalidLotStatus, WeightInvalid,
   * MoistureOutOfBand, EvidenceMissing, LotNotFound.
   */
  verify_lot: ({verifier, lot_id, net_kg, moisture_bps, evidence}: {verifier: string, lot_id: u64, net_kg: u64, moisture_bps: u32, evidence: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a revoke_role transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Revoke future authority with admin auth; preserves historical acts. Emits RoleRevoked on change.
   * Errors: NotAuthorized.
   */
  revoke_role: ({admin, address, role}: {admin: string, address: string, role: Role}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a register_lot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Declare supported inventory with owner auth after vault binding. Emits LotRegistered.
   * Errors: VaultNotConfigured, RoleMissing, RoleConflict, UnsupportedCommodity, WeightInvalid,
   * EvidenceMissing, ParamOutOfBounds, MathOverflow. This does not verify physical existence.
   */
  register_lot: ({owner, custodian, commodity, net_kg, warehouse_id, aging_method, aging_started_at, evidence}: {owner: string, custodian: string, commodity: string, net_kg: u64, warehouse_id: Buffer, aging_method: AgingMethod, aging_started_at: u64, evidence: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a issue_receipt transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Issue one receipt with original verifier auth on Verified inventory. Emits ReceiptIssued.
   * Errors: RoleMissing, RoleConflict, NotAuthorized, InvalidLotStatus, LotImpaired.
   */
  issue_receipt: ({verifier, lot_id}: {verifier: string, lot_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a withdraw_full transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Close a free Verified lot with owner + custodian auth and evidence. Emits LotClosed.
   * Errors: NotReceiptOwner, ReceiptLocked, RoleMissing, EvidenceMissing, MathOverflow.
   */
  withdraw_full: ({owner, lot_id, evidence}: {owner: string, lot_id: u64, evidence: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a post_valuation transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Publish a positive valuation with oracle auth on Verified issued inventory.
   * Emits ValuationPosted. Errors: RoleMissing, RoleConflict, AmountInvalid, InvalidLotStatus,
   * LotImpaired, EvidenceMissing.
   */
  post_valuation: ({oracle, lot_id, valuation, evidence}: {oracle: string, lot_id: u64, valuation: i128, evidence: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a partial_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw part of a free Verified lot with owner + custodian auth. Emits PartialWithdrawal.
   * Errors: NotReceiptOwner, ReceiptLocked, RoleMissing, WeightInvalid, EvidenceMissing.
   */
  partial_withdraw: ({owner, lot_id, kg, evidence}: {owner: string, lot_id: u64, kg: u64, evidence: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a transfer_receipt transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Transfer a free eligible receipt with owner auth. Emits ReceiptTransferred.
   * Errors: NotReceiptOwner, ReceiptLocked, InvalidLotStatus, InvalidAddress, RoleConflict.
   */
  transfer_receipt: ({owner, lot_id, new_owner}: {owner: string, lot_id: u64, new_owner: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a record_inspection transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Record an inspection with verifier auth on active issued inventory. Emits InspectionRecorded.
   * Errors: RoleMissing, RoleConflict, InvalidLotStatus, WeightInvalid, MoistureOutOfBand,
   * EvidenceMissing, MathOverflow. Inspections never add mass or clear impairment.
   */
  record_inspection: ({verifier, lot_id, net_kg, moisture_bps, kind, evidence}: {verifier: string, lot_id: u64, net_kg: u64, moisture_bps: u32, kind: InspectionKind, evidence: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a transfer_on_default transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Adjudicate matching encumbered receipt; ONLY linked vault auth, preserving physical status.
   * Emits ReceiptTransferred. Errors: VaultNotConfigured, InvalidLotStatus, InvalidAddress.
   */
  transfer_on_default: ({lot_id, loan_id, lender}: {lot_id: u64, loan_id: u64, lender: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a withdraw_encumbered transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Apply a pledged withdrawal; vault + owner + custodian auth in one invocation.
   * Emits PartialWithdrawal. Errors: InvalidLotStatus, NotReceiptOwner, WeightInvalid, EvidenceMissing.
   */
  withdraw_encumbered: ({lot_id, loan_id, owner, kg, evidence}: {lot_id: u64, loan_id: u64, owner: string, kg: u64, evidence: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin}: {admin: string},
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
    return ContractClient.deploy({admin}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAALZMb2NrIGFuIGVsaWdpYmxlIHJlY2VpcHQgZm9yIGEgc2luZ2xlIGxvYW47IE9OTFkgbGlua2VkIHZhdWx0IGF1dGguIEVtaXRzIENvbGxhdGVyYWxMb2NrZWQuCkVycm9yczogVmF1bHROb3RDb25maWd1cmVkLCBSZWNlaXB0TG9ja2VkLCBOb3RSZWNlaXB0T3duZXIsIExvdEltcGFpcmVkLCBJbnZhbGlkTG90U3RhdHVzLgAAAAAABGxvY2sAAAADAAAAAAAAAAZsb3RfaWQAAAAAAAYAAAAAAAAAB2xvYW5faWQAAAAABgAAAAAAAAAFb3duZXIAAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAALFBdHRlc3QgaW1wYWlybWVudCB3aXRoIHZlcmlmaWVyIGF1dGgsIHByZXNlcnZpbmcgb3duZXJzaGlwIGFuZCBlbmN1bWJyYW5jZS4gRW1pdHMgTG90SW1wYWlyZWQuCkVycm9yczogUm9sZU1pc3NpbmcsIFJvbGVDb25mbGljdCwgSW52YWxpZExvdFN0YXR1cywgTG90SW1wYWlyZWQsIEV2aWRlbmNlTWlzc2luZy4AAAAAAAAGaW1wYWlyAAAAAAAEAAAAAAAAAAh2ZXJpZmllcgAAABMAAAAAAAAABmxvdF9pZAAAAAAABgAAAAAAAAAGcmVhc29uAAAAAAfQAAAAEEltcGFpcm1lbnRSZWFzb24AAAAAAAAACGV2aWRlbmNlAAAD7gAAACAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAJZSZWxlYXNlIG1hdGNoaW5nIGVuY3VtYnJhbmNlOyBPTkxZIGxpbmtlZCB2YXVsdCBhdXRoLCBpbmNsdWRpbmcgSW1wYWlyZWQgbG90cy4KRW1pdHMgQ29sbGF0ZXJhbFVubG9ja2VkLiBFcnJvcnM6IFZhdWx0Tm90Q29uZmlndXJlZCwgSW52YWxpZExvdFN0YXR1cy4AAAAAAAZ1bmxvY2sAAAAAAAIAAAAAAAAABmxvdF9pZAAAAAAABgAAAAAAAAAHbG9hbl9pZAAAAAAGAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAADhQdWJsaWMgbG90IHF1ZXJ5OyBubyBhdXRoIG9yIGV2ZW50cy4gRXJyb3I6IExvdE5vdEZvdW5kLgAAAAdnZXRfbG90AAAAAAEAAAAAAAAABmxvdF9pZAAAAAAABgAAAAEAAAPpAAAH0AAAAANMb3QAAAAAAw==",
        "AAAAAAAAAC5QdWJsaWMgZGVzaWduIHJldmlzaW9uIDAuMjsgbm8gYXV0aCBvciBldmVudHMuAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAACVQdWJsaWMgcm9sZSBxdWVyeTsgbm8gYXV0aCBvciBldmVudHMuAAAAAAAACGhhc19yb2xlAAAAAgAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAARyb2xlAAAH0AAAAARSb2xlAAAAAQAAAAE=",
        "AAAAAAAAACpQdWJsaWMgYWRtaW4gcmVmZXJlbmNlOyBubyBhdXRoIG9yIGV2ZW50cy4AAAAAAAlnZXRfYWRtaW4AAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAACpQdWJsaWMgdmF1bHQgcmVmZXJlbmNlOyBubyBhdXRoIG9yIGV2ZW50cy4AAAAAAAlnZXRfdmF1bHQAAAAAAAAAAAAAAQAAA+gAAAAT",
        "AAAAAAAAAJVCaW5kIGEgZGVwbG95ZWQgdmF1bHQgb25jZSBiZWZvcmUgbG90cyBleGlzdDsgYWRtaW4gKyB2YXVsdCBhdXRoLiBFbWl0cyBQYXJhbXNVcGRhdGVkLgpFcnJvcnM6IE5vdEF1dGhvcml6ZWQsIEludmFsaWRBZGRyZXNzLCBWYXVsdEFscmVhZHlDb25maWd1cmVkLgAAAAAAAApiaW5kX3ZhdWx0AAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABXZhdWx0AAAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAACdQdWJsaWMgcG9saWN5IHF1ZXJ5OyBubyBhdXRoIG9yIGV2ZW50cy4AAAAACmdldF9wYXJhbXMAAAAAAAAAAAABAAAH0AAAAA5SZWdpc3RyeVBhcmFtcwAA",
        "AAAAAAAAAGVHcmFudCByb2xlIHdpdGggYWRtaW4gYXV0aDsgbm8gYXNzZXQgcmlnaHRzLiBFbWl0cyBSb2xlR3JhbnRlZCBvbmx5IG9uIGNoYW5nZS4KRXJyb3JzOiBOb3RBdXRob3JpemVkLgAAAAAAAApncmFudF9yb2xlAAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAEcm9sZQAAB9AAAAAEUm9sZQAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAKdSZWplY3QgdW5pc3N1ZWQgUmVnaXN0ZXJlZC9WZXJpZmllZCBpbnZlbnRvcnkgd2l0aCB2ZXJpZmllciBhdXRoIGFuZCBldmlkZW5jZS4KRW1pdHMgTG90UmVqZWN0ZWQuIEVycm9yczogUm9sZU1pc3NpbmcsIFJvbGVDb25mbGljdCwgSW52YWxpZExvdFN0YXR1cywgRXZpZGVuY2VNaXNzaW5nLgAAAAAKcmVqZWN0X2xvdAAAAAAAAwAAAAAAAAAIdmVyaWZpZXIAAAATAAAAAAAAAAZsb3RfaWQAAAAAAAYAAAAAAAAACGV2aWRlbmNlAAAD7gAAACAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAIVTZXQgYm91bmRlZCByZWdpc3RyeSBwb2xpY3kgd2l0aCBhZG1pbiBhdXRoLiBFbWl0cyBQYXJhbXNVcGRhdGVkOyBuZXZlciBjaGFuZ2VzIHByaW9yIGZhY3RzLgpFcnJvcnM6IE5vdEF1dGhvcml6ZWQsIFBhcmFtT3V0T2ZCb3VuZHMuAAAAAAAACnNldF9wYXJhbXMAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGcGFyYW1zAAAAAAfQAAAADlJlZ2lzdHJ5UGFyYW1zAAAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAANxWZXJpZnkgUmVnaXN0ZXJlZCBpbnZlbnRvcnkgd2l0aCB2ZXJpZmllciBBTkQgY3VzdG9kaWFuIGF1dGggb3ZlciB0aGUgc2FtZSBldmlkZW5jZS4KRW1pdHMgTG90VmVyaWZpZWQuIEVycm9yczogUm9sZU1pc3NpbmcsIFJvbGVDb25mbGljdCwgSW52YWxpZExvdFN0YXR1cywgV2VpZ2h0SW52YWxpZCwKTW9pc3R1cmVPdXRPZkJhbmQsIEV2aWRlbmNlTWlzc2luZywgTG90Tm90Rm91bmQuAAAACnZlcmlmeV9sb3QAAAAAAAUAAAAAAAAACHZlcmlmaWVyAAAAEwAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAAAAAAZuZXRfa2cAAAAAAAYAAAAAAAAADG1vaXN0dXJlX2JwcwAAAAQAAAAAAAAACGV2aWRlbmNlAAAD7gAAACAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAHdSZXZva2UgZnV0dXJlIGF1dGhvcml0eSB3aXRoIGFkbWluIGF1dGg7IHByZXNlcnZlcyBoaXN0b3JpY2FsIGFjdHMuIEVtaXRzIFJvbGVSZXZva2VkIG9uIGNoYW5nZS4KRXJyb3JzOiBOb3RBdXRob3JpemVkLgAAAAALcmV2b2tlX3JvbGUAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAdhZGRyZXNzAAAAABMAAAAAAAAABHJvbGUAAAfQAAAABFJvbGUAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAQtEZWNsYXJlIHN1cHBvcnRlZCBpbnZlbnRvcnkgd2l0aCBvd25lciBhdXRoIGFmdGVyIHZhdWx0IGJpbmRpbmcuIEVtaXRzIExvdFJlZ2lzdGVyZWQuCkVycm9yczogVmF1bHROb3RDb25maWd1cmVkLCBSb2xlTWlzc2luZywgUm9sZUNvbmZsaWN0LCBVbnN1cHBvcnRlZENvbW1vZGl0eSwgV2VpZ2h0SW52YWxpZCwKRXZpZGVuY2VNaXNzaW5nLCBQYXJhbU91dE9mQm91bmRzLCBNYXRoT3ZlcmZsb3cuIFRoaXMgZG9lcyBub3QgdmVyaWZ5IHBoeXNpY2FsIGV4aXN0ZW5jZS4AAAAADHJlZ2lzdGVyX2xvdAAAAAgAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAJY3VzdG9kaWFuAAAAAAAAEwAAAAAAAAAJY29tbW9kaXR5AAAAAAAAEQAAAAAAAAAGbmV0X2tnAAAAAAAGAAAAAAAAAAx3YXJlaG91c2VfaWQAAAPuAAAAIAAAAAAAAAAMYWdpbmdfbWV0aG9kAAAH0AAAAAtBZ2luZ01ldGhvZAAAAAAAAAAAEGFnaW5nX3N0YXJ0ZWRfYXQAAAAGAAAAAAAAAAhldmlkZW5jZQAAA+4AAAAgAAAAAQAAA+kAAAAGAAAAAw==",
        "AAAAAAAAAFdDb25zdHJ1Y3Qgb25jZSB3aXRoIGFkbWluIGF1dGg7IG5vIGxvdHMgb3IgYXNzZXQgbW92ZW1lbnQuIEhvc3QgcmVqZWN0cyByZWNvbnN0cnVjdGlvbi4AAAAADV9fY29uc3RydWN0b3IAAAAAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAA",
        "AAAAAAAAAKpJc3N1ZSBvbmUgcmVjZWlwdCB3aXRoIG9yaWdpbmFsIHZlcmlmaWVyIGF1dGggb24gVmVyaWZpZWQgaW52ZW50b3J5LiBFbWl0cyBSZWNlaXB0SXNzdWVkLgpFcnJvcnM6IFJvbGVNaXNzaW5nLCBSb2xlQ29uZmxpY3QsIE5vdEF1dGhvcml6ZWQsIEludmFsaWRMb3RTdGF0dXMsIExvdEltcGFpcmVkLgAAAAAADWlzc3VlX3JlY2VpcHQAAAAAAAACAAAAAAAAAAh2ZXJpZmllcgAAABMAAAAAAAAABmxvdF9pZAAAAAAABgAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAKhDbG9zZSBhIGZyZWUgVmVyaWZpZWQgbG90IHdpdGggb3duZXIgKyBjdXN0b2RpYW4gYXV0aCBhbmQgZXZpZGVuY2UuIEVtaXRzIExvdENsb3NlZC4KRXJyb3JzOiBOb3RSZWNlaXB0T3duZXIsIFJlY2VpcHRMb2NrZWQsIFJvbGVNaXNzaW5nLCBFdmlkZW5jZU1pc3NpbmcsIE1hdGhPdmVyZmxvdy4AAAANd2l0aGRyYXdfZnVsbAAAAAAAAAMAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAAAAAAhldmlkZW5jZQAAA+4AAAAgAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAMRQdWJsaXNoIGEgcG9zaXRpdmUgdmFsdWF0aW9uIHdpdGggb3JhY2xlIGF1dGggb24gVmVyaWZpZWQgaXNzdWVkIGludmVudG9yeS4KRW1pdHMgVmFsdWF0aW9uUG9zdGVkLiBFcnJvcnM6IFJvbGVNaXNzaW5nLCBSb2xlQ29uZmxpY3QsIEFtb3VudEludmFsaWQsIEludmFsaWRMb3RTdGF0dXMsCkxvdEltcGFpcmVkLCBFdmlkZW5jZU1pc3NpbmcuAAAADnBvc3RfdmFsdWF0aW9uAAAAAAAEAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAABmxvdF9pZAAAAAAABgAAAAAAAAAJdmFsdWF0aW9uAAAAAAAACwAAAAAAAAAIZXZpZGVuY2UAAAPuAAAAIAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAK9XaXRoZHJhdyBwYXJ0IG9mIGEgZnJlZSBWZXJpZmllZCBsb3Qgd2l0aCBvd25lciArIGN1c3RvZGlhbiBhdXRoLiBFbWl0cyBQYXJ0aWFsV2l0aGRyYXdhbC4KRXJyb3JzOiBOb3RSZWNlaXB0T3duZXIsIFJlY2VpcHRMb2NrZWQsIFJvbGVNaXNzaW5nLCBXZWlnaHRJbnZhbGlkLCBFdmlkZW5jZU1pc3NpbmcuAAAAABBwYXJ0aWFsX3dpdGhkcmF3AAAABAAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAZsb3RfaWQAAAAAAAYAAAAAAAAAAmtnAAAAAAAGAAAAAAAAAAhldmlkZW5jZQAAA+4AAAAgAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAKNUcmFuc2ZlciBhIGZyZWUgZWxpZ2libGUgcmVjZWlwdCB3aXRoIG93bmVyIGF1dGguIEVtaXRzIFJlY2VpcHRUcmFuc2ZlcnJlZC4KRXJyb3JzOiBOb3RSZWNlaXB0T3duZXIsIFJlY2VpcHRMb2NrZWQsIEludmFsaWRMb3RTdGF0dXMsIEludmFsaWRBZGRyZXNzLCBSb2xlQ29uZmxpY3QuAAAAABB0cmFuc2Zlcl9yZWNlaXB0AAAAAwAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAZsb3RfaWQAAAAAAAYAAAAAAAAACW5ld19vd25lcgAAAAAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAQNSZWNvcmQgYW4gaW5zcGVjdGlvbiB3aXRoIHZlcmlmaWVyIGF1dGggb24gYWN0aXZlIGlzc3VlZCBpbnZlbnRvcnkuIEVtaXRzIEluc3BlY3Rpb25SZWNvcmRlZC4KRXJyb3JzOiBSb2xlTWlzc2luZywgUm9sZUNvbmZsaWN0LCBJbnZhbGlkTG90U3RhdHVzLCBXZWlnaHRJbnZhbGlkLCBNb2lzdHVyZU91dE9mQmFuZCwKRXZpZGVuY2VNaXNzaW5nLCBNYXRoT3ZlcmZsb3cuIEluc3BlY3Rpb25zIG5ldmVyIGFkZCBtYXNzIG9yIGNsZWFyIGltcGFpcm1lbnQuAAAAABFyZWNvcmRfaW5zcGVjdGlvbgAAAAAAAAYAAAAAAAAACHZlcmlmaWVyAAAAEwAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAAAAAAZuZXRfa2cAAAAAAAYAAAAAAAAADG1vaXN0dXJlX2JwcwAAAAQAAAAAAAAABGtpbmQAAAfQAAAADkluc3BlY3Rpb25LaW5kAAAAAAAAAAAACGV2aWRlbmNlAAAD7gAAACAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAALNBZGp1ZGljYXRlIG1hdGNoaW5nIGVuY3VtYmVyZWQgcmVjZWlwdDsgT05MWSBsaW5rZWQgdmF1bHQgYXV0aCwgcHJlc2VydmluZyBwaHlzaWNhbCBzdGF0dXMuCkVtaXRzIFJlY2VpcHRUcmFuc2ZlcnJlZC4gRXJyb3JzOiBWYXVsdE5vdENvbmZpZ3VyZWQsIEludmFsaWRMb3RTdGF0dXMsIEludmFsaWRBZGRyZXNzLgAAAAATdHJhbnNmZXJfb25fZGVmYXVsdAAAAAADAAAAAAAAAAZsb3RfaWQAAAAAAAYAAAAAAAAAB2xvYW5faWQAAAAABgAAAAAAAAAGbGVuZGVyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAALFBcHBseSBhIHBsZWRnZWQgd2l0aGRyYXdhbDsgdmF1bHQgKyBvd25lciArIGN1c3RvZGlhbiBhdXRoIGluIG9uZSBpbnZvY2F0aW9uLgpFbWl0cyBQYXJ0aWFsV2l0aGRyYXdhbC4gRXJyb3JzOiBJbnZhbGlkTG90U3RhdHVzLCBOb3RSZWNlaXB0T3duZXIsIFdlaWdodEludmFsaWQsIEV2aWRlbmNlTWlzc2luZy4AAAAAAAATd2l0aGRyYXdfZW5jdW1iZXJlZAAAAAAFAAAAAAAAAAZsb3RfaWQAAAAAAAYAAAAAAAAAB2xvYW5faWQAAAAABgAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAJrZwAAAAAABgAAAAAAAAAIZXZpZGVuY2UAAAPuAAAAIAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAQAAAAAAAAAAAAAAA0xvdAAAAAAXAAAAAAAAAAxhZ2luZ19tZXRob2QAAAfQAAAAC0FnaW5nTWV0aG9kAAAAAAAAAAAQYWdpbmdfc3RhcnRlZF9hdAAAAAYAAAAAAAAACWNvbW1vZGl0eQAAAAAAABEAAAAAAAAACWN1c3RvZGlhbgAAAAAAABMAAAAAAAAAAmlkAAAAAAAGAAAAAAAAABNpbml0aWFsX3ZlcmlmaWVkX2tnAAAAAAYAAAAAAAAAEGxhc3RfYXR0ZXN0YXRpb24AAAfQAAAAC0F0dGVzdGF0aW9uAAAAAAAAAAAHbG9hbl9pZAAAAAPoAAAABgAAAAAAAAAMbW9pc3R1cmVfYnBzAAAABAAAAAAAAAAObW9pc3R1cmVfZHJpZnQAAAAAAAEAAAAAAAAABm5ldF9rZwAAAAAABgAAAAAAAAARb3JpZ2luYWxfYm9ycm93ZXIAAAAAAAATAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAD3BoeXNpY2FsX3N0YXR1cwAAAAfQAAAADlBoeXNpY2FsU3RhdHVzAAAAAAAAAAAADnJlY2VpcHRfc3RhdHVzAAAAAAfQAAAADVJlY2VpcHRTdGF0dXMAAAAAAAAAAAAAEnJlY29yZGVkX2xvc3Nlc19rZwAAAAAABgAAAAAAAAAJdmFsdWF0aW9uAAAAAAAACwAAAAAAAAAJdmFsdWVkX2F0AAAAAAAABgAAAAAAAAAJdmFsdWVkX2tnAAAAAAAABgAAAAAAAAAVdmVyaWZpY2F0aW9uX2V2aWRlbmNlAAAAAAAD6AAAA+4AAAAgAAAAAAAAAAh2ZXJpZmllcgAAA+gAAAATAAAAAAAAAAx3YXJlaG91c2VfaWQAAAPuAAAAIAAAAAAAAAAMd2l0aGRyYXduX2tnAAAABg==",
        "AAAAAgAAAAAAAAAAAAAABFJvbGUAAAADAAAAAAAAAAAAAAAJQ3VzdG9kaWFuAAAAAAAAAAAAAAAAAAAIVmVyaWZpZXIAAAAAAAAAAAAAAAtQcmljZU9yYWNsZQA=",
        "AAAAAgAAAAAAAAAAAAAAC0FnaW5nTWV0aG9kAAAAAAIAAAAAAAAAAAAAAAdOYXR1cmFsAAAAAAAAAAAAAAAAC0FjY2VsZXJhdGVkAA==",
        "AAAAAQAAAAAAAAAAAAAAC0F0dGVzdGF0aW9uAAAAAAUAAAAAAAAABWFjdG9yAAAAAAAAEwAAAAAAAAAJY29fc2lnbmVyAAAAAAAD6AAAABMAAAAAAAAACGV2aWRlbmNlAAAD7gAAACAAAAAAAAAABGtpbmQAAAfQAAAAD0F0dGVzdGF0aW9uS2luZAAAAAAAAAAAC3JlY29yZGVkX2F0AAAAAAY=",
        "AAAAAgAAAAAAAAAAAAAADVJlY2VpcHRTdGF0dXMAAAAAAAAEAAAAAAAAAAAAAAAIVW5pc3N1ZWQAAAAAAAAAAAAAAAlSZWNlaXB0ZWQAAAAAAAAAAAAAAAAAAApFbmN1bWJlcmVkAAAAAAAAAAAAAAAAAAdSZXRpcmVkAA==",
        "AAAAAgAAAAAAAAAAAAAADkluc3BlY3Rpb25LaW5kAAAAAAACAAAAAAAAAAAAAAAGUGFzc2VkAAAAAAAAAAAAAAAAAA1Nb2lzdHVyZURyaWZ0AAAA",
        "AAAAAgAAAAAAAAAAAAAADlBoeXNpY2FsU3RhdHVzAAAAAAAFAAAAAAAAAAAAAAAKUmVnaXN0ZXJlZAAAAAAAAAAAAAAAAAAIVmVyaWZpZWQAAAAAAAAAAAAAAAhSZWplY3RlZAAAAAAAAAAAAAAACEltcGFpcmVkAAAAAAAAAAAAAAAGQ2xvc2VkAAA=",
        "AAAAAQAAAAAAAAAAAAAADlJlZ2lzdHJ5UGFyYW1zAAAAAAADAAAAAAAAAAptaW5fbG90X2tnAAAAAAAGAAAAAAAAABBtb2lzdHVyZV9tYXhfYnBzAAAABAAAAAAAAAAQbW9pc3R1cmVfbWluX2JwcwAAAAQ=",
        "AAAAAgAAAAAAAAAAAAAAD0F0dGVzdGF0aW9uS2luZAAAAAAIAAAAAAAAAAAAAAAIRGVjbGFyZWQAAAAAAAAAAAAAAA9EZXBvc2l0VmVyaWZpZWQAAAAAAAAAAAAAAAAIUmVqZWN0ZWQAAAAAAAAAAAAAAAZWYWx1ZWQAAAAAAAEAAAAAAAAACkluc3BlY3Rpb24AAAAAAAEAAAfQAAAADkluc3BlY3Rpb25LaW5kAAAAAAABAAAAAAAAAAhJbXBhaXJlZAAAAAEAAAfQAAAAEEltcGFpcm1lbnRSZWFzb24AAAAAAAAAAAAAABFQYXJ0aWFsV2l0aGRyYXdhbAAAAAAAAAAAAAAAAAAAD0ZpbmFsV2l0aGRyYXdhbAA=",
        "AAAAAgAAAAAAAAAAAAAAEEltcGFpcm1lbnRSZWFzb24AAAAGAAAAAAAAAAAAAAAITW9pc3R1cmUAAAAAAAAAAAAAAARQZXN0AAAAAAAAAAAAAAAERmlyZQAAAAAAAAAAAAAABVRoZWZ0AAAAAAAAAAAAAAAAAAAFRmxvb2QAAAAAAAAAAAAAAAAAAAVPdGhlcgAAAA==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAHAAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA1Ob3RBdXRob3JpemVkAAAAAAAAAgAAAAAAAAALUm9sZU1pc3NpbmcAAAAAAwAAAAAAAAAMUm9sZUNvbmZsaWN0AAAABAAAAAAAAAALTG90Tm90Rm91bmQAAAAABQAAAAAAAAAQSW52YWxpZExvdFN0YXR1cwAAAAYAAAAAAAAAEU1vaXN0dXJlT3V0T2ZCYW5kAAAAAAAABwAAAAAAAAANV2VpZ2h0SW52YWxpZAAAAAAAAAgAAAAAAAAAD0V2aWRlbmNlTWlzc2luZwAAAAAJAAAAAAAAAA1SZWNlaXB0TG9ja2VkAAAAAAAACgAAAAAAAAAPTm90UmVjZWlwdE93bmVyAAAAAAsAAAAAAAAAC0xvdEltcGFpcmVkAAAAAAwAAAAAAAAADlZhbHVhdGlvblN0YWxlAAAAAAANAAAAAAAAABNFeGNlZWRzTWF4UHJpbmNpcGFsAAAAAA4AAAAAAAAADExvYW5Ob3RGb3VuZAAAAA8AAAAAAAAAEUludmFsaWRMb2FuU3RhdHVzAAAAAAAAEAAAAAAAAAAKTm90TWF0dXJlZAAAAAAAEQAAAAAAAAANQW1vdW50SW52YWxpZAAAAAAAABIAAAAAAAAADE1hdGhPdmVyZmxvdwAAABMAAAAAAAAAEFBhcmFtT3V0T2ZCb3VuZHMAAAAUAAAAAAAAAAZQYXVzZWQAAAAAABUAAAAAAAAAE1dpdGhkcmF3YWxCcmVha3NMdHYAAAAAFgAAAAAAAAAJT25seVZhdWx0AAAAAAAAFwAAAAAAAAAUVW5zdXBwb3J0ZWRDb21tb2RpdHkAAAAYAAAAAAAAABJWYXVsdE5vdENvbmZpZ3VyZWQAAAAAABkAAAAAAAAAFlZhdWx0QWxyZWFkeUNvbmZpZ3VyZWQAAAAAABoAAAAAAAAAD0ludmFsaWREdXJhdGlvbgAAAAAbAAAAAAAAAA5JbnZhbGlkQWRkcmVzcwAAAAAAHA==",
        "AAAABQAAAAAAAAAAAAAACUxvdENsb3NlZAAAAAAAAAEAAAAJTG90Q2xvc2VkAAAAAAAAAwAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAQAAAAAAAAADbG90AAAAB9AAAAADTG90AAAAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAC0xvdEltcGFpcmVkAAAAAAEAAAALTG90SW1wYWlyZWQAAAAAAwAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAQAAAAAAAAADbG90AAAAB9AAAAADTG90AAAAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAC0xvdFJlamVjdGVkAAAAAAEAAAALTG90UmVqZWN0ZWQAAAAAAwAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAQAAAAAAAAADbG90AAAAB9AAAAADTG90AAAAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAC0xvdFZlcmlmaWVkAAAAAAEAAAALTG90VmVyaWZpZWQAAAAAAwAAAAAAAAAGbG90X2lkAAAAAAAGAAAAAQAAAAAAAAADbG90AAAAB9AAAAADTG90AAAAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAC1JvbGVHcmFudGVkAAAAAAEAAAALUm9sZUdyYW50ZWQAAAAABAAAAAAAAAAFYWN0b3IAAAAAAAATAAAAAAAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAAAAAAAEcm9sZQAAB9AAAAAEUm9sZQAAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAC1JvbGVSZXZva2VkAAAAAAEAAAALUm9sZVJldm9rZWQAAAAABAAAAAAAAAAFYWN0b3IAAAAAAAATAAAAAAAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAAAAAAAEcm9sZQAAB9AAAAAEUm9sZQAAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAAAAAAAAg==",
        "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" ]),
      options
    )
  }
  public readonly fromJSON = {
    lock: this.txFromJSON<Result<void>>,
        impair: this.txFromJSON<Result<void>>,
        unlock: this.txFromJSON<Result<void>>,
        get_lot: this.txFromJSON<Result<Lot>>,
        version: this.txFromJSON<u32>,
        has_role: this.txFromJSON<boolean>,
        get_admin: this.txFromJSON<string>,
        get_vault: this.txFromJSON<Option<string>>,
        bind_vault: this.txFromJSON<Result<void>>,
        get_params: this.txFromJSON<RegistryParams>,
        grant_role: this.txFromJSON<Result<void>>,
        reject_lot: this.txFromJSON<Result<void>>,
        set_params: this.txFromJSON<Result<void>>,
        verify_lot: this.txFromJSON<Result<void>>,
        revoke_role: this.txFromJSON<Result<void>>,
        register_lot: this.txFromJSON<Result<u64>>,
        issue_receipt: this.txFromJSON<Result<void>>,
        withdraw_full: this.txFromJSON<Result<void>>,
        post_valuation: this.txFromJSON<Result<void>>,
        partial_withdraw: this.txFromJSON<Result<void>>,
        transfer_receipt: this.txFromJSON<Result<void>>,
        record_inspection: this.txFromJSON<Result<void>>,
        transfer_on_default: this.txFromJSON<Result<void>>,
        withdraw_encumbered: this.txFromJSON<Result<void>>
  }
}