use crate::{
    registry::{
        self, AgingMethod, Client as RegistryClient, ImpairmentReason, InspectionKind,
        PhysicalStatus, ReceiptStatus, Role,
    },
    types::*,
    Error, Vault, VaultClient,
};
use soroban_sdk::{
    testutils::{Address as _, Events, Ledger},
    token, Address, BytesN, Env, Symbol,
};

const UNIT: i128 = 10_000_000;
const PRINCIPAL: i128 = 5_000 * UNIT;
const START: u64 = 1_000_000;
const QUARTER: u64 = 7_884_000;

struct Fixture {
    env: Env,
    admin: Address,
    borrower: Address,
    custodian: Address,
    verifier: Address,
    oracle: Address,
    lender: Address,
    registry: Address,
    vault: Address,
    asset: Address,
}
impl Fixture {
    fn new() -> Self {
        let env = Env::default();
        // Wasm deployment invokes its constructor below the host creation frame.
        env.mock_all_auths_allowing_non_root_auth();
        env.cost_estimate().budget().reset_unlimited();
        env.ledger().with_mut(|l| {
            l.timestamp = START;
            l.protocol_version = 29;
        });
        let admin = Address::generate(&env);
        let borrower = Address::generate(&env);
        let custodian = Address::generate(&env);
        let verifier = Address::generate(&env);
        let oracle = Address::generate(&env);
        let lender = Address::generate(&env);
        let registry = env.register(registry::WASM, (&admin,));
        let asset = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();
        let vault = env.register(Vault, (&admin, &registry, &asset));
        // All operational tests retain strict root-bound authorization recording.
        env.mock_all_auths();
        let client = RegistryClient::new(&env, &registry);
        for (a, r) in [
            (&custodian, Role::Custodian),
            (&verifier, Role::Verifier),
            (&oracle, Role::PriceOracle),
        ] {
            client.grant_role(&admin, a, &r);
        }
        token::StellarAssetClient::new(&env, &asset).mint(&lender, &(100_000 * UNIT));
        token::StellarAssetClient::new(&env, &asset).mint(&borrower, &(10_000 * UNIT));
        Self {
            env,
            admin,
            borrower,
            custodian,
            verifier,
            oracle,
            lender,
            registry,
            vault,
            asset,
        }
    }
    fn client(&self) -> VaultClient<'_> {
        VaultClient::new(&self.env, &self.vault)
    }
    fn registry(&self) -> RegistryClient<'_> {
        RegistryClient::new(&self.env, &self.registry)
    }
    fn hash(&self) -> BytesN<32> {
        BytesN::from_array(&self.env, &[3; 32])
    }
    fn lot(&self) -> u64 {
        let client = self.registry();
        let id = client.register_lot(
            &self.borrower,
            &self.custodian,
            &Symbol::new(&self.env, "YERBA_CANCHADA"),
            &12_000,
            &self.hash(),
            &AgingMethod::Natural,
            &START,
            &self.hash(),
        );
        client.verify_lot(&self.verifier, &id, &12_000, &500, &self.hash());
        client.issue_receipt(&self.verifier, &id);
        client.post_valuation(&self.oracle, &id, &(12_000 * UNIT), &self.hash());
        id
    }
    fn request(&self, id: u64) -> u64 {
        self.client()
            .request_loan(&self.borrower, &id, &PRINCIPAL, &1_200, &31_536_000)
    }
    fn funded(&self) -> (u64, u64) {
        let id = self.lot();
        let loan = self.request(id);
        self.client().fund(&self.lender, &loan);
        (id, loan)
    }
    fn time(&self, now: u64) {
        self.env.ledger().with_mut(|l| l.timestamp = now);
    }
    fn balance(&self, a: &Address) -> i128 {
        token::Client::new(&self.env, &self.asset).balance(a)
    }
    fn renew(&self, lot: u64) {
        self.registry()
            .post_valuation(&self.oracle, &lot, &(12_000 * UNIT), &self.hash());
    }
}

#[test]
fn full_lifecycle_transfers_directly_pays_interest_first_and_unlocks() {
    let f = Fixture::new();
    let id = f.lot();
    assert_eq!(f.client().get_config().registry, f.registry);
    assert_eq!(f.registry().get_vault(), Some(f.vault.clone()));
    assert_eq!(f.client().max_principal(&id), 6_120 * UNIT);
    let loan = f.request(id);
    assert_eq!(f.client().debt_of(&loan), 0);
    assert_eq!(
        f.registry().get_lot(&id).receipt_status,
        ReceiptStatus::Encumbered
    );
    f.client().fund(&f.lender, &loan);
    assert_eq!(f.balance(&f.borrower), 15_000 * UNIT);
    assert_eq!(f.balance(&f.lender), 95_000 * UNIT);
    assert_eq!(f.balance(&f.vault), 0);
    f.time(START + QUARTER);
    assert_eq!(f.client().debt_of(&loan), 5_150 * UNIT);
    assert_eq!(
        f.client().repay(&f.borrower, &loan, &(1_150 * UNIT)),
        1_150 * UNIT
    );
    let partial = f.client().get_loan(&loan);
    assert_eq!(partial.principal_outstanding, 4_000 * UNIT);
    assert_eq!(partial.interest_due, 0);
    assert_eq!(partial.status, LoanStatus::PartiallyRepaid);
    f.time(START + 2 * QUARTER);
    assert_eq!(f.client().debt_of(&loan), 4_120 * UNIT);
    let actual = f.client().repay(&f.borrower, &loan, &i128::MAX);
    assert_eq!(actual, 4_120 * UNIT);
    assert_eq!(f.client().debt_of(&loan), 0);
    assert_eq!(f.client().get_loan(&loan).status, LoanStatus::Repaid);
    assert_eq!(
        f.registry().get_lot(&id).receipt_status,
        ReceiptStatus::Receipted
    );
    assert_eq!(f.registry().get_lot(&id).loan_id, None);
    assert_eq!(f.balance(&f.vault), 0);
    assert_eq!(f.balance(&f.lender), 100_270 * UNIT);
}

#[test]
fn failed_funding_rolls_back_loan_state_and_sac_balances() {
    let f = Fixture::new();
    let id = f.lot();
    let loan = f.request(id);
    let empty = Address::generate(&f.env);
    assert!(f.client().try_fund(&empty, &loan).is_err());
    let state = f.client().get_loan(&loan);
    assert_eq!(state.status, LoanStatus::Requested);
    assert_eq!(state.lender, None);
    assert_eq!(state.principal_outstanding, 0);
    assert_eq!(f.balance(&f.borrower), 10_000 * UNIT);
    assert_eq!(f.registry().get_lot(&id).loan_id, Some(loan));
    f.client().fund(&f.lender, &loan);
    assert_eq!(
        f.client().try_fund(&f.lender, &loan),
        Err(Ok(Error::InvalidLoanStatus))
    );
}

#[test]
fn failed_repayment_does_not_reduce_debt_or_release_collateral() {
    let f = Fixture::new();
    let (id, loan) = f.funded();
    let empty = Address::generate(&f.env);
    assert!(f.client().try_repay(&empty, &loan, &PRINCIPAL).is_err());
    assert_eq!(f.client().debt_of(&loan), PRINCIPAL);
    assert_eq!(f.client().get_loan(&loan).status, LoanStatus::Funded);
    assert_eq!(f.registry().get_lot(&id).loan_id, Some(loan));
}

#[test]
fn stale_valuation_blocks_funding_and_withdrawal_but_never_repayment() {
    let f = Fixture::new();
    let id = f.lot();
    let loan = f.request(id);
    f.time(START + 604_801);
    assert_eq!(
        f.client().try_fund(&f.lender, &loan),
        Err(Ok(Error::ValuationStale))
    );
    f.renew(id);
    f.client().fund(&f.lender, &loan);
    f.time(START + 2 * 604_801);
    assert_eq!(
        f.client()
            .try_partial_withdraw(&f.borrower, &loan, &1_000, &f.hash()),
        Err(Ok(Error::ValuationStale))
    );
    f.client().repay(&f.borrower, &loan, &i128::MAX);
    assert_eq!(f.client().get_loan(&loan).status, LoanStatus::Repaid);
}

#[test]
fn freshness_boundary_is_inclusive_and_loss_scales_valuation_without_refreshing_date() {
    let f = Fixture::new();
    let id = f.lot();
    f.time(START + 604_800);
    assert_eq!(f.client().max_principal(&id), 6_120 * UNIT);
    f.registry().record_inspection(
        &f.verifier,
        &id,
        &10_000,
        &500,
        &InspectionKind::Passed,
        &f.hash(),
    );
    assert_eq!(f.client().max_principal(&id), 5_100 * UNIT);
    assert_eq!(f.registry().get_lot(&id).valued_at, START);
    f.time(START + 604_801);
    assert_eq!(
        f.client().try_max_principal(&id),
        Err(Ok(Error::ValuationStale))
    );
}

#[test]
fn impairment_enables_early_default_and_claim_preserves_physical_damage() {
    let f = Fixture::new();
    let (id, loan) = f.funded();
    let caller = Address::generate(&f.env);
    assert_eq!(
        f.client().try_mark_default(&caller, &loan),
        Err(Ok(Error::NotMatured))
    );
    f.registry()
        .impair(&f.verifier, &id, &ImpairmentReason::Moisture, &f.hash());
    f.client().mark_default(&caller, &loan);
    let events = f.env.events().all().filter_by_contract(&f.vault);
    use soroban_sdk::events::Event;
    let expected = crate::events::LoanDefaulted {
        lot_id: id,
        loan_id: loan,
        loan: f.client().get_loan(&loan),
        actor: caller.clone(),
        by_impairment: true,
        settlement_asset: f.asset.clone(),
        timestamp: START,
    };
    assert_eq!(
        events.events().last(),
        Some(&expected.to_xdr(&f.env, &f.vault))
    );

    assert_eq!(f.registry().get_lot(&id).owner, f.borrower);
    assert_eq!(
        f.client().try_claim_collateral(&caller, &loan),
        Err(Ok(Error::NotAuthorized))
    );
    f.client().claim_collateral(&f.lender, &loan);
    let value = f.registry().get_lot(&id);
    assert_eq!(value.owner, f.lender);
    assert_eq!(value.physical_status, PhysicalStatus::Impaired);
    assert_eq!(value.receipt_status, ReceiptStatus::Receipted);
    assert_eq!(value.loan_id, None);
    assert_eq!(f.client().get_loan(&loan).status, LoanStatus::Liquidated);
    let frozen = f.client().debt_of(&loan);
    f.time(START + QUARTER);
    assert_eq!(f.client().debt_of(&loan), frozen);
    assert_eq!(
        f.client().try_claim_collateral(&f.lender, &loan),
        Err(Ok(Error::InvalidLoanStatus))
    );
    assert_eq!(
        f.client().try_repay(&f.borrower, &loan, &PRINCIPAL),
        Err(Ok(Error::InvalidLoanStatus))
    );
    assert_eq!(f.balance(&f.vault), 0);
}

#[test]
fn payer_can_cure_default_before_claim_without_curing_impairment() {
    let f = Fixture::new();
    let (id, loan) = f.funded();
    f.registry()
        .impair(&f.verifier, &id, &ImpairmentReason::Pest, &f.hash());
    f.client().mark_default(&f.borrower, &loan);
    f.client().repay(&f.borrower, &loan, &UNIT);
    assert_eq!(f.client().get_loan(&loan).status, LoanStatus::Defaulted);
    f.client().repay(&f.borrower, &loan, &i128::MAX);
    assert_eq!(f.client().get_loan(&loan).status, LoanStatus::Repaid);
    assert_eq!(
        f.registry().get_lot(&id).physical_status,
        PhysicalStatus::Impaired
    );
    assert_eq!(f.registry().get_lot(&id).owner, f.borrower);
    assert_eq!(f.registry().get_lot(&id).loan_id, None);
    assert_eq!(
        f.client().try_claim_collateral(&f.lender, &loan),
        Err(Ok(Error::InvalidLoanStatus))
    );
}

#[test]
fn maturity_and_grace_must_be_strictly_exceeded() {
    let f = Fixture::new();
    let mut policy = f.client().get_params();
    policy.grace_period_secs = 100;
    f.client().set_params(&f.admin, &policy);
    let (_, loan) = f.funded();
    let maturity = f.client().get_loan(&loan).maturity;
    f.time(maturity + 100);
    assert_eq!(
        f.client().try_mark_default(&f.borrower, &loan),
        Err(Ok(Error::NotMatured))
    );
    f.time(maturity + 101);
    f.client().mark_default(&f.borrower, &loan);
    assert_eq!(f.client().get_loan(&loan).status, LoanStatus::Defaulted);
}

#[test]
fn pledged_withdrawal_checks_remaining_capacity_and_preserves_lock() {
    let f = Fixture::new();
    let (id, loan) = f.funded();
    f.time(START + QUARTER);
    f.client().repay(&f.borrower, &loan, &(1_150 * UNIT));
    f.renew(id);
    assert_eq!(
        f.client()
            .try_partial_withdraw(&f.borrower, &loan, &5_000, &f.hash()),
        Err(Ok(Error::WithdrawalBreaksLtv))
    );
    assert_eq!(f.registry().get_lot(&id).net_kg, 12_000);
    f.client()
        .partial_withdraw(&f.borrower, &loan, &2_000, &f.hash());
    let lot = f.registry().get_lot(&id);
    assert_eq!(lot.net_kg, 10_000);
    assert_eq!(lot.withdrawn_kg, 2_000);
    assert_eq!(lot.receipt_status, ReceiptStatus::Encumbered);
    assert_eq!(lot.loan_id, Some(loan));
    assert_eq!(f.client().debt_of(&loan), 4_000 * UNIT);
}

#[test]
fn pledged_withdrawal_requires_both_exact_authorizations() {
    use soroban_sdk::{
        testutils::{MockAuth, MockAuthInvoke},
        IntoVal,
    };
    let f = Fixture::new();
    let (id, loan) = f.funded();
    let args: soroban_sdk::Vec<soroban_sdk::Val> =
        (&f.borrower, loan, 1_000u64, f.hash()).into_val(&f.env);
    assert!(f
        .client()
        .mock_auths(&[MockAuth {
            address: &f.borrower,
            invoke: &MockAuthInvoke {
                contract: &f.vault,
                fn_name: "partial_withdraw",
                args,
                sub_invokes: &[]
            }
        }])
        .try_partial_withdraw(&f.borrower, &loan, &1_000, &f.hash())
        .is_err());
    assert_eq!(f.registry().get_lot(&id).net_kg, 12_000);
}

#[test]
fn pause_does_not_block_cancellation_or_repayment_and_parameters_are_snapshotted() {
    let f = Fixture::new();
    let id = f.lot();
    let loan = f.request(id);
    let mut policy = f.client().get_params();
    policy.max_ltv_bps = 1_000;
    f.client().set_params(&f.admin, &policy);
    f.client().set_paused(&f.admin, &true);
    assert_eq!(
        f.client().try_fund(&f.lender, &loan),
        Err(Ok(Error::Paused))
    );
    f.client().set_paused(&f.admin, &false);
    assert_eq!(f.client().max_principal(&id), 1_020 * UNIT);
    f.client().fund(&f.lender, &loan);
    assert_eq!(f.client().get_loan(&loan).policy.max_ltv_bps, 6_000);
    f.client().set_paused(&f.admin, &true);
    f.client().repay(&f.borrower, &loan, &i128::MAX);
    assert_eq!(f.client().get_loan(&loan).status, LoanStatus::Repaid);
    assert_eq!(
        f.client()
            .try_request_loan(&f.borrower, &id, &UNIT, &1_200, &86_400),
        Err(Ok(Error::Paused))
    );
    f.client().set_paused(&f.admin, &false);
    let other = f
        .client()
        .request_loan(&f.borrower, &id, &UNIT, &1_200, &86_400);
    f.client().set_paused(&f.admin, &true);
    f.client().cancel_request(&f.borrower, &other);
    assert_eq!(f.client().get_loan(&other).status, LoanStatus::Cancelled);
}

#[test]
fn invalid_requests_and_duplicate_pledging_are_rejected() {
    let f = Fixture::new();
    let id = f.lot();
    let stranger = Address::generate(&f.env);
    assert_eq!(
        f.client()
            .try_request_loan(&stranger, &id, &PRINCIPAL, &1_200, &86_400),
        Err(Ok(Error::NotReceiptOwner))
    );
    assert_eq!(
        f.client()
            .try_request_loan(&f.borrower, &id, &0, &1_200, &86_400),
        Err(Ok(Error::AmountInvalid))
    );
    assert_eq!(
        f.client()
            .try_request_loan(&f.borrower, &id, &(6_120 * UNIT + 1), &1_200, &86_400),
        Err(Ok(Error::ExceedsMaxPrincipal))
    );
    assert_eq!(
        f.client()
            .try_request_loan(&f.borrower, &id, &PRINCIPAL, &3_001, &86_400),
        Err(Ok(Error::ParamOutOfBounds))
    );
    for duration in [0u64, 86_399, 31_536_001] {
        assert_eq!(
            f.client()
                .try_request_loan(&f.borrower, &id, &PRINCIPAL, &1_200, &duration),
            Err(Ok(Error::InvalidDuration))
        );
    }
    let loan = f.request(id);
    assert_eq!(
        f.client()
            .try_request_loan(&f.borrower, &id, &PRINCIPAL, &1_200, &86_400),
        Err(Ok(Error::ReceiptLocked))
    );
    assert_eq!(
        f.client().try_fund(&f.borrower, &loan),
        Err(Ok(Error::InvalidAddress))
    );
    assert_eq!(
        f.client().try_cancel_request(&stranger, &loan),
        Err(Ok(Error::NotReceiptOwner))
    );
    assert_eq!(
        f.client().try_mark_default(&stranger, &loan),
        Err(Ok(Error::InvalidLoanStatus))
    );
    f.client().cancel_request(&f.borrower, &loan);
    assert_eq!(f.client().debt_of(&loan), 0);
}

#[test]
fn impaired_unfunded_request_can_only_cancel_and_never_create_debt() {
    let f = Fixture::new();
    let id = f.lot();
    let loan = f.request(id);
    f.registry()
        .impair(&f.verifier, &id, &ImpairmentReason::Fire, &f.hash());
    assert_eq!(
        f.client().try_fund(&f.lender, &loan),
        Err(Ok(Error::LotImpaired))
    );
    assert_eq!(
        f.client().try_mark_default(&f.borrower, &loan),
        Err(Ok(Error::InvalidLoanStatus))
    );
    f.client().cancel_request(&f.borrower, &loan);
    assert_eq!(f.client().debt_of(&loan), 0);
    assert_eq!(
        f.registry().get_lot(&id).physical_status,
        PhysicalStatus::Impaired
    );
}

#[test]
fn all_value_and_configuration_operations_reject_missing_auth() {
    let f = Fixture::new();
    let id = f.lot();
    let loan = f.request(id);
    macro_rules! denied {
        ($call:expr) => {
            assert!(matches!($call, Err(Err(_))));
        };
    }
    f.env.set_auths(&[]);
    denied!(f.client().try_set_paused(&f.admin, &true));
    denied!(f.client().try_set_params(&f.admin, &VaultParams::default()));
    denied!(f.client().try_cancel_request(&f.borrower, &loan));
    denied!(f.client().try_fund(&f.lender, &loan));
    f.env.mock_all_auths();
    f.client().fund(&f.lender, &loan);
    f.env.set_auths(&[]);
    denied!(f.client().try_repay(&f.borrower, &loan, &UNIT));
    denied!(f.client().try_mark_default(&f.borrower, &loan));
    denied!(f.client().try_claim_collateral(&f.lender, &loan));
    denied!(f
        .client()
        .try_partial_withdraw(&f.borrower, &loan, &1_000, &f.hash()));
    denied!(f
        .client()
        .try_request_loan(&f.borrower, &id, &PRINCIPAL, &1_200, &86_400));
    assert_eq!(f.client().debt_of(&loan), PRINCIPAL);
    assert_eq!(f.balance(&f.vault), 0);
}

#[test]
fn policy_bounds_admin_auth_and_missing_loans_are_explicit() {
    let f = Fixture::new();
    let stranger = Address::generate(&f.env);
    assert_eq!(
        f.client().try_set_paused(&stranger, &true),
        Err(Ok(Error::NotAuthorized))
    );
    let policy = VaultParams {
        max_ltv_bps: 8_001,
        ..VaultParams::default()
    };
    assert_eq!(
        f.client().try_set_params(&f.admin, &policy),
        Err(Ok(Error::ParamOutOfBounds))
    );
    let policy = VaultParams {
        valuation_max_age_secs: 3_599,
        ..VaultParams::default()
    };
    assert_eq!(
        f.client().try_set_params(&f.admin, &policy),
        Err(Ok(Error::ParamOutOfBounds))
    );
    assert_eq!(f.client().try_get_loan(&999), Err(Ok(Error::LoanNotFound)));
}

#[test]
fn risk_adjustments_reduce_capacity_and_event_wire_names_are_stable() {
    let f = Fixture::new();
    let id = f.lot();
    f.registry().record_inspection(
        &f.verifier,
        &id,
        &12_000,
        &690,
        &InspectionKind::MoistureDrift,
        &f.hash(),
    );
    assert_eq!(f.client().max_principal(&id), 5_400 * UNIT);
    f.registry().record_inspection(
        &f.verifier,
        &id,
        &12_000,
        &500,
        &InspectionKind::Passed,
        &f.hash(),
    );
    assert_eq!(f.client().max_principal(&id), 6_120 * UNIT);
    let loan = f.request(id);
    f.client().fund(&f.lender, &loan);
    let events = f.env.events().all().filter_by_contract(&f.vault);
    use soroban_sdk::events::Event;
    let value = f.client().get_loan(&loan);
    let expected = crate::events::LoanFunded {
        lot_id: id,
        loan_id: loan,
        loan: value,
        actor: f.lender.clone(),
        settlement_asset: f.asset.clone(),
        timestamp: START,
    };
    assert_eq!(
        events.events().last(),
        Some(&expected.to_xdr(&f.env, &f.vault))
    );
}
