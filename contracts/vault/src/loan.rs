use crate::{
    math,
    types::{Loan, LoanStatus},
    Error,
};
use soroban_sdk::Address;

pub fn debt_at(loan: &Loan, now: u64) -> Result<i128, Error> {
    match loan.status {
        LoanStatus::Requested | LoanStatus::Cancelled | LoanStatus::Repaid => Ok(0),
        LoanStatus::Liquidated => Ok(loan.exposure_at_claim),
        _ => {
            let elapsed = now
                .checked_sub(loan.last_accrued_at)
                .ok_or(Error::MathOverflow)?;
            let accrued = math::interest(loan.principal_outstanding, loan.rate_bps, elapsed)?;
            loan.principal_outstanding
                .checked_add(loan.interest_due)
                .and_then(|n| n.checked_add(accrued))
                .ok_or(Error::MathOverflow)
        }
    }
}

pub fn accrue(loan: &mut Loan, now: u64) -> Result<(), Error> {
    let elapsed = now
        .checked_sub(loan.last_accrued_at)
        .ok_or(Error::MathOverflow)?;
    let accrued = math::interest(loan.principal_outstanding, loan.rate_bps, elapsed)?;
    loan.interest_due = loan
        .interest_due
        .checked_add(accrued)
        .ok_or(Error::MathOverflow)?;
    loan.last_accrued_at = now;
    Ok(())
}

pub fn lender(loan: &Loan) -> Result<Address, Error> {
    loan.lender.clone().ok_or(Error::InvalidLoanStatus)
}

pub fn active(loan: &Loan) -> Result<(), Error> {
    if !matches!(
        loan.status,
        LoanStatus::Funded | LoanStatus::PartiallyRepaid
    ) {
        return Err(Error::InvalidLoanStatus);
    }
    Ok(())
}
