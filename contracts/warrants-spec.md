# Warrants & Physical Oracle Specification — YerbaCapital

## 1. Scope & Objective
This document details the on-chain operational specification for **YerbaCapital**'s warehouse receipt (warrant) registry and lending vault contracts, complying with `AGENTS.md` (ADR-001, ADR-002, and §7).

The protocol guarantees that:
1. Physical goods (*yerba mate canchada*) enter the financial system exclusively through authenticated, multi-party physical attestations.
2. Warehouse receipts are non-fungible on-chain records bound to physical inventory lots.
3. Credit expansion against agricultural inventory enforces conservative risk margins (LTV + haircut) and automatic oracular impairment.

---

## 2. Role Matrix & Separation of Duties

| Role | Cardinality per Lot | Permissions |
|---|---|---|
| `Admin` | 1 protocol-wide | Grant/revoke roles, update global bounded parameters (§7.5). Zero access to user assets or lot encumbrance. |
| `Borrower` | 1 per lot | Register lot, request loan, execute partial or full repayment. |
| `Custodian` | 1 per lot | Co-sign initial lot deposit verification; co-sign physical withdrawals. |
| `Verifier` | 1 per lot | Execute physical inspection, attest moisture/weight, issue receipt, declare lot impairment. |
| `PriceOracle` | Independent | Post valuation denominated in USDC stroops ($10^{-7}$) with timestamp. |
| `Lender` | 1 per loan | Fund loan via USDC transfer, claim receipt title upon unmitigated default. |

*Safety Invariant:* For any given lot:
$$\text{custodian} \neq \text{verifier} \neq \text{borrower}$$

---

## 3. Data Dictionary (`contracts/registry`)

### 3.1 Status Enums
```rust
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum LotStatus {
    Registered = 0,
    Verified = 1,
    Rejected = 2,
    Receipted = 3,
    Encumbered = 4,
    Impaired = 5,
    Closed = 6,
}