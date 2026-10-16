use crate::types::{Lot, RegistryParams, Role};
use soroban_sdk::{contractevent, Address, Symbol};

#[contractevent(topics = ["LotRegistered"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotRegistered {
    #[topic]
    pub lot_id: u64,
    pub lot: Lot,
    pub timestamp: u64,
}

#[contractevent(topics = ["LotVerified"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotVerified {
    #[topic]
    pub lot_id: u64,
    pub lot: Lot,
    pub timestamp: u64,
}

#[contractevent(topics = ["LotRejected"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotRejected {
    #[topic]
    pub lot_id: u64,
    pub lot: Lot,
    pub timestamp: u64,
}

#[contractevent(topics = ["ReceiptIssued"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReceiptIssued {
    #[topic]
    pub lot_id: u64,
    pub lot: Lot,
    pub timestamp: u64,
}

#[contractevent(topics = ["ValuationPosted"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValuationPosted {
    #[topic]
    pub lot_id: u64,
    pub lot: Lot,
    pub timestamp: u64,
}

#[contractevent(topics = ["InspectionRecorded"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InspectionRecorded {
    #[topic]
    pub lot_id: u64,
    pub lot: Lot,
    pub timestamp: u64,
}

#[contractevent(topics = ["LotImpaired"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotImpaired {
    #[topic]
    pub lot_id: u64,
    pub lot: Lot,
    pub timestamp: u64,
}

#[contractevent(topics = ["PartialWithdrawal"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PartialWithdrawal {
    #[topic]
    pub lot_id: u64,
    pub lot: Lot,
    pub timestamp: u64,
}

#[contractevent(topics = ["LotClosed"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotClosed {
    #[topic]
    pub lot_id: u64,
    pub lot: Lot,
    pub timestamp: u64,
}

#[contractevent(topics = ["ReceiptTransferred"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReceiptTransferred {
    #[topic]
    pub lot_id: u64,
    pub previous_owner: Address,
    pub new_owner: Address,
    pub loan_id: Option<u64>,
    pub by_default: bool,
    pub timestamp: u64,
}

#[contractevent(topics = ["CollateralLocked"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CollateralLocked {
    #[topic]
    pub lot_id: u64,
    #[topic]
    pub loan_id: u64,
    pub owner: Address,
    pub timestamp: u64,
}

#[contractevent(topics = ["CollateralUnlocked"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CollateralUnlocked {
    #[topic]
    pub lot_id: u64,
    #[topic]
    pub loan_id: u64,
    pub timestamp: u64,
}

#[contractevent(topics = ["RoleGranted"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleGranted {
    pub actor: Address,
    pub address: Address,
    pub role: Role,
    pub timestamp: u64,
}

#[contractevent(topics = ["RoleRevoked"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleRevoked {
    pub actor: Address,
    pub address: Address,
    pub role: Role,
    pub timestamp: u64,
}

#[contractevent(topics = ["ParamsUpdated"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ParamsUpdated {
    #[topic]
    pub policy: Symbol,
    pub admin: Address,
    pub params: RegistryParams,
    pub vault: Option<Address>,
    pub timestamp: u64,
}
