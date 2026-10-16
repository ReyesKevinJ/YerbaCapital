extern crate std;

use crate::{Commodity, Error, LotStatus, Registry, RegistryClient, Role};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, BytesN, Env,
};

fn hash(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

struct Fixture {
    env: Env,
    client: RegistryClient<'static>,
    admin: Address,
    owner: Address,
    custodian: Address,
    verifier: Address,
    oracle: Address,
}

fn setup() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_700_000_000);
    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let custodian = Address::generate(&env);
    let verifier = Address::generate(&env);
    let oracle = Address::generate(&env);

    let id = env.register(Registry, ());
    let client = RegistryClient::new(&env, &id);
    client.initialize(&admin);
    client.grant_role(&custodian, &Role::Custodian);
    client.grant_role(&verifier, &Role::Verifier);
    client.grant_role(&oracle, &Role::PriceOracle);

    Fixture {
        env,
        client,
        admin,
        owner,
        custodian,
        verifier,
        oracle,
    }
}

impl Fixture {
    fn register(&self, lot_id: u64) {
        self.client.register_lot(
            &self.owner,
            &lot_id,
            &Commodity::YerbaCanchada,
            &12_000,
            &self.custodian,
            &hash(&self.env, 1),
        );
    }

    fn verify(&self, lot_id: u64) {
        self.client.verify_lot(
            &self.verifier,
            &self.custodian,
            &lot_id,
            &500,
            &12_000,
            &hash(&self.env, 2),
        );
    }

    fn receipt(&self, lot_id: u64) {
        self.register(lot_id);
        self.verify(lot_id);
        self.client.issue_receipt(&self.verifier, &lot_id);
        self.client
            .post_valuation(&self.oracle, &lot_id, &10_000_000_000_i128);
    }
}

#[test]
fn happy_path_register_verify_receipt_value() {
    let f = setup();
    f.receipt(7);
    let lot = f.client.get_lot(&7);
    assert_eq!(lot.status, LotStatus::Receipted);
    assert_eq!(lot.net_kg, 12_000);
    assert_eq!(lot.moisture_bps, 500);
    assert_eq!(lot.valuation, 10_000_000_000_i128);
    assert!(lot.valuation_ts > 0);
}

#[test]
fn initialize_twice_fails() {
    let f = setup();
    let res = f.client.try_initialize(&f.admin);
    assert!(matches!(res, Err(Ok(Error::AlreadyInitialized))));
}

#[test]
fn register_requires_custodian_role() {
    let f = setup();
    let stranger = Address::generate(&f.env);
    let res = f.client.try_register_lot(
        &f.owner,
        &1,
        &Commodity::YerbaCanchada,
        &12_000,
        &stranger,
        &hash(&f.env, 1),
    );
    assert!(matches!(res, Err(Ok(Error::RoleMissing))));
}

#[test]
fn register_rejects_lot_below_min_kg() {
    let f = setup();
    let res = f.client.try_register_lot(
        &f.owner,
        &1,
        &Commodity::YerbaCanchada,
        &999,
        &f.custodian,
        &hash(&f.env, 1),
    );
    assert!(matches!(res, Err(Ok(Error::WeightInvalid))));
}

#[test]
fn register_rejects_reused_lot_id() {
    let f = setup();
    f.register(1);
    let res = f.client.try_register_lot(
        &f.owner,
        &1,
        &Commodity::YerbaCanchada,
        &12_000,
        &f.custodian,
        &hash(&f.env, 1),
    );
    assert!(matches!(res, Err(Ok(Error::LotExists))));
}

#[test]
fn verify_rejects_moisture_out_of_band() {
    let f = setup();
    f.register(1);
    let res = f.client.try_verify_lot(
        &f.verifier,
        &f.custodian,
        &1,
        &800,
        &12_000,
        &hash(&f.env, 2),
    );
    assert!(matches!(res, Err(Ok(Error::MoistureOutOfBand))));
}

#[test]
fn verify_rejects_zero_evidence_hash() {
    let f = setup();
    f.register(1);
    let res = f.client.try_verify_lot(
        &f.verifier,
        &f.custodian,
        &1,
        &500,
        &12_000,
        &hash(&f.env, 0),
    );
    assert!(matches!(res, Err(Ok(Error::EvidenceMissing))));
}

#[test]
fn verify_requires_verifier_role() {
    let f = setup();
    f.register(1);
    let stranger = Address::generate(&f.env);
    let res = f
        .client
        .try_verify_lot(&stranger, &f.custodian, &1, &500, &12_000, &hash(&f.env, 2));
    assert!(matches!(res, Err(Ok(Error::RoleMissing))));
}

#[test]
fn verify_rejects_verifier_equal_to_custodian() {
    let f = setup();
    f.client.grant_role(&f.custodian, &Role::Verifier);
    f.register(1);
    let res = f.client.try_verify_lot(
        &f.custodian,
        &f.custodian,
        &1,
        &500,
        &12_000,
        &hash(&f.env, 2),
    );
    assert_eq!(res, Err(Ok(Error::RoleConflict)));
}

#[test]
fn verify_twice_fails() {
    let f = setup();
    f.register(1);
    f.verify(1);
    let res = f.client.try_verify_lot(
        &f.verifier,
        &f.custodian,
        &1,
        &500,
        &12_000,
        &hash(&f.env, 2),
    );
    assert!(matches!(res, Err(Ok(Error::InvalidLotStatus))));
}

#[test]
fn issue_receipt_requires_verified_status() {
    let f = setup();
    f.register(1);
    let res = f.client.try_issue_receipt(&f.verifier, &1);
    assert!(matches!(res, Err(Ok(Error::InvalidLotStatus))));
}

#[test]
fn issue_receipt_only_by_the_verifying_verifier() {
    let f = setup();
    let other = Address::generate(&f.env);
    f.client.grant_role(&other, &Role::Verifier);
    f.register(1);
    f.verify(1);
    let res = f.client.try_issue_receipt(&other, &1);
    assert!(matches!(res, Err(Ok(Error::NotAuthorized))));
}

#[test]
fn post_valuation_requires_oracle_role() {
    let f = setup();
    f.register(1);
    f.verify(1);
    f.client.issue_receipt(&f.verifier, &1);
    let stranger = Address::generate(&f.env);
    let res = f
        .client
        .try_post_valuation(&stranger, &1, &10_000_000_000_i128);
    assert!(matches!(res, Err(Ok(Error::RoleMissing))));
}

#[test]
fn post_valuation_rejects_non_positive() {
    let f = setup();
    f.register(1);
    f.verify(1);
    f.client.issue_receipt(&f.verifier, &1);
    let res = f.client.try_post_valuation(&f.oracle, &1, &0i128);
    assert!(matches!(res, Err(Ok(Error::AmountInvalid))));
}

#[test]
fn lock_and_unlock_only_from_configured_vault() {
    let f = setup();
    f.receipt(1);
    let vault = Address::generate(&f.env);
    f.client.set_vault(&vault);

    f.client.lock(&vault, &1);
    assert_eq!(f.client.lot_status(&1), LotStatus::Encumbered);
    f.client.unlock(&vault, &1);
    assert_eq!(f.client.lot_status(&1), LotStatus::Receipted);
}

#[test]
fn lock_from_other_address_fails() {
    let f = setup();
    f.receipt(1);
    let vault = Address::generate(&f.env);
    let impostor = Address::generate(&f.env);
    f.client.set_vault(&vault);
    let res = f.client.try_lock(&impostor, &1);
    assert!(matches!(res, Err(Ok(Error::OnlyVault))));
}

#[test]
fn lock_before_configured_vault_fails() {
    let f = setup();
    f.receipt(1);
    let vault = Address::generate(&f.env);
    let res = f.client.try_lock(&vault, &1);
    assert!(matches!(res, Err(Ok(Error::OnlyVault))));
}

#[test]
fn transfer_on_default_sets_new_owner_and_clears_encumbrance() {
    let f = setup();
    f.receipt(1);
    let vault = Address::generate(&f.env);
    let lender = Address::generate(&f.env);
    f.client.set_vault(&vault);
    f.client.lock(&vault, &1);

    f.client.transfer_on_default(&vault, &1, &lender);
    let lot = f.client.get_lot(&1);
    assert_eq!(lot.owner, lender);
    assert_eq!(lot.status, LotStatus::Receipted);
}

#[test]
fn transfer_receipt_moves_ownership_when_unlocked() {
    let f = setup();
    f.receipt(1);
    let buyer = Address::generate(&f.env);
    f.client.transfer_receipt(&f.owner, &1, &buyer);
    assert_eq!(f.client.get_lot(&1).owner, buyer);
}

#[test]
fn transfer_receipt_fails_when_encumbered() {
    let f = setup();
    f.receipt(1);
    let vault = Address::generate(&f.env);
    let buyer = Address::generate(&f.env);
    f.client.set_vault(&vault);
    f.client.lock(&vault, &1);
    let res = f.client.try_transfer_receipt(&f.owner, &1, &buyer);
    assert!(matches!(res, Err(Ok(Error::ReceiptLocked))));
}

#[test]
fn transfer_receipt_requires_current_owner() {
    let f = setup();
    f.receipt(1);
    let stranger = Address::generate(&f.env);
    let buyer = Address::generate(&f.env);
    let res = f.client.try_transfer_receipt(&stranger, &1, &buyer);
    assert!(matches!(res, Err(Ok(Error::NotReceiptOwner))));
}

#[test]
fn record_inspection_updates_measurements_and_keeps_status() {
    let f = setup();
    f.receipt(1);
    f.client
        .record_inspection(&f.verifier, &1, &420, &11_500, &hash(&f.env, 3));
    let lot = f.client.get_lot(&1);
    assert_eq!(lot.moisture_bps, 420);
    assert_eq!(lot.net_kg, 11_500);
    assert_eq!(lot.status, LotStatus::Receipted);
}

#[test]
fn impair_requires_verifier_and_sets_impaired() {
    let f = setup();
    f.receipt(1);
    let stranger = Address::generate(&f.env);
    let res = f.client.try_impair(&stranger, &1);
    assert!(matches!(res, Err(Ok(Error::RoleMissing))));
    f.client.impair(&f.verifier, &1);
    assert_eq!(f.client.lot_status(&1), LotStatus::Impaired);
}

#[test]
fn confirm_sale_records_buyer_hash() {
    let f = setup();
    f.receipt(1);
    f.client.confirm_sale(&f.verifier, &1, &hash(&f.env, 9));
    assert_eq!(f.client.get_lot(&1).sale_hash, Some(hash(&f.env, 9)));
}

#[test]
fn partial_withdraw_reduces_kg_and_requires_owner() {
    let f = setup();
    f.receipt(1);
    f.client
        .partial_withdraw(&f.custodian, &f.owner, &1, &2_000, &hash(&f.env, 4));
    assert_eq!(f.client.get_lot(&1).net_kg, 10_000);

    let stranger = Address::generate(&f.env);
    let res = f
        .client
        .try_partial_withdraw(&f.custodian, &stranger, &1, &1_000, &hash(&f.env, 4));
    assert!(matches!(res, Err(Ok(Error::NotReceiptOwner))));
}

#[test]
fn partial_withdraw_rejects_full_or_zero() {
    let f = setup();
    f.receipt(1);
    let zero = f
        .client
        .try_partial_withdraw(&f.custodian, &f.owner, &1, &0, &hash(&f.env, 4));
    assert!(matches!(zero, Err(Ok(Error::WeightInvalid))));
    let all = f
        .client
        .try_partial_withdraw(&f.custodian, &f.owner, &1, &12_000, &hash(&f.env, 4));
    assert!(matches!(all, Err(Ok(Error::WeightInvalid))));
}

#[test]
fn withdraw_full_closes_lot_when_unlocked() {
    let f = setup();
    f.receipt(1);
    f.client.withdraw_full(&f.custodian, &f.owner, &1);
    let lot = f.client.get_lot(&1);
    assert_eq!(lot.status, LotStatus::Closed);
    assert_eq!(lot.net_kg, 0);
}

#[test]
fn withdraw_full_fails_when_encumbered() {
    let f = setup();
    f.receipt(1);
    let vault = Address::generate(&f.env);
    f.client.set_vault(&vault);
    f.client.lock(&vault, &1);
    let res = f.client.try_withdraw_full(&f.custodian, &f.owner, &1);
    assert!(matches!(res, Err(Ok(Error::ReceiptLocked))));
}

#[test]
fn set_params_validates_band_and_bounds() {
    use crate::Params;
    let f = setup();
    let bad = Params {
        moisture_min_bps: 800,
        moisture_max_bps: 300,
        min_lot_kg: 1_000,
    };
    let res = f.client.try_set_params(&bad);
    assert!(matches!(res, Err(Ok(Error::ParamOutOfBounds))));

    let too_high = Params {
        moisture_min_bps: 300,
        moisture_max_bps: 2_500,
        min_lot_kg: 1_000,
    };
    let res = f.client.try_set_params(&too_high);
    assert!(matches!(res, Err(Ok(Error::ParamOutOfBounds))));

    let ok = Params {
        moisture_min_bps: 300,
        moisture_max_bps: 600,
        min_lot_kg: 2_000,
    };
    f.client.set_params(&ok);
    assert_eq!(f.client.get_params().min_lot_kg, 2_000);
}

#[test]
fn grant_and_revoke_role() {
    let f = setup();
    let acc = Address::generate(&f.env);
    assert!(!f.client.has_role(&acc, &Role::Verifier));
    f.client.grant_role(&acc, &Role::Verifier);
    assert!(f.client.has_role(&acc, &Role::Verifier));
    f.client.revoke_role(&acc, &Role::Verifier);
    assert!(!f.client.has_role(&acc, &Role::Verifier));
}

#[test]
fn unknown_lot_lookup_fails() {
    let f = setup();
    let res = f.client.try_get_lot(&42);
    assert!(matches!(res, Err(Ok(Error::LotNotFound))));
}

#[test]
fn events_are_emitted_on_register_and_verify() {
    use soroban_sdk::testutils::Events as _;
    let f = setup();
    // `events().all()` returns events from the last invocation only.
    f.register(1);
    assert_eq!(f.env.events().all().events().len(), 1);
    f.verify(1);
    assert_eq!(f.env.events().all().events().len(), 1);
    // A failed invocation publishes no events.
    let _ = f.client.try_verify_lot(
        &f.verifier,
        &f.custodian,
        &1,
        &500,
        &12_000,
        &hash(&f.env, 2),
    );
    assert_eq!(f.env.events().all().events().len(), 0);
}

#[test]
fn verify_after_time_travel_still_valid() {
    let f = setup();
    f.register(1);
    f.env.ledger().with_mut(|l| l.timestamp += 86_400);
    f.verify(1);
    assert_eq!(f.client.lot_status(&1), LotStatus::Verified);
}
