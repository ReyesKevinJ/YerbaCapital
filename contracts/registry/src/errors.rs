use soroban_sdk::contracterror;

/// Stable, append-only error codes shared with `docs/contract-spec.md` §7.7.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotAuthorized = 2,
    RoleMissing = 3,
    RoleConflict = 4,
    LotNotFound = 5,
    InvalidLotStatus = 6,
    MoistureOutOfBand = 7,
    WeightInvalid = 8,
    EvidenceMissing = 9,
    ReceiptLocked = 10,
    NotReceiptOwner = 11,
    AmountInvalid = 18,
    ParamOutOfBounds = 20,
    WithdrawalBreaksLtv = 22,
    OnlyVault = 23,
    UnsupportedCommodity = 24,
    LotExists = 25,
}
