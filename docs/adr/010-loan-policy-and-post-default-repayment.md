# ADR-010: Snapshot financial policy and allow repayment until collateral claim

Status: Accepted for implementation.

## Context

The initial specification left parameter timing, grace, overpayment, post-default payment and residual accounting incomplete. These rules must be deterministic before value-moving code is written. They do not introduce a new trusted actor or pooled custody.

## Decision

Snapshot financial policy at request; keep rate and duration immutable. Registry quality observations and current role eligibility remain authoritative. Pause only requests and funding. Accrue simple interest over disjoint ledger-time intervals, round capacity down and interval interest up, apply payments to interest before principal, and cap transfers at actual debt.

A payer may repay before collateral is claimed, including after default. A partial post-default repayment preserves default; full repayment closes the loan and unlocks the receipt. Claim freezes exposure for audit and ends on-chain collection. No further repayment or claim is accepted after Liquidated. Frozen exposure is not money recovered or a determination of legal residual rights.

## Consequences

Admin cannot rewrite existing loan economics or use pause to block repayment. The state machine adds Defaulted to Repaid. The specification closes exact defaults, limits and grace behavior. Legal recovery and any later settlement mechanism remain outside the prototype.
