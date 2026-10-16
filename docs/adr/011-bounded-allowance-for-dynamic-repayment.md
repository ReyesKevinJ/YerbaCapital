# ADR-011: Bounded SAC allowance for ledger-time repayment

Status: Accepted as a correctness fix after Testnet verification.

## Context

The first Testnet full repayment failed authorization. The SAC transfer amount was capped at current debt, but ledger-time interest changed that amount between simulation and execution. Soroban authorization includes the nested transfer arguments. Native same-timestamp tests did not expose this difference. Failed transaction: `4209bfe6165912d2ec20ee1ff0b673771585fd17cd44c509ee1cf9d36a6198dc`.

## Decision

Keep `payer.require_auth()` and the explicit maximum amount in every repayment. Before repayment, the payer grants the configured vault a finite, amount-limited SAC allowance in a separate explicitly signed operation. Vault uses SAC `transfer_from` as spender, transferring only the minimum of the caller's maximum and actual ledger-time debt directly from payer to lender. Funding continues to use direct lender-authorized transfer.

The spender is the immutable vault; the asset is the immutable settlement SAC. No admin withdrawal, generic spending entrypoint or escrow is added. The vault may spend an allowance only through an authenticated repayment of an eligible loan. An unused allowance expires or can be revoked by its owner. The demo client proposes 100 ledgers of validity and the user reviews the exact cap before signing.

## Consequences

The authorized payer root arguments remain stable across ledgers; the variable SAC transfer is authorized by the vault as spender. Repayment still uses current ledger time, interest first, bounded collection and atomic rollback. Users sign allowance and repayment separately; rejecting repayment leaves the allowance until revocation/expiration. The UI must expose this and offer revocation. Test coverage must advance time while replaying an exact payer authorization with no dynamic SAC child authorization.

This refines the settlement mechanism in ADR-003 and ADR-010 without changing pass-through custody or introducing another trusted actor. The first immutable deployment is retained only as failed-test evidence; the corrected demo uses a new deployment and fresh lots.
