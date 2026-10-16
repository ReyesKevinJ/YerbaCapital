use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
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
    LotImpaired = 12,
    ValuationStale = 13,
    ExceedsMaxPrincipal = 14,
    LoanNotFound = 15,
    InvalidLoanStatus = 16,
    NotMatured = 17,
    AmountInvalid = 18,
    MathOverflow = 19,
    ParamOutOfBounds = 20,
    Paused = 21,
    WithdrawalBreaksLtv = 22,
    OnlyVault = 23,
    UnsupportedCommodity = 24,
    VaultNotConfigured = 25,
    VaultAlreadyConfigured = 26,
    InvalidDuration = 27,
    InvalidAddress = 28,
}
