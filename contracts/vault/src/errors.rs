use soroban_sdk::contracterror;

/// Stable, append-only error codes shared with `docs/contract-spec.md` §7.7.
/// Codes 1–24 are reserved across both contracts; new codes are appended from 25.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotAuthorized = 2,
    LotNotFound = 5,
    InvalidLotStatus = 6,
    LotImpaired = 12,
    ValuationStale = 13,
    ExceedsMaxPrincipal = 14,
    LoanNotFound = 15,
    InvalidLoanStatus = 16,
    NotMatured = 17,
    AmountInvalid = 18,
    MathOverflow = 19,
    ParamOutOfBounds = 20,
    WithdrawalBreaksLtv = 22,
    OnlyVault = 23,
    UnsupportedCommodity = 24,
    // Appended after registry's `LotExists = 25` to keep the shared code space
    // collision-free.
    AlreadyFunded = 26,
    ActiveLoanExists = 27,
}
