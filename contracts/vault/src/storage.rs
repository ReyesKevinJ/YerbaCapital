use crate::{
    types::{Loan, VaultConfig, VaultParams},
    Error,
};
use soroban_sdk::{contracttype, Env};

const THRESHOLD: u32 = 30 * 17_280;
const EXTEND_TO: u32 = 120 * 17_280;
#[contracttype]
#[derive(Clone)]
pub(crate) enum Key {
    Config,
    Params,
    NextLoan,
    Loan(u64),
}

pub fn touch(env: &Env) {
    env.storage().instance().extend_ttl(THRESHOLD, EXTEND_TO);
}
pub fn config(env: &Env) -> VaultConfig {
    touch(env);
    env.storage()
        .instance()
        .get(&Key::Config)
        .unwrap_or_else(|| soroban_sdk::panic_with_error!(env, Error::NotAuthorized))
}
pub fn params(env: &Env) -> VaultParams {
    touch(env);
    env.storage()
        .instance()
        .get(&Key::Params)
        .unwrap_or_default()
}
pub fn loan(env: &Env, id: u64) -> Result<Loan, Error> {
    touch(env);
    let key = Key::Loan(id);
    let value = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::LoanNotFound)?;
    env.storage()
        .persistent()
        .extend_ttl(&key, THRESHOLD, EXTEND_TO);
    Ok(value)
}
pub fn put(env: &Env, loan: &Loan) {
    let key = Key::Loan(loan.id);
    env.storage().persistent().set(&key, loan);
    env.storage()
        .persistent()
        .extend_ttl(&key, THRESHOLD, EXTEND_TO);
    touch(env);
}
pub fn next_id(env: &Env) -> Result<u64, Error> {
    let id: u64 = env.storage().instance().get(&Key::NextLoan).unwrap_or(1);
    let next = id.checked_add(1).ok_or(Error::MathOverflow)?;
    env.storage().instance().set(&Key::NextLoan, &next);
    Ok(id)
}
