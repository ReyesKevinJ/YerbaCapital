#![no_std]

// Generated ABI retains registry entrypoint argument counts.
#[allow(clippy::too_many_arguments)]
pub mod registry {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/yerbacapital_registry.wasm"
    );
}
pub use registry::Error;
pub mod events;
mod loan;
mod math;
mod storage;
pub mod types;

use events::*;
use registry::{AgingMethod, Client as RegistryClient, Lot, PhysicalStatus, ReceiptStatus};
use soroban_sdk::{contract, contractimpl, token, Address, BytesN, Env, Executable, Symbol};
use storage::Key;
use types::*;

#[contract]
pub struct Vault;

#[contractimpl]
impl Vault {
    /// Construct with admin auth, immutable deployed registry/SAC and one-time registry binding.
    /// Emits registry ParamsUpdated. Errors: NotAuthorized, InvalidAddress, VaultAlreadyConfigured.
    pub fn __constructor(
        env: Env,
        admin: Address,
        registry: Address,
        settlement_asset: Address,
    ) -> Result<(), Error> {
        admin.require_auth();
        if !matches!(registry.executable(), Some(Executable::Wasm(_)))
            || !matches!(
                settlement_asset.executable(),
                Some(Executable::StellarAsset)
            )
        {
            return Err(Error::InvalidAddress);
        }
        let client = RegistryClient::new(&env, &registry);
        if client.get_admin() != admin {
            return Err(Error::NotAuthorized);
        }
        env.storage().instance().set(
            &Key::Config,
            &VaultConfig {
                admin: admin.clone(),
                registry: registry.clone(),
                settlement_asset,
                paused: false,
            },
        );
        env.storage()
            .instance()
            .set(&Key::Params, &VaultParams::default());
        env.storage().instance().set(&Key::NextLoan, &1u64);
        storage::touch(&env);
        client.bind_vault(&admin, &env.current_contract_address());
        Ok(())
    }

    /// Request debt against an owned eligible receipt with borrower auth; locks once.
    /// Emits LoanRequested + CollateralLocked. Errors: Paused, NotReceiptOwner, RoleConflict,
    /// InvalidDuration, AmountInvalid, ExceedsMaxPrincipal and registry/risk errors.
    pub fn request_loan(
        env: Env,
        borrower: Address,
        lot_id: u64,
        principal: i128,
        rate_bps: u32,
        duration_secs: u64,
    ) -> Result<u64, Error> {
        borrower.require_auth();
        let config = storage::config(&env);
        Self::not_paused(&config)?;
        let client = RegistryClient::new(&env, &config.registry);
        let lot = client.get_lot(&lot_id);
        if lot.owner != borrower {
            return Err(Error::NotReceiptOwner);
        }
        if borrower == lot.custodian || lot.verifier == Some(borrower.clone()) {
            return Err(Error::RoleConflict);
        }
        if lot.receipt_status != ReceiptStatus::Receipted || lot.loan_id.is_some() {
            return Err(Error::ReceiptLocked);
        }
        let policy = storage::params(&env);
        let max_duration = match lot.aging_method {
            AgingMethod::Natural => policy.max_natural_duration_secs,
            AgingMethod::Accelerated => policy.max_accelerated_duration_secs,
        };
        if duration_secs < 86_400 || duration_secs > max_duration {
            return Err(Error::InvalidDuration);
        }
        if rate_bps > policy.max_rate_bps {
            return Err(Error::ParamOutOfBounds);
        }
        if principal <= 0 {
            return Err(Error::AmountInvalid);
        }
        let capacity = math::capacity(
            &lot,
            lot.net_kg,
            &policy,
            &client.get_params(),
            env.ledger().timestamp(),
        )?;
        if principal > capacity {
            return Err(Error::ExceedsMaxPrincipal);
        }
        let id = storage::next_id(&env)?;
        let value = Loan {
            id,
            lot_id,
            borrower: borrower.clone(),
            lender: None,
            principal,
            principal_outstanding: 0,
            interest_due: 0,
            rate_bps,
            duration_secs,
            funded_at: 0,
            maturity: 0,
            last_accrued_at: 0,
            status: LoanStatus::Requested,
            policy,
            exposure_at_claim: 0,
        };
        storage::put(&env, &value);
        client.lock(&lot_id, &id, &borrower);
        LoanRequested {
            lot_id,
            loan_id: id,
            loan: value,
            actor: borrower,
            settlement_asset: config.settlement_asset,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(id)
    }

    /// Cancel an unfunded request with borrower auth, even after impairment or pause.
    /// Emits LoanCancelled + CollateralUnlocked. Errors: NotReceiptOwner, InvalidLoanStatus.
    pub fn cancel_request(env: Env, borrower: Address, loan_id: u64) -> Result<(), Error> {
        borrower.require_auth();
        let mut value = storage::loan(&env, loan_id)?;
        if value.borrower != borrower {
            return Err(Error::NotReceiptOwner);
        }
        if value.status != LoanStatus::Requested {
            return Err(Error::InvalidLoanStatus);
        }
        let config = storage::config(&env);
        value.status = LoanStatus::Cancelled;
        storage::put(&env, &value);
        RegistryClient::new(&env, &config.registry).unlock(&value.lot_id, &loan_id);
        LoanCancelled {
            lot_id: value.lot_id,
            loan_id,
            loan: value,
            actor: borrower,
            settlement_asset: config.settlement_asset,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Fund once with lender auth, transferring the configured SAC directly to borrower.
    /// Emits LoanFunded. Errors: Paused, InvalidLoanStatus, InvalidAddress, ExceedsMaxPrincipal,
    /// risk/registry errors; SAC failures roll back all effects.
    pub fn fund(env: Env, lender: Address, loan_id: u64) -> Result<(), Error> {
        lender.require_auth();
        let config = storage::config(&env);
        Self::not_paused(&config)?;
        let mut value = storage::loan(&env, loan_id)?;
        if value.status != LoanStatus::Requested {
            return Err(Error::InvalidLoanStatus);
        }
        if lender == value.borrower || lender == env.current_contract_address() {
            return Err(Error::InvalidAddress);
        }
        let client = RegistryClient::new(&env, &config.registry);
        let lot = Self::linked_lot(&env, &value, &client)?;
        let capacity = math::capacity(
            &lot,
            lot.net_kg,
            &value.policy,
            &client.get_params(),
            env.ledger().timestamp(),
        )?;
        if value.principal > capacity {
            return Err(Error::ExceedsMaxPrincipal);
        }
        value.lender = Some(lender.clone());
        value.principal_outstanding = value.principal;
        value.funded_at = env.ledger().timestamp();
        value.last_accrued_at = value.funded_at;
        value.maturity = value
            .funded_at
            .checked_add(value.duration_secs)
            .ok_or(Error::MathOverflow)?;
        value.status = LoanStatus::Funded;
        storage::put(&env, &value);
        token::Client::new(&env, &config.settlement_asset).transfer(
            &lender,
            &value.borrower,
            &value.principal,
        );
        LoanFunded {
            lot_id: value.lot_id,
            loan_id,
            loan: value,
            actor: lender,
            settlement_asset: config.settlement_asset,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Repay with payer auth until claim, interest first; cap transfer at actual debt.
    /// Requires a prior bounded SAC allowance for this vault as spender (ADR-011).
    /// Emits LoanRepaid and CollateralUnlocked on full payment. Errors: AmountInvalid,
    /// InvalidLoanStatus, InvalidAddress, MathOverflow; SAC failures roll back all effects.
    pub fn repay(env: Env, payer: Address, loan_id: u64, amount: i128) -> Result<i128, Error> {
        payer.require_auth();
        if payer == env.current_contract_address() {
            return Err(Error::InvalidAddress);
        }
        if amount <= 0 {
            return Err(Error::AmountInvalid);
        }
        let mut value = storage::loan(&env, loan_id)?;
        if !matches!(
            value.status,
            LoanStatus::Funded | LoanStatus::PartiallyRepaid | LoanStatus::Defaulted
        ) {
            return Err(Error::InvalidLoanStatus);
        }
        loan::accrue(&mut value, env.ledger().timestamp())?;
        let debt = value
            .principal_outstanding
            .checked_add(value.interest_due)
            .ok_or(Error::MathOverflow)?;
        let transferred = amount.min(debt);
        let interest_part = transferred.min(value.interest_due);
        let principal_part = transferred
            .checked_sub(interest_part)
            .ok_or(Error::MathOverflow)?;
        value.interest_due = value
            .interest_due
            .checked_sub(interest_part)
            .ok_or(Error::MathOverflow)?;
        value.principal_outstanding = value
            .principal_outstanding
            .checked_sub(principal_part)
            .ok_or(Error::MathOverflow)?;
        let lender = loan::lender(&value)?;
        let repaid = value.principal_outstanding == 0 && value.interest_due == 0;
        if repaid {
            value.status = LoanStatus::Repaid;
        } else if value.status != LoanStatus::Defaulted {
            value.status = LoanStatus::PartiallyRepaid;
        }
        let config = storage::config(&env);
        storage::put(&env, &value);
        token::Client::new(&env, &config.settlement_asset).transfer_from(
            &env.current_contract_address(),
            &payer,
            &lender,
            &transferred,
        );
        if repaid {
            RegistryClient::new(&env, &config.registry).unlock(&value.lot_id, &loan_id);
        }
        LoanRepaid {
            lot_id: value.lot_id,
            loan_id,
            loan: value,
            payer,
            amount: transferred,
            interest_part,
            principal_part,
            settlement_asset: config.settlement_asset,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(transferred)
    }

    /// Declare default with caller auth, no privileged role, after grace or attested impairment.
    /// Emits LoanDefaulted without changing ownership. Errors: InvalidLoanStatus, NotMatured, MathOverflow.
    pub fn mark_default(env: Env, caller: Address, loan_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let mut value = storage::loan(&env, loan_id)?;
        loan::active(&value)?;
        let config = storage::config(&env);
        let lot = Self::linked_lot(&env, &value, &RegistryClient::new(&env, &config.registry))?;
        let deadline = value
            .maturity
            .checked_add(value.policy.grace_period_secs)
            .ok_or(Error::MathOverflow)?;
        if env.ledger().timestamp() <= deadline && lot.physical_status != PhysicalStatus::Impaired {
            return Err(Error::NotMatured);
        }
        loan::accrue(&mut value, env.ledger().timestamp())?;
        if value
            .principal_outstanding
            .checked_add(value.interest_due)
            .ok_or(Error::MathOverflow)?
            <= 0
        {
            return Err(Error::InvalidLoanStatus);
        }
        value.status = LoanStatus::Defaulted;
        storage::put(&env, &value);
        LoanDefaulted {
            lot_id: value.lot_id,
            loan_id,
            loan: value,
            actor: caller,
            by_impairment: lot.physical_status == PhysicalStatus::Impaired,
            settlement_asset: config.settlement_asset,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Claim once with the loan's lender auth after Defaulted; never transfers USDC.
    /// Emits CollateralClaimed + ReceiptTransferred. Errors: NotAuthorized, InvalidLoanStatus,
    /// MathOverflow; registry failures roll back all effects. Physical recovery remains off-chain.
    pub fn claim_collateral(env: Env, lender: Address, loan_id: u64) -> Result<(), Error> {
        lender.require_auth();
        let mut value = storage::loan(&env, loan_id)?;
        if value.status != LoanStatus::Defaulted {
            return Err(Error::InvalidLoanStatus);
        }
        if loan::lender(&value)? != lender {
            return Err(Error::NotAuthorized);
        }
        loan::accrue(&mut value, env.ledger().timestamp())?;
        value.exposure_at_claim = value
            .principal_outstanding
            .checked_add(value.interest_due)
            .ok_or(Error::MathOverflow)?;
        if value.exposure_at_claim <= 0 {
            return Err(Error::InvalidLoanStatus);
        }
        value.status = LoanStatus::Liquidated;
        let config = storage::config(&env);
        storage::put(&env, &value);
        RegistryClient::new(&env, &config.registry).transfer_on_default(
            &value.lot_id,
            &loan_id,
            &lender,
        );
        CollateralClaimed {
            lot_id: value.lot_id,
            loan_id,
            loan: value,
            actor: lender,
            settlement_asset: config.settlement_asset,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Withdraw pledged mass with owner + custodian auth and a fresh collateral decision.
    /// Emits registry PartialWithdrawal. Errors: NotReceiptOwner, InvalidLoanStatus, WeightInvalid,
    /// WithdrawalBreaksLtv and risk errors; remains encumbered after success.
    pub fn partial_withdraw(
        env: Env,
        owner: Address,
        loan_id: u64,
        kg: u64,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        owner.require_auth();
        let value = storage::loan(&env, loan_id)?;
        loan::active(&value)?;
        if value.borrower != owner {
            return Err(Error::NotReceiptOwner);
        }
        let config = storage::config(&env);
        let client = RegistryClient::new(&env, &config.registry);
        let lot = Self::linked_lot(&env, &value, &client)?;
        lot.custodian.require_auth();
        if kg == 0 || kg >= lot.net_kg {
            return Err(Error::WeightInvalid);
        }
        let remaining = lot.net_kg.checked_sub(kg).ok_or(Error::MathOverflow)?;
        let capacity = math::capacity(
            &lot,
            remaining,
            &value.policy,
            &client.get_params(),
            env.ledger().timestamp(),
        )?;
        if loan::debt_at(&value, env.ledger().timestamp())? > capacity {
            return Err(Error::WithdrawalBreaksLtv);
        }
        client.withdraw_encumbered(&value.lot_id, &loan_id, &owner, &kg, &evidence);
        Ok(())
    }

    /// Set bounded policy for future requests with admin auth. Emits ParamsUpdated.
    /// Errors: NotAuthorized, ParamOutOfBounds. Does not rewrite existing loans.
    pub fn set_params(env: Env, admin: Address, params: VaultParams) -> Result<(), Error> {
        Self::admin(&env, &admin)?;
        params.validate()?;
        env.storage().instance().set(&Key::Params, &params);
        Self::publish_params(&env, admin, Symbol::new(&env, "vault"));
        Ok(())
    }

    /// Pause only new requests/funding with admin auth. Emits ParamsUpdated.
    /// Error: NotAuthorized. Repayment, cancellation and claims remain available.
    pub fn set_paused(env: Env, admin: Address, paused: bool) -> Result<(), Error> {
        let mut config = Self::admin(&env, &admin)?;
        config.paused = paused;
        env.storage().instance().set(&Key::Config, &config);
        Self::publish_params(&env, admin, Symbol::new(&env, "pause"));
        Ok(())
    }

    /// Public immutable references and pause flag; no auth or events.
    pub fn get_config(env: Env) -> VaultConfig {
        storage::config(&env)
    }
    /// Public current policy for new requests; no auth or events.
    pub fn get_params(env: Env) -> VaultParams {
        storage::params(&env)
    }
    /// Public loan query; no auth or events. Error: LoanNotFound.
    pub fn get_loan(env: Env, loan_id: u64) -> Result<Loan, Error> {
        storage::loan(&env, loan_id)
    }
    /// Public debt at ledger time, or frozen claim exposure; no auth or events.
    /// Errors: LoanNotFound, MathOverflow. Liquidated exposure cannot be collected again on-chain.
    pub fn debt_of(env: Env, loan_id: u64) -> Result<i128, Error> {
        loan::debt_at(&storage::loan(&env, loan_id)?, env.ledger().timestamp())
    }
    /// Public capacity for a new request under current policy; no auth or events.
    /// Errors: registry/risk errors and MathOverflow.
    pub fn max_principal(env: Env, lot_id: u64) -> Result<i128, Error> {
        let config = storage::config(&env);
        let client = RegistryClient::new(&env, &config.registry);
        let lot = client.get_lot(&lot_id);
        if !matches!(
            lot.receipt_status,
            ReceiptStatus::Receipted | ReceiptStatus::Encumbered
        ) {
            return Err(Error::InvalidLotStatus);
        }
        math::capacity(
            &lot,
            lot.net_kg,
            &storage::params(&env),
            &client.get_params(),
            env.ledger().timestamp(),
        )
    }
    /// Public vault revision 0.3 (bounded repayment allowance); no auth or events.
    pub fn version() -> u32 {
        3
    }
}

impl Vault {
    fn not_paused(config: &VaultConfig) -> Result<(), Error> {
        if config.paused {
            Err(Error::Paused)
        } else {
            Ok(())
        }
    }
    fn admin(env: &Env, actor: &Address) -> Result<VaultConfig, Error> {
        actor.require_auth();
        let config = storage::config(env);
        if config.admin != *actor {
            return Err(Error::NotAuthorized);
        }
        Ok(config)
    }
    fn linked_lot(_env: &Env, value: &Loan, client: &RegistryClient) -> Result<Lot, Error> {
        let lot = client.get_lot(&value.lot_id);
        if lot.loan_id != Some(value.id) || lot.receipt_status != ReceiptStatus::Encumbered {
            return Err(Error::InvalidLotStatus);
        }
        if lot.owner != value.borrower {
            return Err(Error::NotReceiptOwner);
        }
        Ok(lot)
    }
    fn publish_params(env: &Env, admin: Address, policy: Symbol) {
        ParamsUpdated {
            policy,
            admin,
            params: storage::params(env),
            paused: storage::config(env).paused,
            timestamp: env.ledger().timestamp(),
        }
        .publish(env);
    }
}

#[cfg(test)]
mod test;
