#![no_std]

mod errors;
mod events;
mod lot;
mod roles;
mod storage;

#[cfg(test)]
mod test;

pub use errors::Error;
pub use yerbacapital_shared::{Commodity, Lot, LotStatus, Params, Role};

use soroban_sdk::{contract, contractclient, contractimpl, Address, BytesN, Env};

/// Minimal view of the configured vault, called by registry to gate partial
/// withdrawal while a lot is encumbered. Defined locally to avoid a circular
/// crate dependency (the vault depends on this crate). The lot's valuation and
/// current weight are passed in so the vault never has to call back into the
/// registry (which would be a forbidden re-entrant call).
#[contractclient(name = "VaultClient")]
pub trait VaultInterface {
    fn is_withdrawal_allowed(
        env: Env,
        lot_id: u64,
        remaining_kg: u64,
        valuation: i128,
        net_kg: u64,
    ) -> bool;
}

#[contract]
pub struct Registry;

#[contractimpl]
impl Registry {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if storage::has_admin(&env) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        storage::set_admin(&env, &admin);
        storage::set_params(&env, &yerbacapital_shared::default_params());
        Ok(())
    }

    pub fn set_vault(env: Env, vault: Address) -> Result<(), Error> {
        require_admin(&env)?.require_auth();
        storage::set_vault(&env, &vault);
        Ok(())
    }

    pub fn grant_role(env: Env, account: Address, role: Role) -> Result<(), Error> {
        require_admin(&env)?.require_auth();
        roles::grant(&env, &account, role);
        events::RoleGranted {
            account: account.clone(),
            role,
        }
        .publish(&env);
        Ok(())
    }

    pub fn revoke_role(env: Env, account: Address, role: Role) -> Result<(), Error> {
        require_admin(&env)?.require_auth();
        roles::revoke(&env, &account, role);
        events::RoleRevoked { account, role }.publish(&env);
        Ok(())
    }

    pub fn set_params(env: Env, params: Params) -> Result<(), Error> {
        let admin = require_admin(&env)?;
        admin.require_auth();
        lot::validate_params(&params)?;
        storage::set_params(&env, &params);
        events::ParamsUpdated { admin }.publish(&env);
        Ok(())
    }

    pub fn register_lot(
        env: Env,
        owner: Address,
        lot_id: u64,
        commodity: Commodity,
        net_kg: u64,
        custodian: Address,
        origin_hash: BytesN<32>,
    ) -> Result<(), Error> {
        owner.require_auth();
        lot::register_lot(
            &env,
            &owner,
            lot_id,
            commodity,
            net_kg,
            &custodian,
            &origin_hash,
        )
    }

    /// Issuer co-signs with the lot's custodian (AGENTS.md §8.3).
    pub fn verify_lot(
        env: Env,
        verifier: Address,
        custodian: Address,
        lot_id: u64,
        moisture_bps: u32,
        net_kg: u64,
        evidence_hash: BytesN<32>,
    ) -> Result<(), Error> {
        verifier.require_auth();
        // The custodian co-signs the physical verification, but the same
        // address may only authorize once per invocation (host constraint), so
        // skip the duplicate and let the role-separation rule reject it.
        if verifier != custodian {
            custodian.require_auth();
        }
        lot::verify_lot(
            &env,
            &verifier,
            &custodian,
            lot_id,
            moisture_bps,
            net_kg,
            &evidence_hash,
        )
    }

    pub fn reject_lot(env: Env, verifier: Address, lot_id: u64) -> Result<(), Error> {
        verifier.require_auth();
        lot::reject_lot(&env, &verifier, lot_id)
    }

    pub fn issue_receipt(env: Env, verifier: Address, lot_id: u64) -> Result<(), Error> {
        verifier.require_auth();
        lot::issue_receipt(&env, &verifier, lot_id)
    }

    pub fn post_valuation(
        env: Env,
        oracle: Address,
        lot_id: u64,
        valuation: i128,
    ) -> Result<(), Error> {
        oracle.require_auth();
        lot::post_valuation(&env, &oracle, lot_id, valuation)
    }

    pub fn transfer_receipt(
        env: Env,
        owner: Address,
        lot_id: u64,
        new_owner: Address,
    ) -> Result<(), Error> {
        owner.require_auth();
        lot::transfer_receipt(&env, &owner, lot_id, &new_owner)
    }

    /// Vault-only: encumber a receipt as loan collateral.
    pub fn lock(env: Env, vault: Address, lot_id: u64) -> Result<(), Error> {
        lot::require_vault(&env, &vault)?;
        lot::lock(&env, lot_id)
    }

    /// Vault-only: release collateral back to its owner.
    pub fn unlock(env: Env, vault: Address, lot_id: u64) -> Result<(), Error> {
        lot::require_vault(&env, &vault)?;
        lot::unlock(&env, lot_id)
    }

    /// Vault-only: transfer the receipt to the lender on default. This is an
    /// on-chain claim over the receipt, NOT physical foreclosure (AGENTS.md §1.3).
    pub fn transfer_on_default(
        env: Env,
        vault: Address,
        lot_id: u64,
        new_owner: Address,
    ) -> Result<(), Error> {
        lot::require_vault(&env, &vault)?;
        lot::transfer_on_default(&env, lot_id, &new_owner)
    }

    pub fn record_inspection(
        env: Env,
        verifier: Address,
        lot_id: u64,
        moisture_bps: u32,
        net_kg: u64,
        evidence_hash: BytesN<32>,
    ) -> Result<(), Error> {
        verifier.require_auth();
        lot::record_inspection(
            &env,
            &verifier,
            lot_id,
            moisture_bps,
            net_kg,
            &evidence_hash,
        )
    }

    pub fn impair(env: Env, verifier: Address, lot_id: u64) -> Result<(), Error> {
        verifier.require_auth();
        lot::impair(&env, &verifier, lot_id)
    }

    pub fn confirm_sale(
        env: Env,
        verifier: Address,
        lot_id: u64,
        buyer_hash: BytesN<32>,
    ) -> Result<(), Error> {
        verifier.require_auth();
        lot::confirm_sale(&env, &verifier, lot_id, &buyer_hash)
    }

    /// Custodian attests physical release and the owner authorizes it.
    pub fn partial_withdraw(
        env: Env,
        custodian: Address,
        owner: Address,
        lot_id: u64,
        kg: u64,
        evidence_hash: BytesN<32>,
    ) -> Result<(), Error> {
        custodian.require_auth();
        if custodian != owner {
            owner.require_auth();
        }
        lot::partial_withdraw(&env, &custodian, &owner, lot_id, kg, &evidence_hash)
    }

    pub fn withdraw_full(
        env: Env,
        custodian: Address,
        owner: Address,
        lot_id: u64,
    ) -> Result<(), Error> {
        custodian.require_auth();
        if custodian != owner {
            owner.require_auth();
        }
        lot::withdraw_full(&env, &custodian, &owner, lot_id)
    }

    // --- read-only views ---

    pub fn get_lot(env: Env, lot_id: u64) -> Result<Lot, Error> {
        lot::get_lot_or_err(&env, lot_id)
    }

    pub fn lot_status(env: Env, lot_id: u64) -> Result<LotStatus, Error> {
        Ok(lot::get_lot_or_err(&env, lot_id)?.status)
    }

    pub fn has_role(env: Env, account: Address, role: Role) -> bool {
        roles::has_role(&env, &account, role)
    }

    pub fn get_params(env: Env) -> Params {
        storage::get_params(&env)
    }

    pub fn get_vault(env: Env) -> Option<Address> {
        storage::get_vault(&env)
    }
}

fn require_admin(env: &Env) -> Result<Address, Error> {
    storage::get_admin(env).ok_or(Error::NotAuthorized)
}
