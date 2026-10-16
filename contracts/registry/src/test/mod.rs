use crate::{errors::Error, events::LotVerified, types::*, Registry, RegistryClient};
use soroban_sdk::events::Event;
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Events, Ledger},
    Address, BytesN, Env, IntoVal, Symbol,
};

#[contract]
struct VaultHarness;
#[contractimpl]
impl VaultHarness {
    pub fn __constructor(env: Env, registry: Address, admin: Address) {
        admin.require_auth();
        RegistryClient::new(&env, &registry).bind_vault(&admin, &env.current_contract_address());
    }
    pub fn lock(env: Env, registry: Address, id: u64, loan: u64, owner: Address) {
        RegistryClient::new(&env, &registry).lock(&id, &loan, &owner);
    }
    pub fn unlock(env: Env, registry: Address, id: u64, loan: u64) {
        RegistryClient::new(&env, &registry).unlock(&id, &loan);
    }
    pub fn claim(env: Env, registry: Address, id: u64, loan: u64, lender: Address) {
        RegistryClient::new(&env, &registry).transfer_on_default(&id, &loan, &lender);
    }
    pub fn withdraw(
        env: Env,
        registry: Address,
        id: u64,
        loan: u64,
        owner: Address,
        kg: u64,
        hash: BytesN<32>,
    ) {
        owner.require_auth();
        RegistryClient::new(&env, &registry)
            .get_lot(&id)
            .custodian
            .require_auth();
        RegistryClient::new(&env, &registry).withdraw_encumbered(&id, &loan, &owner, &kg, &hash);
    }
}

struct Fixture {
    env: Env,
    registry: Address,
    vault: Address,
    admin: Address,
    owner: Address,
    custodian: Address,
    verifier: Address,
    oracle: Address,
}
impl Fixture {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|ledger| {
            ledger.timestamp = 1_000_000;
            ledger.protocol_version = 29;
        });
        let admin = Address::generate(&env);
        let registry = env.register(Registry, (&admin,));
        let vault = env.register(VaultHarness, (&registry, &admin));
        let owner = Address::generate(&env);
        let custodian = Address::generate(&env);
        let verifier = Address::generate(&env);
        let oracle = Address::generate(&env);
        let client = RegistryClient::new(&env, &registry);
        for (address, role) in [
            (&custodian, Role::Custodian),
            (&verifier, Role::Verifier),
            (&oracle, Role::PriceOracle),
        ] {
            client.grant_role(&admin, address, &role);
        }
        Self {
            env,
            registry,
            vault,
            admin,
            owner,
            custodian,
            verifier,
            oracle,
        }
    }
    fn client(&self) -> RegistryClient<'_> {
        RegistryClient::new(&self.env, &self.registry)
    }
    fn hash(&self) -> BytesN<32> {
        BytesN::from_array(&self.env, &[7; 32])
    }
    fn register(&self) -> u64 {
        self.client().register_lot(
            &self.owner,
            &self.custodian,
            &Symbol::new(&self.env, "YERBA_CANCHADA"),
            &12_000,
            &self.hash(),
            &AgingMethod::Natural,
            &900_000,
            &self.hash(),
        )
    }
    fn receipt(&self) -> u64 {
        let id = self.register();
        self.client()
            .verify_lot(&self.verifier, &id, &12_000, &500, &self.hash());
        self.client().issue_receipt(&self.verifier, &id);
        self.client()
            .post_valuation(&self.oracle, &id, &120_000_000_000, &self.hash());
        id
    }
    fn lock(&self, id: u64) {
        VaultHarnessClient::new(&self.env, &self.vault).lock(&self.registry, &id, &1, &self.owner);
    }
}

#[test]
fn deposit_has_two_exact_authorizations_and_a_verifiable_event() {
    use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
    let f = Fixture::new();
    let id = f.register();
    let args: soroban_sdk::Vec<soroban_sdk::Val> =
        (&f.verifier, id, 12_000u64, 500u32, f.hash()).into_val(&f.env);
    f.client()
        .mock_auths(&[
            MockAuth {
                address: &f.verifier,
                invoke: &MockAuthInvoke {
                    contract: &f.registry,
                    fn_name: "verify_lot",
                    args: args.clone(),
                    sub_invokes: &[],
                },
            },
            MockAuth {
                address: &f.custodian,
                invoke: &MockAuthInvoke {
                    contract: &f.registry,
                    fn_name: "verify_lot",
                    args,
                    sub_invokes: &[],
                },
            },
        ])
        .verify_lot(&f.verifier, &id, &12_000, &500, &f.hash());
    let auths = f.env.auths();
    assert_eq!(auths.len(), 2);
    assert_eq!(auths[0].0, f.verifier);
    assert_eq!(auths[1].0, f.custodian);
    let events = f.env.events().all();
    let value = f.client().get_lot(&id);
    assert_eq!(value.physical_status, PhysicalStatus::Verified);
    assert_eq!(value.receipt_status, ReceiptStatus::Unissued);
    let expected = LotVerified {
        lot_id: id,
        lot: value.clone(),
        timestamp: 1_000_000,
    };
    assert_eq!(
        events.events().last(),
        Some(&expected.to_xdr(&f.env, &f.registry))
    );
    assert_eq!(
        expected.topics(&f.env),
        soroban_sdk::vec![
            &f.env,
            Symbol::new(&f.env, "LotVerified").into_val(&f.env),
            id.into_val(&f.env)
        ]
    );
    assert_eq!(value.last_attestation.evidence, f.hash());
    assert_eq!(value.last_attestation.co_signer, Some(f.custodian));
}

#[test]
fn missing_custodian_authorization_cannot_verify() {
    use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
    let f = Fixture::new();
    let id = f.register();
    let args: soroban_sdk::Vec<soroban_sdk::Val> =
        (&f.verifier, id, 12_000u64, 500u32, f.hash()).into_val(&f.env);
    assert!(f
        .client()
        .mock_auths(&[MockAuth {
            address: &f.verifier,
            invoke: &MockAuthInvoke {
                contract: &f.registry,
                fn_name: "verify_lot",
                args,
                sub_invokes: &[]
            }
        }])
        .try_verify_lot(&f.verifier, &id, &12_000, &500, &f.hash())
        .is_err());
    assert_eq!(
        f.client().get_lot(&id).physical_status,
        PhysicalStatus::Registered
    );
}

#[test]
fn vault_binding_is_one_time_and_precedes_lots() {
    let f = Fixture::new();
    assert_eq!(f.client().get_vault(), Some(f.vault.clone()));
    assert_eq!(
        f.client().try_bind_vault(&f.admin, &f.vault),
        Err(Ok(Error::VaultAlreadyConfigured))
    );
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let custodian = Address::generate(&env);
    let registry = env.register(Registry, (&admin,));
    let client = RegistryClient::new(&env, &registry);
    client.grant_role(&admin, &custodian, &Role::Custodian);
    let hash = BytesN::from_array(&env, &[1; 32]);
    assert_eq!(
        client.try_register_lot(
            &owner,
            &custodian,
            &Symbol::new(&env, "YERBA_CANCHADA"),
            &12_000,
            &hash,
            &AgingMethod::Natural,
            &0,
            &hash
        ),
        Err(Ok(Error::VaultNotConfigured))
    );
    let account = Address::from_str(
        &env,
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    );
    assert_eq!(
        client.try_bind_vault(&admin, &account),
        Err(Ok(Error::InvalidAddress))
    );
}

#[test]
fn admin_does_not_authorize_direct_vault_only_entrypoints() {
    use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
    let f = Fixture::new();
    let id = f.receipt();
    let args: soroban_sdk::Vec<soroban_sdk::Val> = (id, 1u64, &f.owner).into_val(&f.env);
    assert!(f
        .client()
        .mock_auths(&[MockAuth {
            address: &f.admin,
            invoke: &MockAuthInvoke {
                contract: &f.registry,
                fn_name: "lock",
                args,
                sub_invokes: &[]
            }
        }])
        .try_lock(&id, &1, &f.owner)
        .is_err());
    assert_eq!(
        f.client().get_lot(&id).receipt_status,
        ReceiptStatus::Receipted
    );
}

#[test]
fn roles_are_admin_only_idempotent_and_revocable() {
    let f = Fixture::new();
    let outsider = Address::generate(&f.env);
    assert_eq!(
        f.client()
            .try_grant_role(&outsider, &outsider, &Role::Verifier),
        Err(Ok(Error::NotAuthorized))
    );
    f.client()
        .grant_role(&f.admin, &f.verifier, &Role::Verifier);
    assert!(f.client().has_role(&f.verifier, &Role::Verifier));
    let id = f.register();
    f.client()
        .revoke_role(&f.admin, &f.verifier, &Role::Verifier);
    assert!(!f.client().has_role(&f.verifier, &Role::Verifier));
    assert_eq!(
        f.client()
            .try_verify_lot(&f.verifier, &id, &12_000, &500, &f.hash()),
        Err(Ok(Error::RoleMissing))
    );
    assert_eq!(
        f.client()
            .try_set_params(&outsider, &RegistryParams::default()),
        Err(Ok(Error::NotAuthorized))
    );
}

#[test]
fn registration_rejects_unbacked_or_unsupported_declarations() {
    let f = Fixture::new();
    let zero = BytesN::from_array(&f.env, &[0; 32]);
    let client = f.client();
    let commodity = Symbol::new(&f.env, "YERBA_CANCHADA");
    assert_eq!(
        client.try_register_lot(
            &f.owner,
            &f.custodian,
            &Symbol::new(&f.env, "SOY"),
            &12_000,
            &f.hash(),
            &AgingMethod::Natural,
            &0,
            &f.hash()
        ),
        Err(Ok(Error::UnsupportedCommodity))
    );
    assert_eq!(
        client.try_register_lot(
            &f.owner,
            &f.custodian,
            &commodity,
            &0,
            &f.hash(),
            &AgingMethod::Natural,
            &0,
            &f.hash()
        ),
        Err(Ok(Error::WeightInvalid))
    );
    assert_eq!(
        client.try_register_lot(
            &f.owner,
            &f.custodian,
            &commodity,
            &999,
            &f.hash(),
            &AgingMethod::Natural,
            &0,
            &f.hash()
        ),
        Err(Ok(Error::WeightInvalid))
    );
    assert_eq!(
        client.try_register_lot(
            &f.owner,
            &f.custodian,
            &commodity,
            &1_000,
            &f.hash(),
            &AgingMethod::Natural,
            &0,
            &zero
        ),
        Err(Ok(Error::EvidenceMissing))
    );
    assert_eq!(
        client.try_register_lot(
            &f.custodian,
            &f.custodian,
            &commodity,
            &12_000,
            &f.hash(),
            &AgingMethod::Natural,
            &0,
            &f.hash()
        ),
        Err(Ok(Error::RoleConflict))
    );
    assert_eq!(
        client.try_register_lot(
            &f.owner,
            &f.custodian,
            &commodity,
            &12_000,
            &zero,
            &AgingMethod::Natural,
            &0,
            &f.hash()
        ),
        Err(Ok(Error::ParamOutOfBounds))
    );
    assert_eq!(
        client.try_register_lot(
            &f.owner,
            &f.custodian,
            &commodity,
            &12_000,
            &f.hash(),
            &AgingMethod::Natural,
            &1_000_001,
            &f.hash()
        ),
        Err(Ok(Error::ParamOutOfBounds))
    );
    assert_eq!(f.register(), 1);
}

#[test]
fn moisture_boundaries_and_verifier_separation_are_enforced() {
    let f = Fixture::new();
    for humidity in [299u32, 701] {
        let id = f.register();
        assert_eq!(
            f.client()
                .try_verify_lot(&f.verifier, &id, &12_000, &humidity, &f.hash()),
            Err(Ok(Error::MoistureOutOfBand))
        );
    }
    for humidity in [300u32, 700] {
        let id = f.register();
        f.client()
            .verify_lot(&f.verifier, &id, &1_000, &humidity, &f.hash());
    }
    let id = f.register();
    f.client().grant_role(&f.admin, &f.owner, &Role::Verifier);
    f.client()
        .grant_role(&f.admin, &f.custodian, &Role::Verifier);
    for actor in [&f.owner, &f.custodian] {
        assert_eq!(
            f.client()
                .try_verify_lot(actor, &id, &12_000, &500, &f.hash()),
            Err(Ok(Error::RoleConflict))
        );
    }
    assert_eq!(
        f.client()
            .try_verify_lot(&f.verifier, &id, &999, &500, &f.hash()),
        Err(Ok(Error::WeightInvalid))
    );
    assert_eq!(
        f.client().try_verify_lot(
            &f.verifier,
            &id,
            &12_000,
            &500,
            &BytesN::from_array(&f.env, &[0; 32])
        ),
        Err(Ok(Error::EvidenceMissing))
    );
}

#[test]
fn receipt_issuance_requires_original_verifier_and_occurs_once() {
    let f = Fixture::new();
    let id = f.register();
    assert_eq!(
        f.client().try_issue_receipt(&f.verifier, &id),
        Err(Ok(Error::InvalidLotStatus))
    );
    f.client()
        .verify_lot(&f.verifier, &id, &12_000, &500, &f.hash());
    let other = Address::generate(&f.env);
    f.client().grant_role(&f.admin, &other, &Role::Verifier);
    assert_eq!(
        f.client().try_issue_receipt(&other, &id),
        Err(Ok(Error::NotAuthorized))
    );
    f.client().issue_receipt(&f.verifier, &id);
    assert_eq!(
        f.client().try_issue_receipt(&f.verifier, &id),
        Err(Ok(Error::InvalidLotStatus))
    );
    assert_eq!(
        f.client().try_reject_lot(&f.verifier, &id, &f.hash()),
        Err(Ok(Error::InvalidLotStatus))
    );
}

#[test]
fn rejected_lots_are_terminal() {
    let f = Fixture::new();
    let id = f.register();
    f.client().reject_lot(&f.verifier, &id, &f.hash());
    assert_eq!(
        f.client().get_lot(&id).physical_status,
        PhysicalStatus::Rejected
    );
    assert_eq!(
        f.client()
            .try_verify_lot(&f.verifier, &id, &12_000, &500, &f.hash()),
        Err(Ok(Error::InvalidLotStatus))
    );
    assert_eq!(
        f.client().try_reject_lot(&f.verifier, &id, &f.hash()),
        Err(Ok(Error::InvalidLotStatus))
    );
}

#[test]
fn inspections_preserve_mass_balance_and_do_not_revalue_inventory() {
    let f = Fixture::new();
    let id = f.receipt();
    f.client().record_inspection(
        &f.verifier,
        &id,
        &11_900,
        &690,
        &InspectionKind::MoistureDrift,
        &f.hash(),
    );
    let before = f.client().get_lot(&id);
    assert_eq!(before.recorded_losses_kg, 100);
    assert!(before.moisture_drift);
    assert_eq!(before.valued_kg, 12_000);
    f.client().partial_withdraw(&f.owner, &id, &900, &f.hash());
    let value = f.client().get_lot(&id);
    assert_eq!(
        value.initial_verified_kg,
        value.net_kg + value.withdrawn_kg + value.recorded_losses_kg
    );
    assert_eq!(value.valuation, before.valuation);
    assert_eq!(value.valued_at, before.valued_at);
    assert_eq!(
        f.client().try_record_inspection(
            &f.verifier,
            &id,
            &12_000,
            &500,
            &InspectionKind::Passed,
            &f.hash()
        ),
        Err(Ok(Error::WeightInvalid))
    );
    f.client().record_inspection(
        &f.verifier,
        &id,
        &11_000,
        &500,
        &InspectionKind::Passed,
        &f.hash(),
    );
    assert!(!f.client().get_lot(&id).moisture_drift);
}

#[test]
fn oracle_cannot_duplicate_custody_or_verification_and_amount_must_be_positive() {
    let f = Fixture::new();
    let id = f.receipt();
    for actor in [&f.verifier, &f.custodian] {
        f.client().grant_role(&f.admin, actor, &Role::PriceOracle);
        assert_eq!(
            f.client().try_post_valuation(actor, &id, &10, &f.hash()),
            Err(Ok(Error::RoleConflict))
        );
    }
    assert_eq!(
        f.client().try_post_valuation(&f.oracle, &id, &0, &f.hash()),
        Err(Ok(Error::AmountInvalid))
    );
    assert_eq!(
        f.client()
            .try_post_valuation(&f.oracle, &id, &10, &BytesN::from_array(&f.env, &[0; 32])),
        Err(Ok(Error::EvidenceMissing))
    );
}

#[test]
fn encumbrance_is_exclusive_and_disallows_free_transfers_or_withdrawals() {
    let f = Fixture::new();
    let id = f.receipt();
    f.lock(id);
    let buyer = Address::generate(&f.env);
    assert_eq!(f.client().get_lot(&id).loan_id, Some(1));
    assert_eq!(
        f.client().try_transfer_receipt(&f.owner, &id, &buyer),
        Err(Ok(Error::ReceiptLocked))
    );
    assert_eq!(
        f.client()
            .try_partial_withdraw(&f.owner, &id, &1_000, &f.hash()),
        Err(Ok(Error::ReceiptLocked))
    );
    assert_eq!(
        f.client().try_withdraw_full(&f.owner, &id, &f.hash()),
        Err(Ok(Error::ReceiptLocked))
    );
    assert!(VaultHarnessClient::new(&f.env, &f.vault)
        .try_lock(&f.registry, &id, &2, &f.owner)
        .is_err());
    assert!(VaultHarnessClient::new(&f.env, &f.vault)
        .try_unlock(&f.registry, &id, &2)
        .is_err());
    VaultHarnessClient::new(&f.env, &f.vault).withdraw(
        &f.registry,
        &id,
        &1,
        &f.owner,
        &2_000,
        &f.hash(),
    );
    let value = f.client().get_lot(&id);
    assert_eq!(value.net_kg, 10_000);
    assert_eq!(value.receipt_status, ReceiptStatus::Encumbered);
}

#[test]
fn impairment_survives_release_and_default_transfer() {
    let f = Fixture::new();
    let lender = Address::generate(&f.env);
    for claim in [false, true] {
        let id = f.receipt();
        f.lock(id);
        f.client()
            .impair(&f.verifier, &id, &ImpairmentReason::Moisture, &f.hash());
        assert_eq!(f.client().get_lot(&id).loan_id, Some(1));
        if claim {
            VaultHarnessClient::new(&f.env, &f.vault).claim(&f.registry, &id, &1, &lender);
        } else {
            VaultHarnessClient::new(&f.env, &f.vault).unlock(&f.registry, &id, &1);
        }
        let value = f.client().get_lot(&id);
        assert_eq!(value.physical_status, PhysicalStatus::Impaired);
        assert_eq!(value.receipt_status, ReceiptStatus::Receipted);
        assert_eq!(value.loan_id, None);
        assert_eq!(
            value.owner,
            if claim {
                lender.clone()
            } else {
                f.owner.clone()
            }
        );
        assert_eq!(
            f.client()
                .try_post_valuation(&f.oracle, &id, &10, &f.hash()),
            Err(Ok(Error::LotImpaired))
        );
    }
}

#[test]
fn free_transfers_require_owner_and_preserve_separation() {
    let f = Fixture::new();
    let id = f.receipt();
    let buyer = Address::generate(&f.env);
    assert_eq!(
        f.client().try_transfer_receipt(&buyer, &id, &buyer),
        Err(Ok(Error::NotReceiptOwner))
    );
    assert_eq!(
        f.client().try_transfer_receipt(&f.owner, &id, &f.owner),
        Err(Ok(Error::InvalidAddress))
    );
    assert_eq!(
        f.client().try_transfer_receipt(&f.owner, &id, &f.custodian),
        Err(Ok(Error::RoleConflict))
    );
    f.client().transfer_receipt(&f.owner, &id, &buyer);
    assert_eq!(f.client().get_lot(&id).owner, buyer);
    assert_eq!(f.client().get_lot(&id).original_borrower, f.owner);
}

#[test]
fn withdrawals_cannot_overdraw_or_break_minimum_and_closure_is_terminal() {
    let f = Fixture::new();
    let id = f.receipt();
    for kg in [0u64, 12_000, 11_001] {
        assert_eq!(
            f.client()
                .try_partial_withdraw(&f.owner, &id, &kg, &f.hash()),
            Err(Ok(Error::WeightInvalid))
        );
    }
    f.client()
        .partial_withdraw(&f.owner, &id, &11_000, &f.hash());
    assert_eq!(f.client().get_lot(&id).net_kg, 1_000);
    f.client().withdraw_full(&f.owner, &id, &f.hash());
    let value = f.client().get_lot(&id);
    assert_eq!(value.physical_status, PhysicalStatus::Closed);
    assert_eq!(value.receipt_status, ReceiptStatus::Retired);
    assert_eq!(value.net_kg, 0);
    assert_eq!(value.withdrawn_kg, 12_000);
    assert_eq!(
        f.client().try_withdraw_full(&f.owner, &id, &f.hash()),
        Err(Ok(Error::InvalidLotStatus))
    );
}

#[test]
fn policy_bounds_are_checked_without_changing_existing_lots() {
    let f = Fixture::new();
    let id = f.receipt();
    for params in [
        RegistryParams {
            moisture_min_bps: 700,
            moisture_max_bps: 700,
            min_lot_kg: 1_000,
        },
        RegistryParams {
            moisture_min_bps: 0,
            moisture_max_bps: 2_001,
            min_lot_kg: 1_000,
        },
        RegistryParams {
            moisture_min_bps: 300,
            moisture_max_bps: 700,
            min_lot_kg: 0,
        },
    ] {
        assert_eq!(
            f.client().try_set_params(&f.admin, &params),
            Err(Ok(Error::ParamOutOfBounds))
        );
    }
    assert_eq!(f.client().get_lot(&id).moisture_bps, 500);
    assert_eq!(f.client().try_get_lot(&999), Err(Ok(Error::LotNotFound)));
}

#[test]
fn every_user_mutation_requires_real_authorization_before_business_checks() {
    let f = Fixture::new();
    let id = f.register();
    let client = f.client();
    let outsider = Address::generate(&f.env);
    macro_rules! denied {
        ($call:expr) => {
            assert!(
                matches!($call, Err(Err(_))),
                "missing auth must be a host rejection"
            );
        };
    }
    f.env.set_auths(&[]);
    denied!(client.try_grant_role(&f.admin, &outsider, &Role::Verifier));
    denied!(client.try_revoke_role(&f.admin, &f.verifier, &Role::Verifier));
    denied!(client.try_set_params(&f.admin, &RegistryParams::default()));
    denied!(client.try_bind_vault(&f.admin, &f.vault));
    denied!(client.try_register_lot(
        &f.owner,
        &f.custodian,
        &Symbol::new(&f.env, "YERBA_CANCHADA"),
        &12_000,
        &f.hash(),
        &AgingMethod::Natural,
        &0,
        &f.hash()
    ));
    denied!(client.try_verify_lot(&f.verifier, &id, &12_000, &500, &f.hash()));
    denied!(client.try_reject_lot(&f.verifier, &id, &f.hash()));
    f.env.mock_all_auths();
    client.verify_lot(&f.verifier, &id, &12_000, &500, &f.hash());
    f.env.set_auths(&[]);
    denied!(client.try_issue_receipt(&f.verifier, &id));
    f.env.mock_all_auths();
    client.issue_receipt(&f.verifier, &id);
    f.env.set_auths(&[]);
    denied!(client.try_post_valuation(&f.oracle, &id, &10, &f.hash()));
    denied!(client.try_record_inspection(
        &f.verifier,
        &id,
        &12_000,
        &500,
        &InspectionKind::Passed,
        &f.hash()
    ));
    denied!(client.try_impair(&f.verifier, &id, &ImpairmentReason::Fire, &f.hash()));
    denied!(client.try_transfer_receipt(&f.owner, &id, &outsider));
    denied!(client.try_partial_withdraw(&f.owner, &id, &1_000, &f.hash()));
    denied!(client.try_withdraw_full(&f.owner, &id, &f.hash()));
    denied!(client.try_lock(&id, &1, &f.owner));
    f.env.mock_all_auths();
    f.lock(id);
    f.env.set_auths(&[]);
    denied!(client.try_unlock(&id, &1));
    denied!(client.try_transfer_on_default(&id, &1, &outsider));
    denied!(client.try_withdraw_encumbered(&id, &1, &f.owner, &1_000, &f.hash()));
    let value = client.get_lot(&id);
    assert_eq!(value.receipt_status, ReceiptStatus::Encumbered);
    assert_eq!(value.physical_status, PhysicalStatus::Verified);
    assert_eq!(value.net_kg, 12_000);
}
