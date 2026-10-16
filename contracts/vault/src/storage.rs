use crate::types::{Config, Loan};
use soroban_sdk::{contracttype, Env};

pub const DAY_IN_LEDGERS: u32 = 17_280;
pub const TTL_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
pub const TTL_EXTEND_TO: u32 = 120 * DAY_IN_LEDGERS;

#[contracttype]
pub enum DataKey {
    Admin,
    Config,
    NextLoanId,
    Loan(u64),
    LotLoan(u64),
}

pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

pub fn set_admin(env: &Env, admin: &soroban_sdk::Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
    bump_instance(env);
}

pub fn get_admin(env: &Env) -> Option<soroban_sdk::Address> {
    env.storage().instance().get(&DataKey::Admin)
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn set_config(env: &Env, config: &Config) {
    env.storage().instance().set(&DataKey::Config, config);
    bump_instance(env);
}

pub fn get_config(env: &Env) -> Option<Config> {
    env.storage().instance().get(&DataKey::Config)
}

pub fn next_loan_id(env: &Env) -> u64 {
    let id: u64 = env
        .storage()
        .instance()
        .get(&DataKey::NextLoanId)
        .unwrap_or(0);
    env.storage()
        .instance()
        .set(&DataKey::NextLoanId, &(id + 1));
    bump_instance(env);
    id
}

pub fn set_loan(env: &Env, loan: &Loan) {
    let key = DataKey::Loan(loan.loan_id);
    env.storage().persistent().set(&key, loan);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn get_loan(env: &Env, loan_id: u64) -> Option<Loan> {
    env.storage().persistent().get(&DataKey::Loan(loan_id))
}

pub fn set_lot_loan(env: &Env, lot_id: u64, loan_id: u64) {
    let key = DataKey::LotLoan(lot_id);
    env.storage().persistent().set(&key, &loan_id);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn get_lot_loan(env: &Env, lot_id: u64) -> Option<u64> {
    env.storage().persistent().get(&DataKey::LotLoan(lot_id))
}

pub fn clear_lot_loan(env: &Env, lot_id: u64) {
    env.storage().persistent().remove(&DataKey::LotLoan(lot_id));
}
