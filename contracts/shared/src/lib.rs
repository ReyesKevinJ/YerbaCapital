#![no_std]

//! Types shared by the `registry` and `vault` contracts. This crate has no
//! contract entrypoints, so depending on it never pulls another contract's
//! exported symbols into a wasm build.

use soroban_sdk::{contracttype, Address, BytesN};

/// Protocol roles. `Borrower` and `Lender` are self-declared and are therefore
/// not grantable; only the four operational roles below are assigned by admin.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Role {
    Admin = 0,
    Custodian = 1,
    Verifier = 2,
    PriceOracle = 3,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Commodity {
    YerbaCanchada = 0,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LotStatus {
    Registered = 0,
    Verified = 1,
    Rejected = 2,
    Receipted = 3,
    Encumbered = 4,
    Impaired = 5,
    Closed = 6,
}

/// A physical lot and its non-fungible warehouse receipt (ADR-001).
///
/// Only IDs, enums, amounts, timestamps, addresses and 32-byte hashes are held
/// on-chain; no PII, names or free text (AGENTS.md §1.3).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Lot {
    pub lot_id: u64,
    pub owner: Address,
    pub custodian: Address,
    pub verifier: Option<Address>,
    pub commodity: Commodity,
    pub net_kg: u64,
    pub moisture_bps: u32,
    pub status: LotStatus,
    pub origin_hash: BytesN<32>,
    pub evidence_hash: BytesN<32>,
    pub valuation: i128,
    pub valuation_ts: u64,
    pub sale_hash: Option<BytesN<32>>,
    pub created_ts: u64,
}

/// Physical plausibility parameters, bounded in code (`docs/contract-spec.md` §7.5).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Params {
    pub moisture_min_bps: u32,
    pub moisture_max_bps: u32,
    pub min_lot_kg: u64,
}

pub fn default_params() -> Params {
    Params {
        moisture_min_bps: 300,
        moisture_max_bps: 700,
        min_lot_kg: 1_000,
    }
}
