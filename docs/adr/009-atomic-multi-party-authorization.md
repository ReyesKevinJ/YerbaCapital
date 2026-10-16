# ADR-009: Atomic multi-party authorization and vault-coordinated pledged withdrawals

Status: Accepted for implementation.

## Context

Deposit verification and withdrawal require multiple parties. Two-stage approvals introduce partially accepted custody assertions. A registry-to-vault-to-registry withdrawal cycle complicates authorization and creates a contract re-entry dependency.

## Decision

Collect authorizations for a single Soroban invocation. Deposit verification requires verifier and custodian over the same operation and evidence. Free withdrawals enter registry; pledged withdrawals enter vault, which evaluates current debt and remaining capacity before instructing registry. Registry never calls back into vault. Vault binds itself once during construction, with admin authorization, before any lot exists.

## Consequences

There is no intermediate verified state from one signature or reusable financial approval. Integration must support collecting multiple auth entries. The architecture sequence is updated to show vault coordination; exact ABI is defined in contract-spec.md.
