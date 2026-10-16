use crate::types::{Loan, VaultParams};
use soroban_sdk::{contractevent, Address, Symbol};

#[contractevent(topics = ["LoanRequested"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoanRequested {
    #[topic]
    pub lot_id: u64,
    #[topic]
    pub loan_id: u64,
    pub loan: Loan,
    pub actor: Address,
    pub settlement_asset: Address,
    pub timestamp: u64,
}

#[contractevent(topics = ["LoanCancelled"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoanCancelled {
    #[topic]
    pub lot_id: u64,
    #[topic]
    pub loan_id: u64,
    pub loan: Loan,
    pub actor: Address,
    pub settlement_asset: Address,
    pub timestamp: u64,
}

#[contractevent(topics = ["LoanFunded"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoanFunded {
    #[topic]
    pub lot_id: u64,
    #[topic]
    pub loan_id: u64,
    pub loan: Loan,
    pub actor: Address,
    pub settlement_asset: Address,
    pub timestamp: u64,
}

#[contractevent(topics = ["LoanDefaulted"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoanDefaulted {
    #[topic]
    pub lot_id: u64,
    #[topic]
    pub loan_id: u64,
    pub loan: Loan,
    pub actor: Address,
    pub settlement_asset: Address,
    pub timestamp: u64,
    pub by_impairment: bool,
}

#[contractevent(topics = ["CollateralClaimed"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CollateralClaimed {
    #[topic]
    pub lot_id: u64,
    #[topic]
    pub loan_id: u64,
    pub loan: Loan,
    pub actor: Address,
    pub settlement_asset: Address,
    pub timestamp: u64,
}

#[contractevent(topics = ["LoanRepaid"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoanRepaid {
    #[topic]
    pub lot_id: u64,
    #[topic]
    pub loan_id: u64,
    pub loan: Loan,
    pub payer: Address,
    pub amount: i128,
    pub interest_part: i128,
    pub principal_part: i128,
    pub settlement_asset: Address,
    pub timestamp: u64,
}

#[contractevent(topics = ["ParamsUpdated"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ParamsUpdated {
    #[topic]
    pub policy: Symbol,
    pub admin: Address,
    pub params: VaultParams,
    pub paused: bool,
    pub timestamp: u64,
}
