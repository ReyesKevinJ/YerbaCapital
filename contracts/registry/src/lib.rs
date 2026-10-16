#![no_std]

pub mod errors;
pub mod events;
mod lot;
mod roles;
mod storage;
pub mod types;

use errors::Error;
use events::*;
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Executable, Symbol};
use storage::Key;
use types::*;

#[contract]
pub struct Registry;

#[contractimpl]
impl Registry {
    /// Construct once with admin auth; no lots or asset movement. Host rejects reconstruction.
    pub fn __constructor(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&Key::Admin, &admin);
        env.storage()
            .instance()
            .set(&Key::Params, &RegistryParams::default());
        env.storage().instance().set(&Key::NextLot, &1u64);
        storage::touch(&env);
    }

    /// Bind a deployed vault once before lots exist; admin + vault auth. Emits ParamsUpdated.
    /// Errors: NotAuthorized, InvalidAddress, VaultAlreadyConfigured.
    pub fn bind_vault(env: Env, admin: Address, vault: Address) -> Result<(), Error> {
        roles::admin(&env, &admin)?;
        vault.require_auth();
        if storage::vault(&env).is_some() {
            return Err(Error::VaultAlreadyConfigured);
        }
        let next: u64 = env.storage().instance().get(&Key::NextLot).unwrap_or(1);
        if next != 1 {
            return Err(Error::VaultAlreadyConfigured);
        }
        if !matches!(vault.executable(), Some(Executable::Wasm(_))) {
            return Err(Error::InvalidAddress);
        }
        env.storage().instance().set(&Key::Vault, &vault);
        Self::publish_params(&env, admin, Symbol::new(&env, "vault"));
        Ok(())
    }

    /// Grant role with admin auth; no asset rights. Emits RoleGranted only on change.
    /// Errors: NotAuthorized.
    pub fn grant_role(env: Env, admin: Address, address: Address, role: Role) -> Result<(), Error> {
        roles::admin(&env, &admin)?;
        if !storage::has_role(&env, &address, role) {
            storage::set_role(&env, &address, role, true);
            RoleGranted {
                actor: admin,
                address,
                role,
                timestamp: env.ledger().timestamp(),
            }
            .publish(&env);
        }
        Ok(())
    }

    /// Revoke future authority with admin auth; preserves historical acts. Emits RoleRevoked on change.
    /// Errors: NotAuthorized.
    pub fn revoke_role(
        env: Env,
        admin: Address,
        address: Address,
        role: Role,
    ) -> Result<(), Error> {
        roles::admin(&env, &admin)?;
        if storage::has_role(&env, &address, role) {
            storage::set_role(&env, &address, role, false);
            RoleRevoked {
                actor: admin,
                address,
                role,
                timestamp: env.ledger().timestamp(),
            }
            .publish(&env);
        }
        Ok(())
    }

    /// Set bounded registry policy with admin auth. Emits ParamsUpdated; never changes prior facts.
    /// Errors: NotAuthorized, ParamOutOfBounds.
    pub fn set_params(env: Env, admin: Address, params: RegistryParams) -> Result<(), Error> {
        roles::admin(&env, &admin)?;
        params.validate()?;
        env.storage().instance().set(&Key::Params, &params);
        Self::publish_params(&env, admin, Symbol::new(&env, "registry"));
        Ok(())
    }

    /// Declare supported inventory with owner auth after vault binding. Emits LotRegistered.
    /// Errors: VaultNotConfigured, RoleMissing, RoleConflict, UnsupportedCommodity, WeightInvalid,
    /// EvidenceMissing, ParamOutOfBounds, MathOverflow. This does not verify physical existence.
    #[allow(clippy::too_many_arguments)]
    pub fn register_lot(
        env: Env,
        owner: Address,
        custodian: Address,
        commodity: Symbol,
        net_kg: u64,
        warehouse_id: BytesN<32>,
        aging_method: AgingMethod,
        aging_started_at: u64,
        evidence: BytesN<32>,
    ) -> Result<u64, Error> {
        owner.require_auth();
        storage::vault(&env).ok_or(Error::VaultNotConfigured)?;
        roles::role(&env, &custodian, Role::Custodian)?;
        if owner == custodian {
            return Err(Error::RoleConflict);
        }
        if commodity != Symbol::new(&env, "YERBA_CANCHADA") {
            return Err(Error::UnsupportedCommodity);
        }
        if net_kg < storage::params(&env).min_lot_kg {
            return Err(Error::WeightInvalid);
        }
        lot::evidence(&env, &evidence)?;
        if warehouse_id == BytesN::from_array(&env, &[0; 32])
            || aging_started_at > env.ledger().timestamp()
        {
            return Err(Error::ParamOutOfBounds);
        }
        let id = storage::next_id(&env)?;
        let value = Lot {
            id,
            commodity,
            owner: owner.clone(),
            original_borrower: owner.clone(),
            custodian,
            verifier: None,
            physical_status: PhysicalStatus::Registered,
            receipt_status: ReceiptStatus::Unissued,
            loan_id: None,
            initial_verified_kg: 0,
            net_kg,
            withdrawn_kg: 0,
            recorded_losses_kg: 0,
            moisture_bps: 0,
            warehouse_id,
            aging_method,
            aging_started_at,
            verification_evidence: None,
            valuation: 0,
            valued_kg: 0,
            valued_at: 0,
            moisture_drift: false,
            last_attestation: Attestation {
                kind: AttestationKind::Declared,
                actor: owner,
                co_signer: None,
                evidence,
                recorded_at: env.ledger().timestamp(),
            },
        };
        storage::put_lot(&env, &value);
        LotRegistered {
            lot_id: id,
            lot: value,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(id)
    }

    /// Verify Registered inventory with verifier AND custodian auth over the same evidence.
    /// Emits LotVerified. Errors: RoleMissing, RoleConflict, InvalidLotStatus, WeightInvalid,
    /// MoistureOutOfBand, EvidenceMissing, LotNotFound.
    pub fn verify_lot(
        env: Env,
        verifier: Address,
        lot_id: u64,
        net_kg: u64,
        moisture_bps: u32,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        verifier.require_auth();
        let mut value = storage::lot(&env, lot_id)?;
        lot::custody(&env, &value)?;
        roles::verifier(&env, &verifier, &value)?;
        if value.physical_status != PhysicalStatus::Registered
            || value.receipt_status != ReceiptStatus::Unissued
        {
            return Err(Error::InvalidLotStatus);
        }
        let params = storage::params(&env);
        if net_kg < params.min_lot_kg {
            return Err(Error::WeightInvalid);
        }
        lot::moisture(&params, moisture_bps)?;
        let co_signer = Some(value.custodian.clone());
        lot::attest(
            &env,
            &mut value,
            AttestationKind::DepositVerified,
            verifier.clone(),
            co_signer,
            evidence.clone(),
        )?;
        value.net_kg = net_kg;
        value.initial_verified_kg = net_kg;
        value.moisture_bps = moisture_bps;
        value.verifier = Some(verifier);
        value.verification_evidence = Some(evidence);
        value.physical_status = PhysicalStatus::Verified;
        storage::put_lot(&env, &value);
        LotVerified {
            lot_id,
            lot: value,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Reject unissued Registered/Verified inventory with verifier auth and evidence.
    /// Emits LotRejected. Errors: RoleMissing, RoleConflict, InvalidLotStatus, EvidenceMissing.
    pub fn reject_lot(
        env: Env,
        verifier: Address,
        lot_id: u64,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        verifier.require_auth();
        let mut value = storage::lot(&env, lot_id)?;
        roles::verifier(&env, &verifier, &value)?;
        if value.receipt_status != ReceiptStatus::Unissued
            || !matches!(
                value.physical_status,
                PhysicalStatus::Registered | PhysicalStatus::Verified
            )
        {
            return Err(Error::InvalidLotStatus);
        }
        lot::attest(
            &env,
            &mut value,
            AttestationKind::Rejected,
            verifier,
            None,
            evidence,
        )?;
        value.physical_status = PhysicalStatus::Rejected;
        storage::put_lot(&env, &value);
        LotRejected {
            lot_id,
            lot: value,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Issue one receipt with original verifier auth on Verified inventory. Emits ReceiptIssued.
    /// Errors: RoleMissing, RoleConflict, NotAuthorized, InvalidLotStatus, LotImpaired.
    pub fn issue_receipt(env: Env, verifier: Address, lot_id: u64) -> Result<(), Error> {
        verifier.require_auth();
        let mut value = storage::lot(&env, lot_id)?;
        roles::verifier(&env, &verifier, &value)?;
        lot::verified(&value)?;
        if value.verifier != Some(verifier) {
            return Err(Error::NotAuthorized);
        }
        if value.receipt_status != ReceiptStatus::Unissued {
            return Err(Error::InvalidLotStatus);
        }
        value.receipt_status = ReceiptStatus::Receipted;
        storage::put_lot(&env, &value);
        ReceiptIssued {
            lot_id,
            lot: value,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Publish a positive valuation with oracle auth on Verified issued inventory.
    /// Emits ValuationPosted. Errors: RoleMissing, RoleConflict, AmountInvalid, InvalidLotStatus,
    /// LotImpaired, EvidenceMissing.
    pub fn post_valuation(
        env: Env,
        oracle: Address,
        lot_id: u64,
        valuation: i128,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        oracle.require_auth();
        roles::role(&env, &oracle, Role::PriceOracle)?;
        let mut value = storage::lot(&env, lot_id)?;
        lot::verified(&value)?;
        if oracle == value.custodian || value.verifier == Some(oracle.clone()) {
            return Err(Error::RoleConflict);
        }
        if !matches!(
            value.receipt_status,
            ReceiptStatus::Receipted | ReceiptStatus::Encumbered
        ) {
            return Err(Error::InvalidLotStatus);
        }
        if valuation <= 0 {
            return Err(Error::AmountInvalid);
        }
        lot::attest(
            &env,
            &mut value,
            AttestationKind::Valued,
            oracle,
            None,
            evidence,
        )?;
        value.valuation = valuation;
        value.valued_kg = value.net_kg;
        value.valued_at = env.ledger().timestamp();
        storage::put_lot(&env, &value);
        ValuationPosted {
            lot_id,
            lot: value,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Record an inspection with verifier auth on active issued inventory. Emits InspectionRecorded.
    /// Errors: RoleMissing, RoleConflict, InvalidLotStatus, WeightInvalid, MoistureOutOfBand,
    /// EvidenceMissing, MathOverflow. Inspections never add mass or clear impairment.
    pub fn record_inspection(
        env: Env,
        verifier: Address,
        lot_id: u64,
        net_kg: u64,
        moisture_bps: u32,
        kind: InspectionKind,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        verifier.require_auth();
        let mut value = storage::lot(&env, lot_id)?;
        roles::verifier(&env, &verifier, &value)?;
        if !matches!(
            value.physical_status,
            PhysicalStatus::Verified | PhysicalStatus::Impaired
        ) || !matches!(
            value.receipt_status,
            ReceiptStatus::Receipted | ReceiptStatus::Encumbered
        ) {
            return Err(Error::InvalidLotStatus);
        }
        if net_kg == 0 || net_kg > value.net_kg {
            return Err(Error::WeightInvalid);
        }
        if moisture_bps > 10_000 {
            return Err(Error::MoistureOutOfBand);
        }
        let loss = value
            .net_kg
            .checked_sub(net_kg)
            .ok_or(Error::MathOverflow)?;
        value.recorded_losses_kg = value
            .recorded_losses_kg
            .checked_add(loss)
            .ok_or(Error::MathOverflow)?;
        let params = storage::params(&env);
        value.moisture_drift = kind == InspectionKind::MoistureDrift
            || moisture_bps < params.moisture_min_bps
            || moisture_bps > params.moisture_max_bps;
        value.net_kg = net_kg;
        value.moisture_bps = moisture_bps;
        lot::attest(
            &env,
            &mut value,
            AttestationKind::Inspection(kind),
            verifier,
            None,
            evidence,
        )?;
        storage::put_lot(&env, &value);
        InspectionRecorded {
            lot_id,
            lot: value,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Attest impairment with verifier auth, preserving ownership and encumbrance. Emits LotImpaired.
    /// Errors: RoleMissing, RoleConflict, InvalidLotStatus, LotImpaired, EvidenceMissing.
    pub fn impair(
        env: Env,
        verifier: Address,
        lot_id: u64,
        reason: ImpairmentReason,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        verifier.require_auth();
        let mut value = storage::lot(&env, lot_id)?;
        roles::verifier(&env, &verifier, &value)?;
        lot::verified(&value)?;
        if !matches!(
            value.receipt_status,
            ReceiptStatus::Receipted | ReceiptStatus::Encumbered
        ) {
            return Err(Error::InvalidLotStatus);
        }
        lot::attest(
            &env,
            &mut value,
            AttestationKind::Impaired(reason),
            verifier,
            None,
            evidence,
        )?;
        value.physical_status = PhysicalStatus::Impaired;
        storage::put_lot(&env, &value);
        LotImpaired {
            lot_id,
            lot: value,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Transfer a free eligible receipt with owner auth. Emits ReceiptTransferred.
    /// Errors: NotReceiptOwner, ReceiptLocked, InvalidLotStatus, InvalidAddress, RoleConflict.
    pub fn transfer_receipt(
        env: Env,
        owner: Address,
        lot_id: u64,
        new_owner: Address,
    ) -> Result<(), Error> {
        owner.require_auth();
        let mut value = storage::lot(&env, lot_id)?;
        lot::owner(&value, &owner)?;
        lot::verified(&value)?;
        lot::free(&value)?;
        if new_owner == owner || storage::vault(&env) == Some(new_owner.clone()) {
            return Err(Error::InvalidAddress);
        }
        if new_owner == value.custodian || value.verifier == Some(new_owner.clone()) {
            return Err(Error::RoleConflict);
        }
        value.owner = new_owner.clone();
        storage::put_lot(&env, &value);
        ReceiptTransferred {
            lot_id,
            previous_owner: owner,
            new_owner,
            loan_id: None,
            by_default: false,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Withdraw part of a free Verified lot with owner + custodian auth. Emits PartialWithdrawal.
    /// Errors: NotReceiptOwner, ReceiptLocked, RoleMissing, WeightInvalid, EvidenceMissing.
    pub fn partial_withdraw(
        env: Env,
        owner: Address,
        lot_id: u64,
        kg: u64,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        owner.require_auth();
        let mut value = storage::lot(&env, lot_id)?;
        lot::custody(&env, &value)?;
        lot::owner(&value, &owner)?;
        lot::verified(&value)?;
        lot::free(&value)?;
        Self::apply_withdrawal(&env, &mut value, owner, kg, evidence)
    }

    /// Close a free Verified lot with owner + custodian auth and evidence. Emits LotClosed.
    /// Errors: NotReceiptOwner, ReceiptLocked, RoleMissing, EvidenceMissing, MathOverflow.
    pub fn withdraw_full(
        env: Env,
        owner: Address,
        lot_id: u64,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        owner.require_auth();
        let mut value = storage::lot(&env, lot_id)?;
        lot::custody(&env, &value)?;
        lot::owner(&value, &owner)?;
        lot::verified(&value)?;
        lot::free(&value)?;
        let co_signer = Some(value.custodian.clone());
        lot::attest(
            &env,
            &mut value,
            AttestationKind::FinalWithdrawal,
            owner,
            co_signer,
            evidence,
        )?;
        value.withdrawn_kg = value
            .withdrawn_kg
            .checked_add(value.net_kg)
            .ok_or(Error::MathOverflow)?;
        value.net_kg = 0;
        value.physical_status = PhysicalStatus::Closed;
        value.receipt_status = ReceiptStatus::Retired;
        storage::put_lot(&env, &value);
        LotClosed {
            lot_id,
            lot: value,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Lock an eligible receipt for a single loan; ONLY linked vault auth. Emits CollateralLocked.
    /// Errors: VaultNotConfigured, ReceiptLocked, NotReceiptOwner, LotImpaired, InvalidLotStatus.
    pub fn lock(env: Env, lot_id: u64, loan_id: u64, owner: Address) -> Result<(), Error> {
        roles::vault(&env)?;
        let mut value = storage::lot(&env, lot_id)?;
        lot::owner(&value, &owner)?;
        lot::verified(&value)?;
        lot::free(&value)?;
        if loan_id == 0 {
            return Err(Error::InvalidLoanStatus);
        }
        value.loan_id = Some(loan_id);
        value.receipt_status = ReceiptStatus::Encumbered;
        storage::put_lot(&env, &value);
        CollateralLocked {
            lot_id,
            loan_id,
            owner,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Release matching encumbrance; ONLY linked vault auth, including Impaired lots.
    /// Emits CollateralUnlocked. Errors: VaultNotConfigured, InvalidLotStatus.
    pub fn unlock(env: Env, lot_id: u64, loan_id: u64) -> Result<(), Error> {
        roles::vault(&env)?;
        let mut value = storage::lot(&env, lot_id)?;
        lot::linked(&value, loan_id)?;
        value.loan_id = None;
        value.receipt_status = ReceiptStatus::Receipted;
        storage::put_lot(&env, &value);
        CollateralUnlocked {
            lot_id,
            loan_id,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Adjudicate matching encumbered receipt; ONLY linked vault auth, preserving physical status.
    /// Emits ReceiptTransferred. Errors: VaultNotConfigured, InvalidLotStatus, InvalidAddress.
    pub fn transfer_on_default(
        env: Env,
        lot_id: u64,
        loan_id: u64,
        lender: Address,
    ) -> Result<(), Error> {
        let vault = roles::vault(&env)?;
        let mut value = storage::lot(&env, lot_id)?;
        lot::linked(&value, loan_id)?;
        if lender == vault || lender == value.owner {
            return Err(Error::InvalidAddress);
        }
        let previous_owner = value.owner.clone();
        value.owner = lender.clone();
        value.loan_id = None;
        value.receipt_status = ReceiptStatus::Receipted;
        storage::put_lot(&env, &value);
        ReceiptTransferred {
            lot_id,
            previous_owner,
            new_owner: lender,
            loan_id: Some(loan_id),
            by_default: true,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);
        Ok(())
    }

    /// Apply a pledged withdrawal; vault + owner + custodian auth in one invocation.
    /// Emits PartialWithdrawal. Errors: InvalidLotStatus, NotReceiptOwner, WeightInvalid, EvidenceMissing.
    pub fn withdraw_encumbered(
        env: Env,
        lot_id: u64,
        loan_id: u64,
        owner: Address,
        kg: u64,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        roles::vault(&env)?;
        owner.require_auth();
        let mut value = storage::lot(&env, lot_id)?;
        lot::custody(&env, &value)?;
        lot::owner(&value, &owner)?;
        lot::linked(&value, loan_id)?;
        lot::verified(&value)?;
        Self::apply_withdrawal(&env, &mut value, owner, kg, evidence)
    }

    /// Public admin reference; no auth or events.
    pub fn get_admin(env: Env) -> Address {
        storage::admin(&env)
    }
    /// Public vault reference; no auth or events.
    pub fn get_vault(env: Env) -> Option<Address> {
        storage::vault(&env)
    }
    /// Public role query; no auth or events.
    pub fn has_role(env: Env, address: Address, role: Role) -> bool {
        storage::has_role(&env, &address, role)
    }
    /// Public policy query; no auth or events.
    pub fn get_params(env: Env) -> RegistryParams {
        storage::params(&env)
    }
    /// Public lot query; no auth or events. Error: LotNotFound.
    pub fn get_lot(env: Env, lot_id: u64) -> Result<Lot, Error> {
        storage::lot(&env, lot_id)
    }
    /// Public design revision 0.2; no auth or events.
    pub fn version() -> u32 {
        2
    }
}

impl Registry {
    fn publish_params(env: &Env, admin: Address, policy: Symbol) {
        ParamsUpdated {
            policy,
            admin,
            params: storage::params(env),
            vault: storage::vault(env),
            timestamp: env.ledger().timestamp(),
        }
        .publish(env);
    }

    fn apply_withdrawal(
        env: &Env,
        value: &mut Lot,
        owner: Address,
        kg: u64,
        evidence: BytesN<32>,
    ) -> Result<(), Error> {
        let co_signer = Some(value.custodian.clone());
        lot::attest(
            env,
            value,
            AttestationKind::PartialWithdrawal,
            owner,
            co_signer,
            evidence,
        )?;
        lot::withdraw(value, kg, storage::params(env).min_lot_kg)?;
        storage::put_lot(env, value);
        PartialWithdrawal {
            lot_id: value.id,
            lot: value.clone(),
            timestamp: env.ledger().timestamp(),
        }
        .publish(env);
        Ok(())
    }
}

#[cfg(test)]
mod test;
