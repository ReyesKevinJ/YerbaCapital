# ADR-007: Preserve physical impairment independently of receipt state

Status: Accepted for the first Testnet demo.

## Context

The combined status in the initial specification could lose an active encumbrance on impairment or appear to repair goods when a lender claims the receipt. The architecture identified this as proposal B. The user approved proceeding with the recommended sequence and separation.

## Decision

Model physical status, receipt status and linked loan independently. Impairment preserves ownership and encumbrance. Repayment releases the encumbrance without repairing goods; default claim changes ownership and ends that loan's encumbrance without clearing impairment. No rehabilitation is implemented in the first demo.

## Consequences

Registry and vault can complete the impairment/default demo without making a physical claim from a financial transition. The initial contract data design changes before first deployment; clients will be generated from the resulting Rust definitions.
