# ADR-006: Minimal executable bootstrap

Status: Accepted for the initial scaffold.

## Context

The repository starts with an operating manual and no implementation. The first commit should be small and reviewable without inventing a partial financial protocol.

## Decision

Normalize the manual to AGENTS.md, mirror the contract specification, and implement only a local TypeScript evidence integrity CLI with tests and CI. Use a pnpm workspace and Node.js 22 baseline. Defer Rust manifests, generated clients and web scaffolding until their actual implementation tasks; do not add misleading empty contracts or deployment scripts.

## Consequences

This is an executable foundation, not the hackathon MVP. The full definition of done and Testnet acceptance script remain outstanding. No deployed ABI changes, bindings or transaction evidence exist yet. Evidence hashing does not establish the truth of physical claims.
