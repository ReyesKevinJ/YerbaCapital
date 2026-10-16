use crate::Error;
use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LoanStatus {
    Requested,
    Cancelled,
    Funded,
    PartiallyRepaid,
    Repaid,
    Defaulted,
    Liquidated,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultConfig {
    pub admin: Address,
    pub registry: Address,
    pub settlement_asset: Address,
    pub paused: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultParams {
    pub max_ltv_bps: u32,
    pub base_haircut_bps: u32,
    pub valuation_max_age_secs: u64,
    pub max_rate_bps: u32,
    pub max_natural_duration_secs: u64,
    pub max_accelerated_duration_secs: u64,
    pub grace_period_secs: u64,
    pub moisture_edge_bps: u32,
    pub edge_risk_bps: u32,
    pub drift_risk_bps: u32,
}

impl Default for VaultParams {
    fn default() -> Self {
        Self {
            max_ltv_bps: 6_000,
            base_haircut_bps: 1_500,
            valuation_max_age_secs: 604_800,
            max_rate_bps: 3_000,
            max_natural_duration_secs: 31_536_000,
            max_accelerated_duration_secs: 5_184_000,
            grace_period_secs: 0,
            moisture_edge_bps: 50,
            edge_risk_bps: 500,
            drift_risk_bps: 500,
        }
    }
}

impl VaultParams {
    pub fn validate(&self) -> Result<(), Error> {
        if self.max_ltv_bps == 0
            || self.max_ltv_bps > 8_000
            || self.base_haircut_bps > 5_000
            || !(3_600..=2_592_000).contains(&self.valuation_max_age_secs)
            || self.max_rate_bps > 10_000
            || !(86_400..=31_536_000).contains(&self.max_natural_duration_secs)
            || !(86_400..=5_184_000).contains(&self.max_accelerated_duration_secs)
            || self.grace_period_secs > 2_592_000
            || self.moisture_edge_bps > 200
            || self.edge_risk_bps > 1_500
            || self.drift_risk_bps > 1_500
        {
            return Err(Error::ParamOutOfBounds);
        }
        Ok(())
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Loan {
    pub id: u64,
    pub lot_id: u64,
    pub borrower: Address,
    pub lender: Option<Address>,
    pub principal: i128,
    pub principal_outstanding: i128,
    pub interest_due: i128,
    pub rate_bps: u32,
    pub duration_secs: u64,
    pub funded_at: u64,
    pub maturity: u64,
    pub last_accrued_at: u64,
    pub status: LoanStatus,
    pub policy: VaultParams,
    pub exposure_at_claim: i128,
}
