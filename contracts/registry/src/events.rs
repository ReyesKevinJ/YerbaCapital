use soroban_sdk::{contractevent, Address, BytesN};
use yerbacapital_shared::{Commodity, Role};

// Event names and topics are a stable API (AGENTS.md §6): append only.

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotRegistered {
    #[topic]
    pub lot_id: u64,
    pub owner: Address,
    pub commodity: Commodity,
    pub net_kg: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotVerified {
    #[topic]
    pub lot_id: u64,
    pub verifier: Address,
    pub custodian: Address,
    pub moisture_bps: u32,
    pub net_kg: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotRejected {
    #[topic]
    pub lot_id: u64,
    pub verifier: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReceiptIssued {
    #[topic]
    pub lot_id: u64,
    pub owner: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReceiptTransferred {
    #[topic]
    pub lot_id: u64,
    pub from: Address,
    pub to: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValuationPosted {
    #[topic]
    pub lot_id: u64,
    pub oracle: Address,
    pub valuation: i128,
    pub timestamp: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InspectionRecorded {
    #[topic]
    pub lot_id: u64,
    pub verifier: Address,
    pub moisture_bps: u32,
    pub net_kg: u64,
    pub evidence_hash: BytesN<32>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotImpaired {
    #[topic]
    pub lot_id: u64,
    pub verifier: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PartialWithdrawal {
    #[topic]
    pub lot_id: u64,
    pub remaining_kg: u64,
    pub evidence_hash: BytesN<32>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SaleConfirmed {
    #[topic]
    pub lot_id: u64,
    pub buyer_hash: BytesN<32>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotClosed {
    #[topic]
    pub lot_id: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CollateralLocked {
    #[topic]
    pub lot_id: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CollateralUnlocked {
    #[topic]
    pub lot_id: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleGranted {
    #[topic]
    pub account: Address,
    pub role: Role,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleRevoked {
    #[topic]
    pub account: Address,
    pub role: Role,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ParamsUpdated {
    pub admin: Address,
}
