use crate::{
    errors::Error,
    events, math, storage,
    types::{Config, Loan, LoanStatus},
    RegistryGateway,
};
use soroban_sdk::{token, Address, Env};
use yerbacapital_shared::{Lot, LotStatus};

/// Reads a lot from the registry, mapping any registry failure to a vault error
/// instead of letting a cross-contract panic abort the whole invocation.
fn fetch_lot(env: &Env, config: &Config, lot_id: u64) -> Result<Lot, Error> {
    let client = RegistryGateway::new(env, &config.registry);
    match client.try_get_lot(&lot_id) {
        Ok(Ok(lot)) => Ok(lot),
        _ => Err(Error::LotNotFound),
    }
}

fn require_fresh_valuation(env: &Env, config: &Config, valuation_ts: u64) -> Result<(), Error> {
    let now = env.ledger().timestamp();
    if valuation_ts == 0 || now > valuation_ts.saturating_add(config.valuation_max_age_secs) {
        return Err(Error::ValuationStale);
    }
    Ok(())
}

/// Accrues simple interest onto `outstanding` and returns the amount added
/// (zero when no time has passed). Rounds up, against the borrower.
fn accrue(env: &Env, loan: &mut Loan) -> Result<i128, Error> {
    let now = env.ledger().timestamp();
    if now <= loan.last_accrual_ts || loan.outstanding == 0 {
        return Ok(0);
    }
    let dt = now - loan.last_accrual_ts;
    let add = math::interest(loan.outstanding, loan.rate_bps, dt).ok_or(Error::MathOverflow)?;
    loan.outstanding = loan
        .outstanding
        .checked_add(add)
        .ok_or(Error::MathOverflow)?;
    loan.last_accrual_ts = now;
    Ok(add)
}

pub fn request_loan(
    env: &Env,
    config: &Config,
    borrower: &Address,
    lot_id: u64,
    principal: i128,
    rate_bps: u32,
    maturity_ts: u64,
) -> Result<u64, Error> {
    if principal <= 0 {
        return Err(Error::AmountInvalid);
    }
    if rate_bps > config.max_rate_bps {
        return Err(Error::ParamOutOfBounds);
    }
    let now = env.ledger().timestamp();
    if maturity_ts <= now {
        return Err(Error::ParamOutOfBounds);
    }
    if storage::get_lot_loan(env, lot_id).is_some() {
        return Err(Error::ActiveLoanExists);
    }

    let lot = fetch_lot(env, config, lot_id)?;
    if lot.owner != *borrower {
        return Err(Error::NotAuthorized);
    }
    if lot.status != LotStatus::Receipted {
        return Err(Error::InvalidLotStatus);
    }
    require_fresh_valuation(env, config, lot.valuation_ts)?;

    let max = math::max_principal(lot.valuation, config.base_haircut_bps, config.max_ltv_bps)
        .ok_or(Error::MathOverflow)?;
    if principal > max {
        return Err(Error::ExceedsMaxPrincipal);
    }

    RegistryGateway::new(env, &config.registry).lock(&env.current_contract_address(), &lot_id);

    let loan_id = storage::next_loan_id(env);
    let loan = Loan {
        loan_id,
        lot_id,
        borrower: borrower.clone(),
        lender: None,
        principal,
        outstanding: principal,
        rate_bps,
        start_ts: 0,
        maturity_ts,
        last_accrual_ts: 0,
        status: LoanStatus::Requested,
    };
    storage::set_loan(env, &loan);
    storage::set_lot_loan(env, lot_id, loan_id);

    events::LoanRequested {
        loan_id,
        lot_id,
        borrower: borrower.clone(),
        principal,
        rate_bps,
        maturity_ts,
    }
    .publish(env);
    Ok(loan_id)
}

pub fn fund_loan(env: &Env, config: &Config, lender: &Address, loan_id: u64) -> Result<(), Error> {
    let mut loan = storage::get_loan(env, loan_id).ok_or(Error::LoanNotFound)?;
    if loan.status != LoanStatus::Requested {
        return Err(Error::AlreadyFunded);
    }

    let client = token::Client::new(env, &config.usdc);
    client.transfer(lender, &loan.borrower, &loan.principal);

    let now = env.ledger().timestamp();
    loan.lender = Some(lender.clone());
    loan.status = LoanStatus::Funded;
    loan.start_ts = now;
    loan.last_accrual_ts = now;
    storage::set_loan(env, &loan);

    events::LoanFunded {
        loan_id,
        lender: lender.clone(),
        principal: loan.principal,
    }
    .publish(env);
    Ok(())
}

pub fn repay(
    env: &Env,
    config: &Config,
    payer: &Address,
    loan_id: u64,
    amount: i128,
) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::AmountInvalid);
    }
    let mut loan = storage::get_loan(env, loan_id).ok_or(Error::LoanNotFound)?;
    if loan.status != LoanStatus::Funded {
        return Err(Error::InvalidLoanStatus);
    }
    let interest_added = accrue(env, &mut loan)?;

    if amount > loan.outstanding {
        return Err(Error::AmountInvalid);
    }

    let lender = loan.lender.clone().ok_or(Error::NotAuthorized)?;
    let client = token::Client::new(env, &config.usdc);
    client.transfer(payer, &lender, &amount);

    loan.outstanding -= amount;
    if loan.outstanding == 0 {
        loan.status = LoanStatus::Repaid;
        storage::clear_lot_loan(env, loan.lot_id);
        RegistryGateway::new(env, &config.registry)
            .unlock(&env.current_contract_address(), &loan.lot_id);
    }
    storage::set_loan(env, &loan);

    let interest_part = if amount >= interest_added {
        interest_added
    } else {
        amount
    };
    events::LoanRepaid {
        loan_id,
        payer: payer.clone(),
        amount,
        interest_part,
        principal_part: amount - interest_part,
        outstanding: loan.outstanding,
    }
    .publish(env);
    Ok(())
}

pub fn mark_default(
    env: &Env,
    config: &Config,
    caller: &Address,
    loan_id: u64,
) -> Result<(), Error> {
    let mut loan = storage::get_loan(env, loan_id).ok_or(Error::LoanNotFound)?;
    if loan.status != LoanStatus::Funded {
        return Err(Error::InvalidLoanStatus);
    }
    let _ = accrue(env, &mut loan)?;

    let lot = fetch_lot(env, config, loan.lot_id)?;
    let now = env.ledger().timestamp();
    let matured = now >= loan.maturity_ts.saturating_add(config.grace_secs);
    let impaired = lot.status == LotStatus::Impaired;

    // Default needs the loan to be past maturity, or the collateral to be
    // impaired — never before maturity otherwise (AGENTS.md §8.6).
    if !impaired && !matured {
        return Err(Error::NotMatured);
    }

    loan.status = LoanStatus::Defaulted;
    storage::set_loan(env, &loan);
    events::LoanDefaulted {
        loan_id,
        caller: caller.clone(),
        outstanding: loan.outstanding,
    }
    .publish(env);
    Ok(())
}

pub fn claim_collateral(
    env: &Env,
    config: &Config,
    caller: &Address,
    loan_id: u64,
) -> Result<(), Error> {
    let mut loan = storage::get_loan(env, loan_id).ok_or(Error::LoanNotFound)?;
    if loan.status != LoanStatus::Defaulted {
        return Err(Error::InvalidLoanStatus);
    }
    let lender = loan.lender.clone().ok_or(Error::NotAuthorized)?;
    if lender != *caller {
        return Err(Error::NotAuthorized);
    }
    let _ = accrue(env, &mut loan)?;

    // The on-chain claim is over the receipt; physical recovery is off-chain
    // and requires the custodian and a legal procedure (AGENTS.md §1.3).
    RegistryGateway::new(env, &config.registry).transfer_on_default(
        &env.current_contract_address(),
        &loan.lot_id,
        &lender,
    );
    storage::clear_lot_loan(env, loan.lot_id);
    storage::set_loan(env, &loan);

    events::CollateralClaimed {
        loan_id,
        lot_id: loan.lot_id,
        lender,
        outstanding: loan.outstanding,
    }
    .publish(env);
    Ok(())
}

/// Read-only view used by the registry to gate partial withdrawal while a
/// receipt is encumbered: the remaining collateral must still cover the debt.
/// All lot data is passed in to avoid a re-entrant registry call.
pub fn is_withdrawal_allowed(
    env: &Env,
    config: &Config,
    lot_id: u64,
    remaining_kg: u64,
    valuation: i128,
    net_kg: u64,
) -> bool {
    let loan_id = match storage::get_lot_loan(env, lot_id) {
        Some(id) => id,
        None => return true,
    };
    let loan = match storage::get_loan(env, loan_id) {
        Some(l) => l,
        None => return true,
    };
    if loan.status != LoanStatus::Funded {
        return true;
    }
    if net_kg == 0 {
        return false;
    }
    let scaled_value = match valuation
        .checked_mul(remaining_kg as i128)
        .and_then(|v| v.checked_div(net_kg as i128))
    {
        Some(v) => v,
        None => return false,
    };
    let max = match math::max_principal(scaled_value, config.base_haircut_bps, config.max_ltv_bps) {
        Some(m) => m,
        None => return false,
    };
    loan.outstanding <= max
}
