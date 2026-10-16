use soroban_sdk::{contracttype, Address};

/// Vault configuration; all rates in basis points, times in ledger seconds.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub usdc: Address,
    pub registry: Address,
    pub max_ltv_bps: u32,
    pub base_haircut_bps: u32,
    pub valuation_max_age_secs: u64,
    pub max_rate_bps: u32,
    pub grace_secs: u64,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LoanStatus {
    Requested = 0,
    Funded = 1,
    Repaid = 2,
    Defaulted = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Loan {
    pub loan_id: u64,
    pub lot_id: u64,
    pub borrower: Address,
    pub lender: Option<Address>,
    pub principal: i128,
    pub outstanding: i128,
    pub rate_bps: u32,
    pub start_ts: u64,
    pub maturity_ts: u64,
    pub last_accrual_ts: u64,
    pub status: LoanStatus,
}

pub fn default_config(usdc: Address, registry: Address) -> Config {
    Config {
        usdc,
        registry,
        max_ltv_bps: 6_000,
        base_haircut_bps: 1_500,
        valuation_max_age_secs: 604_800,
        max_rate_bps: 3_000,
        grace_secs: 0,
    }
}
