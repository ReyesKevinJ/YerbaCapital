#![no_std]

mod errors;
mod events;
mod loan;
mod math;
mod storage;
mod types;

#[cfg(test)]
mod test;

pub use errors::Error;
pub use types::{Config, Loan, LoanStatus};

use soroban_sdk::{contract, contractclient, contractimpl, panic_with_error, Address, Env};
use yerbacapital_shared::Lot;

/// Locally-declared view of the registry. Depending on the registry *contract*
/// crate here would pull its exported symbols into this wasm and fail to link,
/// so only the ABI this contract uses is declared.
#[contractclient(name = "RegistryGateway")]
pub trait RegistryInterface {
    fn get_lot(env: Env, lot_id: u64) -> Lot;
    fn lock(env: Env, vault: Address, lot_id: u64);
    fn unlock(env: Env, vault: Address, lot_id: u64);
    fn transfer_on_default(env: Env, vault: Address, lot_id: u64, new_owner: Address);
}

#[contract]
pub struct Vault;

#[contractimpl]
impl Vault {
    pub fn initialize(
        env: Env,
        admin: Address,
        usdc: Address,
        registry: Address,
    ) -> Result<(), Error> {
        if storage::has_admin(&env) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        storage::set_admin(&env, &admin);
        let config = types::default_config(usdc, registry);
        validate_config(&config)?;
        storage::set_config(&env, &config);
        Ok(())
    }

    pub fn set_config(env: Env, config: Config) -> Result<(), Error> {
        let admin = require_admin(&env)?;
        admin.require_auth();
        validate_config(&config)?;
        storage::set_config(&env, &config);
        events::ConfigUpdated { admin }.publish(&env);
        Ok(())
    }

    pub fn request_loan(
        env: Env,
        borrower: Address,
        lot_id: u64,
        principal: i128,
        rate_bps: u32,
        maturity_ts: u64,
    ) -> Result<u64, Error> {
        borrower.require_auth();
        let config = get_config(&env)?;
        loan::request_loan(
            &env,
            &config,
            &borrower,
            lot_id,
            principal,
            rate_bps,
            maturity_ts,
        )
    }

    pub fn fund_loan(env: Env, lender: Address, loan_id: u64) -> Result<(), Error> {
        lender.require_auth();
        let config = get_config(&env)?;
        loan::fund_loan(&env, &config, &lender, loan_id)
    }

    pub fn repay(env: Env, payer: Address, loan_id: u64, amount: i128) -> Result<(), Error> {
        payer.require_auth();
        let config = get_config(&env)?;
        loan::repay(&env, &config, &payer, loan_id, amount)
    }

    /// Anyone may flag a matured or impaired loan as defaulted; the state
    /// change is decided by coded rules, not by the caller.
    pub fn mark_default(env: Env, caller: Address, loan_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let config = get_config(&env)?;
        loan::mark_default(&env, &config, &caller, loan_id)
    }

    pub fn claim_collateral(env: Env, lender: Address, loan_id: u64) -> Result<(), Error> {
        lender.require_auth();
        let config = get_config(&env)?;
        loan::claim_collateral(&env, &config, &lender, loan_id)
    }

    /// Called by the registry before allowing a partial withdrawal on an
    /// encumbered lot. The registry passes the lot's valuation and current
    /// weight so this stays a pure computation (no re-entrant registry call).
    /// Read-only: no auth, no state change.
    pub fn is_withdrawal_allowed(
        env: Env,
        lot_id: u64,
        remaining_kg: u64,
        valuation: i128,
        net_kg: u64,
    ) -> bool {
        let config = match get_config(&env) {
            Ok(c) => c,
            Err(_) => return false,
        };
        loan::is_withdrawal_allowed(&env, &config, lot_id, remaining_kg, valuation, net_kg)
    }

    // --- read-only views ---

    pub fn get_loan(env: Env, loan_id: u64) -> Result<Loan, Error> {
        storage::get_loan(&env, loan_id).ok_or(Error::LoanNotFound)
    }

    pub fn get_config(env: Env) -> Config {
        // The vault is always initialized before use; a missing config is a
        // deployment error, so surface it as a coded error.
        storage::get_config(&env).unwrap_or_else(|| panic_with_error!(&env, Error::NotAuthorized))
    }
}

fn require_admin(env: &Env) -> Result<Address, Error> {
    storage::get_admin(env).ok_or(Error::NotAuthorized)
}

fn get_config(env: &Env) -> Result<Config, Error> {
    storage::get_config(env).ok_or(Error::NotAuthorized)
}

fn validate_config(config: &Config) -> Result<(), Error> {
    let out_of_bounds = config.max_ltv_bps == 0
        || config.max_ltv_bps > 9_000
        || config.base_haircut_bps > 9_000
        || config.max_rate_bps > 9_000
        || config.valuation_max_age_secs == 0;
    if out_of_bounds {
        return Err(Error::ParamOutOfBounds);
    }
    Ok(())
}
