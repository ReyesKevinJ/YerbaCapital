use soroban_sdk::{contracttype, Address, Env};
use yerbacapital_shared::{Lot, Params, Role};

/// ~30 days at 5s ledgers; records that live longer are topped up on write (AGENTS.md §8.4).
pub const DAY_IN_LEDGERS: u32 = 17_280;
pub const TTL_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
pub const TTL_EXTEND_TO: u32 = 120 * DAY_IN_LEDGERS;

#[contracttype]
pub enum DataKey {
    Admin,
    Vault,
    Params,
    Role(Address, Role),
    Lot(u64),
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
    bump_instance(env);
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

pub fn set_params(env: &Env, params: &Params) {
    env.storage().instance().set(&DataKey::Params, params);
    bump_instance(env);
}

pub fn get_params(env: &Env) -> Params {
    env.storage()
        .instance()
        .get(&DataKey::Params)
        .unwrap_or_else(yerbacapital_shared::default_params)
}

pub fn set_vault(env: &Env, vault: &Address) {
    env.storage().instance().set(&DataKey::Vault, vault);
    bump_instance(env);
}

pub fn get_vault(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Vault)
}

pub fn set_role(env: &Env, account: &Address, role: Role, enabled: bool) {
    let key = DataKey::Role(account.clone(), role);
    env.storage().persistent().set(&key, &enabled);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn has_role(env: &Env, account: &Address, role: Role) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Role(account.clone(), role))
        .unwrap_or(false)
}

pub fn has_lot(env: &Env, lot_id: u64) -> bool {
    env.storage().persistent().has(&DataKey::Lot(lot_id))
}

pub fn set_lot(env: &Env, lot: &Lot) {
    let key = DataKey::Lot(lot.lot_id);
    env.storage().persistent().set(&key, lot);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn get_lot(env: &Env, lot_id: u64) -> Option<Lot> {
    env.storage().persistent().get(&DataKey::Lot(lot_id))
}
