use crate::{
    errors::Error,
    storage,
    types::{Lot, Role},
};
use soroban_sdk::{Address, Env};

pub fn admin(env: &Env, actor: &Address) -> Result<(), Error> {
    actor.require_auth();
    if *actor != storage::admin(env) {
        return Err(Error::NotAuthorized);
    }
    Ok(())
}

pub fn role(env: &Env, actor: &Address, role: Role) -> Result<(), Error> {
    if !storage::has_role(env, actor, role) {
        return Err(Error::RoleMissing);
    }
    Ok(())
}

pub fn verifier(env: &Env, actor: &Address, lot: &Lot) -> Result<(), Error> {
    role(env, actor, Role::Verifier)?;
    if *actor == lot.custodian || *actor == lot.original_borrower || *actor == lot.owner {
        return Err(Error::RoleConflict);
    }
    Ok(())
}

pub fn vault(env: &Env) -> Result<Address, Error> {
    let address = storage::vault(env).ok_or(Error::VaultNotConfigured)?;
    address.require_auth();
    Ok(address)
}
