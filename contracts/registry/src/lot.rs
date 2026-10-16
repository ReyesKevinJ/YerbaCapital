use crate::{errors::Error, events, roles, storage, VaultClient};
use soroban_sdk::{Address, BytesN, Env};
use yerbacapital_shared::{Commodity, Lot, LotStatus, Params, Role};

pub fn zero_hash(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[0u8; 32])
}

pub fn is_zero_hash(env: &Env, hash: &BytesN<32>) -> bool {
    *hash == zero_hash(env)
}

pub fn get_lot_or_err(env: &Env, lot_id: u64) -> Result<Lot, Error> {
    storage::get_lot(env, lot_id).ok_or(Error::LotNotFound)
}

pub fn validate_params(params: &Params) -> Result<(), Error> {
    let out_of_bounds = params.moisture_min_bps > params.moisture_max_bps
        || params.moisture_max_bps > 2_000
        || params.min_lot_kg == 0;
    if out_of_bounds {
        return Err(Error::ParamOutOfBounds);
    }
    Ok(())
}

fn check_plausibility(env: &Env, moisture_bps: u32, net_kg: u64) -> Result<(), Error> {
    let params = storage::get_params(env);
    if moisture_bps < params.moisture_min_bps || moisture_bps > params.moisture_max_bps {
        return Err(Error::MoistureOutOfBand);
    }
    if net_kg < params.min_lot_kg {
        return Err(Error::WeightInvalid);
    }
    Ok(())
}

/// Gate for the vault-only transitions: the configured vault must be the caller
/// and must authorize the invocation (AGENTS.md §8.3).
pub fn require_vault(env: &Env, vault: &Address) -> Result<(), Error> {
    let configured = storage::get_vault(env).ok_or(Error::OnlyVault)?;
    if configured != *vault {
        return Err(Error::OnlyVault);
    }
    vault.require_auth();
    Ok(())
}

pub fn register_lot(
    env: &Env,
    owner: &Address,
    lot_id: u64,
    commodity: Commodity,
    net_kg: u64,
    custodian: &Address,
    origin_hash: &BytesN<32>,
) -> Result<(), Error> {
    if commodity != Commodity::YerbaCanchada {
        return Err(Error::UnsupportedCommodity);
    }
    let params = storage::get_params(env);
    if net_kg < params.min_lot_kg {
        return Err(Error::WeightInvalid);
    }
    if !roles::has_role(env, custodian, Role::Custodian) {
        return Err(Error::RoleMissing);
    }
    if custodian == owner {
        return Err(Error::RoleConflict);
    }
    if storage::has_lot(env, lot_id) {
        return Err(Error::LotExists);
    }

    let lot = Lot {
        lot_id,
        owner: owner.clone(),
        custodian: custodian.clone(),
        verifier: None,
        commodity,
        net_kg,
        moisture_bps: 0,
        status: LotStatus::Registered,
        origin_hash: origin_hash.clone(),
        evidence_hash: zero_hash(env),
        valuation: 0,
        valuation_ts: 0,
        sale_hash: None,
        created_ts: env.ledger().timestamp(),
    };
    storage::set_lot(env, &lot);
    events::LotRegistered {
        lot_id,
        owner: owner.clone(),
        commodity,
        net_kg,
    }
    .publish(env);
    Ok(())
}

pub fn verify_lot(
    env: &Env,
    verifier: &Address,
    custodian: &Address,
    lot_id: u64,
    moisture_bps: u32,
    net_kg: u64,
    evidence_hash: &BytesN<32>,
) -> Result<(), Error> {
    roles::require_role(env, verifier, Role::Verifier)?;
    roles::require_role(env, custodian, Role::Custodian)?;

    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.status != LotStatus::Registered {
        return Err(Error::InvalidLotStatus);
    }
    if lot.custodian != *custodian {
        return Err(Error::NotAuthorized);
    }
    if *verifier == *custodian || *verifier == lot.owner || lot.owner == *custodian {
        return Err(Error::RoleConflict);
    }
    check_plausibility(env, moisture_bps, net_kg)?;
    if is_zero_hash(env, evidence_hash) {
        return Err(Error::EvidenceMissing);
    }

    lot.moisture_bps = moisture_bps;
    lot.net_kg = net_kg;
    lot.verifier = Some(verifier.clone());
    lot.evidence_hash = evidence_hash.clone();
    lot.status = LotStatus::Verified;
    storage::set_lot(env, &lot);
    events::LotVerified {
        lot_id,
        verifier: verifier.clone(),
        custodian: custodian.clone(),
        moisture_bps,
        net_kg,
    }
    .publish(env);
    Ok(())
}

pub fn reject_lot(env: &Env, verifier: &Address, lot_id: u64) -> Result<(), Error> {
    roles::require_role(env, verifier, Role::Verifier)?;

    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.status != LotStatus::Registered && lot.status != LotStatus::Verified {
        return Err(Error::InvalidLotStatus);
    }
    lot.status = LotStatus::Rejected;
    storage::set_lot(env, &lot);
    events::LotRejected {
        lot_id,
        verifier: verifier.clone(),
    }
    .publish(env);
    Ok(())
}

pub fn issue_receipt(env: &Env, verifier: &Address, lot_id: u64) -> Result<(), Error> {
    roles::require_role(env, verifier, Role::Verifier)?;

    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.status != LotStatus::Verified {
        return Err(Error::InvalidLotStatus);
    }
    match &lot.verifier {
        Some(v) if v == verifier => {}
        Some(_) => return Err(Error::NotAuthorized),
        None => return Err(Error::InvalidLotStatus),
    }

    lot.status = LotStatus::Receipted;
    storage::set_lot(env, &lot);
    events::ReceiptIssued {
        lot_id,
        owner: lot.owner.clone(),
    }
    .publish(env);
    Ok(())
}

pub fn post_valuation(
    env: &Env,
    oracle: &Address,
    lot_id: u64,
    valuation: i128,
) -> Result<(), Error> {
    roles::require_role(env, oracle, Role::PriceOracle)?;

    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.status != LotStatus::Receipted && lot.status != LotStatus::Encumbered {
        return Err(Error::InvalidLotStatus);
    }
    if valuation <= 0 {
        return Err(Error::AmountInvalid);
    }

    lot.valuation = valuation;
    lot.valuation_ts = env.ledger().timestamp();
    storage::set_lot(env, &lot);
    events::ValuationPosted {
        lot_id,
        oracle: oracle.clone(),
        valuation,
        timestamp: lot.valuation_ts,
    }
    .publish(env);
    Ok(())
}

pub fn transfer_receipt(
    env: &Env,
    owner: &Address,
    lot_id: u64,
    new_owner: &Address,
) -> Result<(), Error> {
    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.status != LotStatus::Receipted {
        return Err(Error::ReceiptLocked);
    }
    if lot.owner != *owner {
        return Err(Error::NotReceiptOwner);
    }

    lot.owner = new_owner.clone();
    storage::set_lot(env, &lot);
    events::ReceiptTransferred {
        lot_id,
        from: owner.clone(),
        to: new_owner.clone(),
    }
    .publish(env);
    Ok(())
}

pub fn lock(env: &Env, lot_id: u64) -> Result<(), Error> {
    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.status != LotStatus::Receipted {
        return Err(Error::InvalidLotStatus);
    }
    lot.status = LotStatus::Encumbered;
    storage::set_lot(env, &lot);
    events::CollateralLocked { lot_id }.publish(env);
    Ok(())
}

pub fn unlock(env: &Env, lot_id: u64) -> Result<(), Error> {
    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.status != LotStatus::Encumbered {
        return Err(Error::InvalidLotStatus);
    }
    lot.status = LotStatus::Receipted;
    storage::set_lot(env, &lot);
    events::CollateralUnlocked { lot_id }.publish(env);
    Ok(())
}

pub fn transfer_on_default(env: &Env, lot_id: u64, new_owner: &Address) -> Result<(), Error> {
    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.status != LotStatus::Encumbered {
        return Err(Error::InvalidLotStatus);
    }
    let from = lot.owner.clone();
    lot.owner = new_owner.clone();
    lot.status = LotStatus::Receipted;
    storage::set_lot(env, &lot);
    events::ReceiptTransferred {
        lot_id,
        from,
        to: new_owner.clone(),
    }
    .publish(env);
    Ok(())
}

pub fn record_inspection(
    env: &Env,
    verifier: &Address,
    lot_id: u64,
    moisture_bps: u32,
    net_kg: u64,
    evidence_hash: &BytesN<32>,
) -> Result<(), Error> {
    roles::require_role(env, verifier, Role::Verifier)?;

    let mut lot = get_lot_or_err(env, lot_id)?;
    if !matches!(
        lot.status,
        LotStatus::Verified | LotStatus::Receipted | LotStatus::Encumbered
    ) {
        return Err(Error::InvalidLotStatus);
    }
    check_plausibility(env, moisture_bps, net_kg)?;
    if is_zero_hash(env, evidence_hash) {
        return Err(Error::EvidenceMissing);
    }

    lot.moisture_bps = moisture_bps;
    lot.net_kg = net_kg;
    lot.evidence_hash = evidence_hash.clone();
    storage::set_lot(env, &lot);
    events::InspectionRecorded {
        lot_id,
        verifier: verifier.clone(),
        moisture_bps,
        net_kg,
        evidence_hash: evidence_hash.clone(),
    }
    .publish(env);
    Ok(())
}

pub fn impair(env: &Env, verifier: &Address, lot_id: u64) -> Result<(), Error> {
    roles::require_role(env, verifier, Role::Verifier)?;

    let mut lot = get_lot_or_err(env, lot_id)?;
    if !matches!(
        lot.status,
        LotStatus::Registered | LotStatus::Verified | LotStatus::Receipted | LotStatus::Encumbered
    ) {
        return Err(Error::InvalidLotStatus);
    }
    lot.status = LotStatus::Impaired;
    storage::set_lot(env, &lot);
    events::LotImpaired {
        lot_id,
        verifier: verifier.clone(),
    }
    .publish(env);
    Ok(())
}

pub fn confirm_sale(
    env: &Env,
    verifier: &Address,
    lot_id: u64,
    buyer_hash: &BytesN<32>,
) -> Result<(), Error> {
    roles::require_role(env, verifier, Role::Verifier)?;

    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.status != LotStatus::Receipted {
        return Err(Error::InvalidLotStatus);
    }
    lot.sale_hash = Some(buyer_hash.clone());
    storage::set_lot(env, &lot);
    events::SaleConfirmed {
        lot_id,
        buyer_hash: buyer_hash.clone(),
    }
    .publish(env);
    Ok(())
}

pub fn partial_withdraw(
    env: &Env,
    custodian: &Address,
    owner: &Address,
    lot_id: u64,
    kg: u64,
    evidence_hash: &BytesN<32>,
) -> Result<(), Error> {
    roles::require_role(env, custodian, Role::Custodian)?;

    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.owner != *owner {
        return Err(Error::NotReceiptOwner);
    }
    if lot.status != LotStatus::Receipted && lot.status != LotStatus::Encumbered {
        return Err(Error::InvalidLotStatus);
    }
    if kg == 0 || kg >= lot.net_kg {
        return Err(Error::WeightInvalid);
    }
    if is_zero_hash(env, evidence_hash) {
        return Err(Error::EvidenceMissing);
    }

    let remaining = lot.net_kg - kg;
    if lot.status == LotStatus::Encumbered {
        let vault = storage::get_vault(env).ok_or(Error::OnlyVault)?;
        let allowed = VaultClient::new(env, &vault).is_withdrawal_allowed(
            &lot_id,
            &remaining,
            &lot.valuation,
            &lot.net_kg,
        );
        if !allowed {
            return Err(Error::WithdrawalBreaksLtv);
        }
    }

    lot.net_kg = remaining;
    lot.evidence_hash = evidence_hash.clone();
    storage::set_lot(env, &lot);
    events::PartialWithdrawal {
        lot_id,
        remaining_kg: remaining,
        evidence_hash: evidence_hash.clone(),
    }
    .publish(env);
    Ok(())
}

pub fn withdraw_full(
    env: &Env,
    custodian: &Address,
    owner: &Address,
    lot_id: u64,
) -> Result<(), Error> {
    roles::require_role(env, custodian, Role::Custodian)?;

    let mut lot = get_lot_or_err(env, lot_id)?;
    if lot.owner != *owner {
        return Err(Error::NotReceiptOwner);
    }
    if lot.status != LotStatus::Receipted {
        return Err(Error::ReceiptLocked);
    }
    lot.status = LotStatus::Closed;
    lot.net_kg = 0;
    storage::set_lot(env, &lot);
    events::LotClosed { lot_id }.publish(env);
    Ok(())
}
