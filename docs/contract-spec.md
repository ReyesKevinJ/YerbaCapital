# Contract specification

Status: design only; no deployed ABI. Source: AGENTS.md §7.

## 7. Smart contract specification

> Mirror of `docs/contract-spec.md`. If they disagree, open an issue; do not guess.

### 7.1 Contracts

| Contract | Purpose | Calls |
|---|---|---|
| `registry` | Roles, lots, receipts (non-fungible, one per lot), attestations, encumbrance | — |
| `vault` | Loans against receipts, USDC escrow | `registry.lock / unlock / transfer_on_default`, `usdc.transfer` |

The receipt is modeled as a **non-fungible record inside `registry`** (owner per `lot_id`), not as a fungible SEP-41 token. See ADR-001 in §13.

### 7.2 Roles

| Role | Granted by | Can |
|---|---|---|
| `Admin` | Constructor | Grant/revoke roles, set bounded parameters, pause new loans. **Cannot** move receipts or funds. |
| `Custodian` | Admin | Co-sign deposit, partial withdrawal, final release of physical goods |
| `Verifier` | Admin | Attest verification, inspection, impairment, sale confirmation |
| `PriceOracle` | Admin | Post valuation for a lot |
| `Borrower` | Self (any address) | Register lots, request loans, repay |
| `Lender` | Self (any address) | Fund loans, claim on default |
| `Observer` | — | Read only |

Constraint: for a given lot, `custodian != verifier != borrower`. Enforce in code.

### 7.3 Lot state machine (physical + receipt)

```text
Registered ──verify──► Verified ──issue_receipt──► Receipted ──lock──► Encumbered
     │                    │                            │  ▲              │   │
     └──reject──► Rejected└──reject──► Rejected        │  └──unlock─────┘   │
                                                       │                    │
                         impair (verifier) ◄───────────┴────────────────────┘
                              │
                              ▼
                          Impaired ──(re)verify──► Receipted/Encumbered
Receipted ──withdraw_full (custodian+owner)──► Closed
Encumbered ──transfer_on_default (vault only)──► Receipted (owner = lender)
```

| Transition | Caller(s) requiring `require_auth` | Preconditions |
|---|---|---|
| `register_lot` | borrower | commodity supported; net_kg > 0; custodian has role |
| `verify_lot` | verifier **and** custodian | status `Registered`; moisture and kg within config bands; evidence hash non-zero |
| `reject_lot` | verifier | status `Registered`/`Verified` |
| `issue_receipt` | verifier | status `Verified`; owner = borrower |
| `post_valuation` | price_oracle | status ∈ {Receipted, Encumbered} |
| `transfer_receipt` | owner | status `Receipted` (not encumbered) |
| `lock` / `unlock` | vault contract only | status `Receipted` / `Encumbered` |
| `record_inspection` | verifier | any active status; may update moisture/kg |
| `impair` | verifier | sets `Impaired`; vault reads this to block funding and allow early default |
| `partial_withdraw` | custodian **and** owner (and vault if encumbered) | remaining collateral keeps loan within max LTV |
| `confirm_sale` | verifier | records buyer reference hash; enables settlement |
| `withdraw_full` | custodian **and** owner | not encumbered |

### 7.4 Loan state machine

```text
Requested ──fund──► Funded ──repay(partial)──► PartiallyRepaid ──repay(rest)──► Repaid
    │                 │                               │
    └─cancel─► Cancelled  └──────── maturity passed or lot Impaired ──► Defaulted ──claim──► Liquidated
```

| Function | Caller | Effects |
|---|---|---|
| `request_loan(lot_id, principal, rate_bps, duration_secs)` | borrower (receipt owner) | Checks `principal ≤ max_principal(lot)`; calls `registry.lock` |
| `cancel_request(loan_id)` | borrower | Only `Requested`; unlocks receipt |
| `fund(loan_id)` | lender | Valuation not stale, lot not impaired; transfers USDC lender → borrower; sets `funded_at`, `maturity` |
| `repay(loan_id, amount)` | borrower (any payer allowed, must auth) | USDC payer → lender; interest first, then principal; if fully repaid → `Repaid` + `registry.unlock` |
| `mark_default(loan_id)` | anyone | `now > maturity` and debt > 0, **or** lot `Impaired` |
| `claim_collateral(loan_id)` | lender | Only `Defaulted`; calls `registry.transfer_on_default` → lender owns receipt; `Liquidated` |
| `debt_of(loan_id)` | read | principal_outstanding + accrued_interest at current ledger time |
| `max_principal(lot_id)` | read | See §8.4.5 |

### 7.5 Parameters (config, bounded in code)

| Parameter | Default (demo) | Hard bound in code |
|---|---|---|
| `max_ltv_bps` | 6000 (60%) | ≤ 8000 |
| `base_haircut_bps` | 1500 (15%) | ≤ 5000 |
| `valuation_max_age_secs` | 604800 (7 days) | ≥ 3600 |
| `moisture_min_bps` / `moisture_max_bps` | 300 / 700 (3%–7%) | 0–2000 |
| `min_lot_kg` | 1000 | ≥ 1 |
| `max_rate_bps` (annual) | 3000 | ≤ 10000 |
| `grace_period_secs` | 0 | ≤ 30 days |

### 7.6 Events (stable API)

`LotRegistered`, `LotVerified`, `LotRejected`, `ReceiptIssued`, `ReceiptTransferred`, `ValuationPosted`, `InspectionRecorded`, `LotImpaired`, `PartialWithdrawal`, `SaleConfirmed`, `LotClosed`, `CollateralLocked`, `CollateralUnlocked`, `LoanRequested`, `LoanCancelled`, `LoanFunded`, `LoanRepaid` (with `amount`, `interest_part`, `principal_part`), `LoanDefaulted`, `CollateralClaimed`, `RoleGranted`, `RoleRevoked`, `ParamsUpdated`.

Topics: first topic is the event name (generated by `#[contractevent]`), then `lot_id` and/or `loan_id`. Data carries the rest.

### 7.7 Errors (stable codes; append only)

| Code | Name | Code | Name |
|---|---|---|---|
| 1 | `AlreadyInitialized` | 13 | `ValuationStale` |
| 2 | `NotAuthorized` | 14 | `ExceedsMaxPrincipal` |
| 3 | `RoleMissing` | 15 | `LoanNotFound` |
| 4 | `RoleConflict` | 16 | `InvalidLoanStatus` |
| 5 | `LotNotFound` | 17 | `NotMatured` |
| 6 | `InvalidLotStatus` | 18 | `AmountInvalid` |
| 7 | `MoistureOutOfBand` | 19 | `MathOverflow` |
| 8 | `WeightInvalid` | 20 | `ParamOutOfBounds` |
| 9 | `EvidenceMissing` | 21 | `Paused` |
| 10 | `ReceiptLocked` | 22 | `WithdrawalBreaksLtv` |
| 11 | `NotReceiptOwner` | 23 | `OnlyVault` |
| 12 | `LotImpaired` | 24 | `UnsupportedCommodity` |
