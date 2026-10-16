extern crate std;

use crate::{Error, LoanStatus, Vault, VaultClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token, Address, BytesN, Env,
};
use yerbacapital_registry::{Commodity, LotStatus, Registry, RegistryClient, Role};

const DAY: u64 = 86_400;
const USDC: i128 = 10_000_000; // 1 USDC in stroops (7 decimals)

fn hash(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

struct Fixture {
    env: Env,
    registry: RegistryClient<'static>,
    vault: VaultClient<'static>,
    usdc: Address,
    admin: Address,
    borrower: Address,
    lender: Address,
    custodian: Address,
    verifier: Address,
    oracle: Address,
    now: u64,
}

fn setup() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();
    let now = 1_700_000_000;
    env.ledger().with_mut(|l| l.timestamp = now);

    let admin = Address::generate(&env);
    let borrower = Address::generate(&env);
    let lender = Address::generate(&env);
    let custodian = Address::generate(&env);
    let verifier = Address::generate(&env);
    let oracle = Address::generate(&env);

    let registry_id = env.register(Registry, ());
    let registry = RegistryClient::new(&env, &registry_id);
    registry.initialize(&admin);
    registry.grant_role(&custodian, &Role::Custodian);
    registry.grant_role(&verifier, &Role::Verifier);
    registry.grant_role(&oracle, &Role::PriceOracle);

    let usdc_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(usdc_admin);
    let usdc = sac.address();

    let vault_id = env.register(Vault, ());
    let vault = VaultClient::new(&env, &vault_id);
    vault.initialize(&admin, &usdc, &registry_id);
    registry.set_vault(&vault_id);

    Fixture {
        env,
        registry,
        vault,
        usdc,
        admin,
        borrower,
        lender,
        custodian,
        verifier,
        oracle,
        now,
    }
}

impl Fixture {
    fn fund_lender(&self, amount: i128) {
        soroban_sdk::token::StellarAssetClient::new(&self.env, &self.usdc)
            .mint(&self.lender, &amount);
    }

    fn mint(&self, who: &Address, amount: i128) {
        soroban_sdk::token::StellarAssetClient::new(&self.env, &self.usdc).mint(who, &amount);
    }

    fn balance(&self, who: &Address) -> i128 {
        token::Client::new(&self.env, &self.usdc).balance(who)
    }

    /// Registers a verified, receipted lot owned by `borrower` valued 1000 USDC.
    fn receipt_lot(&self, lot_id: u64) {
        self.registry.register_lot(
            &self.borrower,
            &lot_id,
            &Commodity::YerbaCanchada,
            &12_000,
            &self.custodian,
            &hash(&self.env, 1),
        );
        self.registry.verify_lot(
            &self.verifier,
            &self.custodian,
            &lot_id,
            &500,
            &12_000,
            &hash(&self.env, 2),
        );
        self.registry.issue_receipt(&self.verifier, &lot_id);
        self.registry
            .post_valuation(&self.oracle, &lot_id, &(1_000 * USDC));
    }
}

// valuation 1000 USDC, haircut 1500bps -> 850 USDC; LTV 6000bps -> 510 USDC max.
const MAX_PRINCIPAL: i128 = 510 * USDC;

#[test]
fn happy_path_request_fund_repay_unlocks_receipt() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.receipt_lot(1);

    let loan_id = f
        .vault
        .request_loan(&f.borrower, &1, &(500 * USDC), &1_000, &(f.now + 90 * DAY));
    assert_eq!(f.registry.lot_status(&1), LotStatus::Encumbered);

    let before = f.balance(&f.borrower);
    f.vault.fund_loan(&f.lender, &loan_id);
    assert_eq!(f.balance(&f.borrower), before + 500 * USDC);
    assert_eq!(f.balance(&f.lender), 500 * USDC);
    assert_eq!(f.vault.get_loan(&loan_id).status, LoanStatus::Funded);

    // Repay immediately: no interest accrued.
    f.vault.repay(&f.borrower, &loan_id, &(500 * USDC));
    assert_eq!(f.vault.get_loan(&loan_id).status, LoanStatus::Repaid);
    assert_eq!(f.registry.lot_status(&1), LotStatus::Receipted);
    assert_eq!(f.balance(&f.lender), 1_000 * USDC);
}

#[test]
fn request_rejects_principal_above_max() {
    let f = setup();
    f.receipt_lot(1);
    let res = f.vault.try_request_loan(
        &f.borrower,
        &1,
        &(MAX_PRINCIPAL + 1),
        &1_000,
        &(f.now + 90 * DAY),
    );
    assert_eq!(res, Err(Ok(Error::ExceedsMaxPrincipal)));
}

#[test]
fn request_boundary_at_max_succeeds() {
    let f = setup();
    f.receipt_lot(1);
    let loan_id =
        f.vault
            .request_loan(&f.borrower, &1, &MAX_PRINCIPAL, &1_000, &(f.now + 90 * DAY));
    assert_eq!(f.vault.get_loan(&loan_id).principal, MAX_PRINCIPAL);
}

#[test]
fn request_rejects_stale_valuation() {
    let f = setup();
    f.receipt_lot(1);
    f.env
        .ledger()
        .with_mut(|l| l.timestamp = f.now + 604_800 + 1);
    let res = f
        .vault
        .try_request_loan(&f.borrower, &1, &(100 * USDC), &1_000, &(f.now + 90 * DAY));
    assert_eq!(res, Err(Ok(Error::ValuationStale)));
}

#[test]
fn request_rejects_non_owner() {
    let f = setup();
    f.receipt_lot(1);
    let stranger = Address::generate(&f.env);
    let res = f
        .vault
        .try_request_loan(&stranger, &1, &(100 * USDC), &1_000, &(f.now + 90 * DAY));
    assert_eq!(res, Err(Ok(Error::NotAuthorized)));
}

#[test]
fn request_rejects_second_active_loan_for_same_lot() {
    let f = setup();
    f.receipt_lot(1);
    f.vault
        .request_loan(&f.borrower, &1, &(100 * USDC), &1_000, &(f.now + 90 * DAY));
    let res = f
        .vault
        .try_request_loan(&f.borrower, &1, &(100 * USDC), &1_000, &(f.now + 90 * DAY));
    assert_eq!(res, Err(Ok(Error::ActiveLoanExists)));
}

#[test]
fn request_rejects_rate_above_max() {
    let f = setup();
    f.receipt_lot(1);
    let res = f
        .vault
        .try_request_loan(&f.borrower, &1, &(100 * USDC), &3_001, &(f.now + 90 * DAY));
    assert_eq!(res, Err(Ok(Error::ParamOutOfBounds)));
}

#[test]
fn request_rejects_maturity_in_past() {
    let f = setup();
    f.receipt_lot(1);
    let res = f
        .vault
        .try_request_loan(&f.borrower, &1, &(100 * USDC), &1_000, &(f.now - 1));
    assert_eq!(res, Err(Ok(Error::ParamOutOfBounds)));
}

#[test]
fn fund_only_once() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.receipt_lot(1);
    let loan_id = f
        .vault
        .request_loan(&f.borrower, &1, &(100 * USDC), &1_000, &(f.now + 90 * DAY));
    f.vault.fund_loan(&f.lender, &loan_id);
    let res = f.vault.try_fund_loan(&f.lender, &loan_id);
    assert_eq!(res, Err(Ok(Error::AlreadyFunded)));
}

#[test]
fn interest_accrues_and_rounds_up() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.mint(&f.borrower, 1_000 * USDC);
    f.receipt_lot(1);
    let loan_id =
        f.vault
            .request_loan(&f.borrower, &1, &(500 * USDC), &1_000, &(f.now + 365 * DAY));
    f.vault.fund_loan(&f.lender, &loan_id);

    // One full year at 10% -> interest = 50 USDC, owed = 550.
    f.env
        .ledger()
        .with_mut(|l| l.timestamp = f.now + 31_536_000);
    f.vault.repay(&f.borrower, &loan_id, &(550 * USDC));
    assert_eq!(f.vault.get_loan(&loan_id).status, LoanStatus::Repaid);
}

#[test]
fn partial_repay_then_final_repay() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.receipt_lot(1);
    let loan_id = f
        .vault
        .request_loan(&f.borrower, &1, &(500 * USDC), &1_000, &(f.now + 90 * DAY));
    f.vault.fund_loan(&f.lender, &loan_id);

    f.vault.repay(&f.borrower, &loan_id, &(200 * USDC));
    let loan = f.vault.get_loan(&loan_id);
    assert_eq!(loan.status, LoanStatus::Funded);
    assert_eq!(loan.outstanding, 300 * USDC);

    f.vault.repay(&f.borrower, &loan_id, &(300 * USDC));
    assert_eq!(f.vault.get_loan(&loan_id).status, LoanStatus::Repaid);
    assert_eq!(f.registry.lot_status(&1), LotStatus::Receipted);
}

#[test]
fn repay_more_than_owed_fails() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.receipt_lot(1);
    let loan_id = f
        .vault
        .request_loan(&f.borrower, &1, &(500 * USDC), &1_000, &(f.now + 90 * DAY));
    f.vault.fund_loan(&f.lender, &loan_id);
    let res = f.vault.try_repay(&f.borrower, &loan_id, &(500 * USDC + 1));
    assert_eq!(res, Err(Ok(Error::AmountInvalid)));
}

#[test]
fn default_before_maturity_fails() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.receipt_lot(1);
    let loan_id = f
        .vault
        .request_loan(&f.borrower, &1, &(500 * USDC), &1_000, &(f.now + 90 * DAY));
    f.vault.fund_loan(&f.lender, &loan_id);
    let res = f.vault.try_mark_default(&f.lender, &loan_id);
    assert_eq!(res, Err(Ok(Error::NotMatured)));
}

#[test]
fn matured_default_transfers_receipt_to_lender_on_claim() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.receipt_lot(1);
    let loan_id = f
        .vault
        .request_loan(&f.borrower, &1, &(500 * USDC), &1_000, &(f.now + 90 * DAY));
    f.vault.fund_loan(&f.lender, &loan_id);

    f.env.ledger().with_mut(|l| l.timestamp = f.now + 90 * DAY);
    f.vault.mark_default(&f.lender, &loan_id);
    assert_eq!(f.vault.get_loan(&loan_id).status, LoanStatus::Defaulted);

    f.vault.claim_collateral(&f.lender, &loan_id);
    let lot = f.registry.get_lot(&1);
    assert_eq!(lot.owner, f.lender);
    assert_eq!(lot.status, LotStatus::Receipted);
}

#[test]
fn claim_only_by_lender() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.receipt_lot(1);
    let loan_id = f
        .vault
        .request_loan(&f.borrower, &1, &(500 * USDC), &1_000, &(f.now + 90 * DAY));
    f.vault.fund_loan(&f.lender, &loan_id);
    f.env.ledger().with_mut(|l| l.timestamp = f.now + 90 * DAY);
    f.vault.mark_default(&f.lender, &loan_id);

    let stranger = Address::generate(&f.env);
    let res = f.vault.try_claim_collateral(&stranger, &loan_id);
    assert_eq!(res, Err(Ok(Error::NotAuthorized)));
}

#[test]
fn impairment_allows_early_default() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.receipt_lot(1);
    let loan_id = f
        .vault
        .request_loan(&f.borrower, &1, &(500 * USDC), &1_000, &(f.now + 90 * DAY));
    f.vault.fund_loan(&f.lender, &loan_id);

    // Impaired collateral permits default before maturity.
    f.registry.impair(&f.verifier, &1);
    f.vault.mark_default(&f.lender, &loan_id);
    assert_eq!(f.vault.get_loan(&loan_id).status, LoanStatus::Defaulted);
}

#[test]
fn withdrawal_that_breaks_ltv_is_blocked() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.receipt_lot(1);
    // Borrow close to the max so any reduction breaks coverage.
    let loan_id = f
        .vault
        .request_loan(&f.borrower, &1, &(500 * USDC), &1_000, &(f.now + 90 * DAY));
    f.vault.fund_loan(&f.lender, &loan_id);

    let res =
        f.registry
            .try_partial_withdraw(&f.custodian, &f.borrower, &1, &6_000, &hash(&f.env, 4));
    assert_eq!(
        res,
        Err(Ok(yerbacapital_registry::Error::WithdrawalBreaksLtv))
    );
}

#[test]
fn withdrawal_within_ltv_is_allowed() {
    let f = setup();
    f.fund_lender(1_000 * USDC);
    f.receipt_lot(1);
    let loan_id = f
        .vault
        .request_loan(&f.borrower, &1, &(100 * USDC), &1_000, &(f.now + 90 * DAY));
    f.vault.fund_loan(&f.lender, &loan_id);

    // Small reduction keeps remaining collateral above the debt.
    f.registry
        .partial_withdraw(&f.custodian, &f.borrower, &1, &1_000, &hash(&f.env, 4));
    assert_eq!(f.registry.get_lot(&1).net_kg, 11_000);
}

#[test]
fn initialize_twice_fails() {
    let f = setup();
    let res = f.vault.try_initialize(&f.admin, &f.usdc, &f.vault.address);
    assert_eq!(res, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn set_config_rejects_out_of_bounds() {
    let f = setup();
    let bad = crate::Config {
        usdc: f.usdc.clone(),
        registry: f.registry.address.clone(),
        max_ltv_bps: 9_001,
        base_haircut_bps: 1_500,
        valuation_max_age_secs: 604_800,
        max_rate_bps: 3_000,
        grace_secs: 0,
    };
    let res = f.vault.try_set_config(&bad);
    assert_eq!(res, Err(Ok(Error::ParamOutOfBounds)));
}

#[test]
fn unknown_loan_lookup_fails() {
    let f = setup();
    let res = f.vault.try_get_loan(&99);
    assert_eq!(res, Err(Ok(Error::LoanNotFound)));
}
