use crate::{errors::Error, storage};
use soroban_sdk::{Address, Env};
use yerbacapital_shared::Role;

pub fn has_role(env: &Env, account: &Address, role: Role) -> bool {
    storage::has_role(env, account, role)
}

/// Errors with [`Error::RoleMissing`] when `account` does not hold `role`.
/// Callers must have already invoked `require_auth` on `account`.
pub fn require_role(env: &Env, account: &Address, role: Role) -> Result<(), Error> {
    if !has_role(env, account, role) {
        return Err(Error::RoleMissing);
    }
    Ok(())
}

pub fn grant(env: &Env, account: &Address, role: Role) {
    storage::set_role(env, account, role, true);
}

pub fn revoke(env: &Env, account: &Address, role: Role) {
    storage::set_role(env, account, role, false);
}
