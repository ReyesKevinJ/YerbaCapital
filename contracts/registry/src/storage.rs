use crate::{
    errors::Error,
    types::{Lot, RegistryParams, Role},
};
use soroban_sdk::{contracttype, Address, Env};

const TTL_THRESHOLD: u32 = 30 * 17_280;
const TTL_EXTEND_TO: u32 = 120 * 17_280;

#[contracttype]
#[derive(Clone)]
pub(crate) enum Key {
    Admin,
    Vault,
    Params,
    NextLot,
    Role(Address, Role),
    Lot(u64),
}

pub fn touch(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn admin(env: &Env) -> Address {
    touch(env);
    env.storage()
        .instance()
        .get(&Key::Admin)
        .unwrap_or_else(|| soroban_sdk::panic_with_error!(env, Error::NotAuthorized))
}

pub fn vault(env: &Env) -> Option<Address> {
    touch(env);
    env.storage().instance().get(&Key::Vault)
}

pub fn params(env: &Env) -> RegistryParams {
    touch(env);
    env.storage()
        .instance()
        .get(&Key::Params)
        .unwrap_or_default()
}

pub fn has_role(env: &Env, address: &Address, role: Role) -> bool {
    touch(env);
    let key = Key::Role(address.clone(), role);
    let result = env.storage().persistent().get(&key).unwrap_or(false);
    if result {
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }
    result
}

pub fn set_role(env: &Env, address: &Address, role: Role, granted: bool) {
    let key = Key::Role(address.clone(), role);
    if granted {
        env.storage().persistent().set(&key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    } else {
        env.storage().persistent().remove(&key);
    }
    touch(env);
}

pub fn lot(env: &Env, id: u64) -> Result<Lot, Error> {
    touch(env);
    let key = Key::Lot(id);
    let value = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::LotNotFound)?;
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    Ok(value)
}

pub fn put_lot(env: &Env, lot: &Lot) {
    let key = Key::Lot(lot.id);
    env.storage().persistent().set(&key, lot);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    touch(env);
}

pub fn next_id(env: &Env) -> Result<u64, Error> {
    let current: u64 = env.storage().instance().get(&Key::NextLot).unwrap_or(1);
    let next = current.checked_add(1).ok_or(Error::MathOverflow)?;
    env.storage().instance().set(&Key::NextLot, &next);
    Ok(current)
}
