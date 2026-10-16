use crate::errors::Error;
use soroban_sdk::{contracttype, Address, BytesN, Symbol};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Role {
    Custodian,
    Verifier,
    PriceOracle,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PhysicalStatus {
    Registered,
    Verified,
    Rejected,
    Impaired,
    Closed,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ReceiptStatus {
    Unissued,
    Receipted,
    Encumbered,
    Retired,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AgingMethod {
    Natural,
    Accelerated,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InspectionKind {
    Passed,
    MoistureDrift,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ImpairmentReason {
    Moisture,
    Pest,
    Fire,
    Theft,
    Flood,
    Other,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AttestationKind {
    Declared,
    DepositVerified,
    Rejected,
    Valued,
    Inspection(InspectionKind),
    Impaired(ImpairmentReason),
    PartialWithdrawal,
    FinalWithdrawal,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Attestation {
    pub kind: AttestationKind,
    pub actor: Address,
    pub co_signer: Option<Address>,
    pub evidence: BytesN<32>,
    pub recorded_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RegistryParams {
    pub moisture_min_bps: u32,
    pub moisture_max_bps: u32,
    pub min_lot_kg: u64,
}

impl Default for RegistryParams {
    fn default() -> Self {
        Self {
            moisture_min_bps: 300,
            moisture_max_bps: 700,
            min_lot_kg: 1_000,
        }
    }
}

impl RegistryParams {
    pub fn validate(&self) -> Result<(), Error> {
        if self.moisture_min_bps >= self.moisture_max_bps
            || self.moisture_max_bps > 2_000
            || self.min_lot_kg == 0
            || self.min_lot_kg > 1_000_000
        {
            return Err(Error::ParamOutOfBounds);
        }
        Ok(())
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Lot {
    pub id: u64,
    pub commodity: Symbol,
    pub owner: Address,
    pub original_borrower: Address,
    pub custodian: Address,
    pub verifier: Option<Address>,
    pub physical_status: PhysicalStatus,
    pub receipt_status: ReceiptStatus,
    pub loan_id: Option<u64>,
    pub initial_verified_kg: u64,
    pub net_kg: u64,
    pub withdrawn_kg: u64,
    pub recorded_losses_kg: u64,
    pub moisture_bps: u32,
    pub warehouse_id: BytesN<32>,
    pub aging_method: AgingMethod,
    pub aging_started_at: u64,
    pub verification_evidence: Option<BytesN<32>>,
    pub valuation: i128,
    pub valued_kg: u64,
    pub valued_at: u64,
    pub moisture_drift: bool,
    pub last_attestation: Attestation,
}
