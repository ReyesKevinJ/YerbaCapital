//! Collateral and interest math. Integer-only, multiply before divide, and
//! round against the beneficiary: `max_principal` rounds down, debt rounds up
//! (AGENTS.md §8.2, `docs/contract-spec.md` §7.8).

pub const BPS_DENOM: i128 = 10_000;
pub const SECONDS_PER_YEAR: i128 = 31_536_000;

/// Applies the haircut to a posted valuation.
pub fn collateral_value(valuation: i128, haircut_bps: u32) -> Option<i128> {
    let keep = BPS_DENOM.checked_sub(haircut_bps as i128)?;
    valuation.checked_mul(keep)?.checked_div(BPS_DENOM)
}

/// Maximum principal a valuation supports; rounds down (against the borrower).
pub fn max_principal(valuation: i128, haircut_bps: u32, max_ltv_bps: u32) -> Option<i128> {
    let cv = collateral_value(valuation, haircut_bps)?;
    cv.checked_mul(max_ltv_bps as i128)?.checked_div(BPS_DENOM)
}

/// Simple interest over `dt` seconds; rounds up (against the borrower).
pub fn interest(outstanding: i128, rate_bps: u32, dt: u64) -> Option<i128> {
    let numer = outstanding
        .checked_mul(rate_bps as i128)?
        .checked_mul(dt as i128)?;
    let denom = BPS_DENOM.checked_mul(SECONDS_PER_YEAR)?;
    numer.checked_add(denom.checked_sub(1)?)?.checked_div(denom)
}
