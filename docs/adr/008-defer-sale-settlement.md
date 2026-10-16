# ADR-008: Defer sale with outstanding debt from the first demo

Status: Accepted for the first Testnet demo.

## Context

Architecture proposal A described non-atomic buyer repayment followed by receipt transfer and physical delivery. It exposes the buyer to seller non-performance and has no agreed legal settlement arrangement. ADR-003 excludes escrow. The user approved the recommended sequence, which defers this flow.

## Decision

Do not implement sale settlement or sale confirmation in the first demo. Reserve SaleConfirmed for future specification without emitting it. Keep the documented architecture scenario as a future design, explicitly outside current acceptance. Ordinary free receipt transfer remains a registry capability, not a secondary market.

## Consequences

The ten-step demo remains achievable without adding a settlement guarantee or escrow. A later sale flow needs its own approval, contract specification and legal/product treatment. No previously accepted financing or pass-through decision changes.
