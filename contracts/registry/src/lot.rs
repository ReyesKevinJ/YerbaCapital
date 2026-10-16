use crate::{errors::Error, roles, types::*};
use soroban_sdk::{Address, BytesN, Env};

pub fn evidence(env: &Env, hash: &BytesN<32>) -> Result<(), Error> {
    if *hash == BytesN::from_array(env, &[0; 32]) {
        return Err(Error::EvidenceMissing);
    }
    Ok(())
}

pub fn verified(lot: &Lot) -> Result<(), Error> {
    if lot.physical_status == PhysicalStatus::Impaired {
        return Err(Error::LotImpaired);
    }
    if lot.physical_status != PhysicalStatus::Verified {
        return Err(Error::InvalidLotStatus);
    }
    Ok(())
}

pub fn owner(lot: &Lot, actor: &Address) -> Result<(), Error> {
    if lot.owner != *actor {
        return Err(Error::NotReceiptOwner);
    }
    Ok(())
}

pub fn free(lot: &Lot) -> Result<(), Error> {
    if lot.receipt_status == ReceiptStatus::Encumbered || lot.loan_id.is_some() {
        return Err(Error::ReceiptLocked);
    }
    if lot.receipt_status != ReceiptStatus::Receipted {
        return Err(Error::InvalidLotStatus);
    }
    Ok(())
}

pub fn custody(env: &Env, lot: &Lot) -> Result<(), Error> {
    lot.custodian.require_auth();
    if lot.custodian == lot.owner {
        return Err(Error::RoleConflict);
    }
    roles::role(env, &lot.custodian, Role::Custodian)
}

pub fn moisture(params: &RegistryParams, value: u32) -> Result<(), Error> {
    if value < params.moisture_min_bps || value > params.moisture_max_bps {
        return Err(Error::MoistureOutOfBand);
    }
    Ok(())
}

pub fn linked(lot: &Lot, loan_id: u64) -> Result<(), Error> {
    if lot.receipt_status != ReceiptStatus::Encumbered || lot.loan_id != Some(loan_id) {
        return Err(Error::InvalidLotStatus);
    }
    Ok(())
}

pub fn attest(
    env: &Env,
    lot: &mut Lot,
    kind: AttestationKind,
    actor: Address,
    co_signer: Option<Address>,
    hash: BytesN<32>,
) -> Result<(), Error> {
    evidence(env, &hash)?;
    lot.last_attestation = Attestation {
        kind,
        actor,
        co_signer,
        evidence: hash,
        recorded_at: env.ledger().timestamp(),
    };
    Ok(())
}

pub fn withdraw(lot: &mut Lot, kg: u64, min_kg: u64) -> Result<(), Error> {
    if kg == 0 || kg >= lot.net_kg {
        return Err(Error::WeightInvalid);
    }
    let remaining = lot.net_kg.checked_sub(kg).ok_or(Error::MathOverflow)?;
    if remaining < min_kg {
        return Err(Error::WeightInvalid);
    }
    lot.net_kg = remaining;
    lot.withdrawn_kg = lot
        .withdrawn_kg
        .checked_add(kg)
        .ok_or(Error::MathOverflow)?;
    Ok(())
}
