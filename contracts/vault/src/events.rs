use soroban_sdk::{contractevent, Address};

// Event names/topics are a stable API (AGENTS.md §6): append only.

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoanRequested {
    #[topic]
    pub loan_id: u64,
    pub lot_id: u64,
    pub borrower: Address,
    pub principal: i128,
    pub rate_bps: u32,
    pub maturity_ts: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoanFunded {
    #[topic]
    pub loan_id: u64,
    pub lender: Address,
    pub principal: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoanRepaid {
    #[topic]
    pub loan_id: u64,
    pub payer: Address,
    pub amount: i128,
    pub interest_part: i128,
    pub principal_part: i128,
    pub outstanding: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LoanDefaulted {
    #[topic]
    pub loan_id: u64,
    pub caller: Address,
    pub outstanding: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CollateralClaimed {
    #[topic]
    pub loan_id: u64,
    pub lot_id: u64,
    pub lender: Address,
    pub outstanding: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigUpdated {
    pub admin: Address,
}
