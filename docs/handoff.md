# Bootstrap task handoffs

Tasks were performed sequentially by persona; no app–contract interface was implemented.

### Handoff
- Persona: Architect
- Changed: AGENTS.md (normalized filename and ADR index), docs/architecture.md, docs/contract-spec.md, docs/adr/006-bootstrap-scope.md
- ABI change: no
- Tests: specification mirrored from AGENTS.md §7; no executable contract
- Evidence: none
- Next owner: Contract Engineer — implement registry first with role and authorization tests
- Open questions: user responsibility within the team remains to be assigned

### Handoff
- Persona: Oracle Engineer
- Changed: svc/**; supporting workspace manifests, lint and TypeScript configuration
- ABI change: no
- Tests: pnpm typecheck, pnpm lint, pnpm test (see validation below)
- Evidence: synthetic local fixtures only
- Next owner: Oracle Engineer — design authenticated evidence storage before HTTP intake
- Open questions: storage and access-control strategy for the future service

### Handoff
- Persona: DevOps / Release Engineer
- Changed: .github/workflows/ci.yml, .env.example, .gitignore, docs/evidence.md
- ABI change: no
- Tests: local workspace checks; hosted CI pending first push
- Evidence: none
- Next owner: DevOps / Release Engineer — add Rust checks when contracts exist
- Open questions: none

### Handoff
- Persona: Docs & Pitch
- Changed: README.md, docs/handoff.md
- ABI change: no
- Tests: setup commands validated locally (see validation below)
- Evidence: none
- Next owner: App Engineer — agree first UI slice after user ownership clarification
- Open questions: which subsystem the user will own

## Local validation

- `pnpm install --frozen-lockfile`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed; file integrity and CLI exit-status tests.
- `pnpm build`: passed (also executed by the test script).
- Runtime: Node.js 22.2.0, pnpm 8.10.2.
- Hosted GitHub Actions and Testnet flows have not run.

## Executable architecture foundation — 2026-10-16

Scope: local off-chain foundation, following the architecture document. No financial ABI, contract deployment, wallet signing or event projection was introduced. Persona tasks below were executed sequentially.

### Handoff
- Persona: Oracle Engineer
- Changed: svc/src/config/**, svc/src/http/**, svc/src/storage/**, svc/src/server.ts, svc/package.json, svc/test/service.test.ts
- ABI change: no
- Tests: configuration guards, concurrent storage, integrity detection and real HTTP upload/download, auth and size limits; workspace tests pass
- Evidence: synthetic local files only; no on-chain attestation
- Next owner: Oracle Engineer — define evidence manifests and document access policies; implement the indexer after the contract event interface is stable
- Open questions: private evidence authorization beyond the developer loopback environment; retention and archival history

### Handoff
- Persona: Integration Engineer
- Changed: app/src/lib/stellar/network.ts
- ABI change: no; generated clients do not exist and were not replaced with handwritten interfaces
- Tests: Testnet-only configuration and rejection of attempts to enable absent contract integration
- Evidence: local configuration checks only; no RPC connectivity or contract invocation verified
- Next owner: Integration Engineer — generate clients from the implemented contracts and add the shared transaction lifecycle after specification/deployment
- Open questions: final contract interface, IDs and treatment of impairment with encumbrance

### Handoff
- Persona: App Engineer
- Changed: app/** except app/src/lib/stellar/**; app workspace setup and test dependencies
- ABI change: no
- Tests: 4 app integration/configuration tests; 4 Playwright tests across desktop/mobile, including a real evidence round trip, keyboard access, horizontal overflow and recovery from a simulated upload failure
- Evidence: local screenshots under app/test-results/ (ignored); these are not Testnet evidence
- Next owner: App Engineer — implement role tasks and Freighter after generated clients and multi-party authorization are available
- Open questions: product acceptance criteria for role tasks; no real-user usability evaluation was performed

### Handoff
- Persona: DevOps / Release Engineer
- Changed: scripts/setup-local.mjs, scripts/run-app.mjs, .env.example, .gitignore, .github/workflows/ci.yml; supporting root scripts, workspace and lockfile
- ABI change: no
- Tests: frozen installation, typecheck, lint, unit/integration tests, build and Chrome desktop/mobile tests passed locally; hosted GitHub Actions not yet run
- Evidence: root .env generated privately and ignored; no credential printed or committed
- Next owner: DevOps / Release Engineer — provision Rust/Stellar checks and release steps when contract implementation begins
- Open questions: none for this local slice; CI browser installation still needs the first hosted run

### Handoff
- Persona: Architect
- Changed: docs/architecture.md, current implementation-status statement only in this code task; the preceding full architecture remains the target design
- ABI change: no
- Tests: implementation responsibilities reviewed against component boundaries; no contract specification modified
- Evidence: no on-chain state or transfers created
- Next owner: Contract Engineer — reconcile docs/contract-spec.md from architecture §17, then implement registry/vault in separate tasks
- Open questions: architecture §19 proposals remain unaccepted; no sale or impairment settlement implementation inferred

### Handoff
- Persona: Docs & Pitch
- Changed: README.md, docs/handoff.md
- ABI change: no
- Tests: setup/start commands and local browser flow verified; current scope and limitations documented
- Evidence: local verification only
- Next owner: Docs & Pitch — document the full demo once Testnet operations exist
- Open questions: no claim of completed MVP, production readiness, regulatory compliance or financial behavior

## Contract implementation — 2026-10-16

### Handoff
- Persona: Contract Engineer
- Changed: contracts/registry/**, contracts/vault/**, Cargo.toml, Cargo.lock, rust-toolchain.toml
- ABI change: yes — first executable ABI 0.2.0 from docs/contract-spec.md; all registry/vault operations, independent physical/receipt states, loan policy snapshot, explicit business events and stable errors 1–28. LoanDefaulted carries by_impairment to distinguish the business cause.
- Tests: cargo test --workspace --locked → 34 passed; cargo clippy --workspace --all-targets --locked -- -D warnings → passed; stellar contract build for registry and vault → passed; snapshots reviewed as synthetic state.
- Evidence: native execution with real registry Wasm and SAC test harness; not yet a Testnet/Freighter acceptance run.
- Next owner: DevOps / Release Engineer — run committed Testnet deployment; Integration Engineer — generate clients from deployed ABI.
- Open questions: wallet multi-party authorization and event projection remain integration work; sale with debt is excluded by ADR-008.

### Security checklist (AGENTS.md §8.6)
- Mutations authenticate actors before exercising capabilities; role-gated operations also check current roles. Missing-auth tests cover both contracts.
- Admin only configures roles, bounded policy and pause; it has no funds/collateral rescue entrypoint. Contract-only lock, unlock and default transfer authenticate the immutable vault.
- Ownership and a single linked loan prevent double pledging on this registry; physical double pledging elsewhere remains a custody/legal risk.
- Funding is once only, with current physical eligibility/fresh valuation and snapshotted financial policy; failed SAC transfers revert state and balances.
- Default requires expired maturity+grace or attested impairment; claim is lender-only, once, and freezes exposure. Repayment after claim is rejected.
- Checked integer arithmetic; floor capacity, ceil simple interest, interest-first bounded repayment. No truncating financial casts.
- Parameters are bounded; existing loan financial policies do not change. Error numbers are stable and events have explicit PascalCase business topics.
- Contract storage/events have addresses, quantities, enums and hashes, no PII/URI/free text. Persistent writes renew TTL; read paths also touch relevant entries.
- Tests exercise authorization, invalid states, edge values, time travel, exact event content, mass balance and real SAC balances. Local secrets and artifacts remain ignored.

### Handoff
- Persona: DevOps / Release Engineer
- Changed: scripts/check-contracts.sh, scripts/install-stellar-ci.sh, scripts/deploy.sh, scripts/deploy-testnet.py, .github/workflows/ci.yml, .gitignore
- ABI change: no
- Tests: local contract checks passed; deployment script syntax checked. CI pins CLI 28.1.0 with official release SHA-256 and Rust 1.92.0.
- Evidence: deployment pending; docs/evidence.md is populated only with RPC-confirmed transactions.
- Next owner: DevOps / Release Engineer — execute deployment from clean committed source and verify hosted CI.
- Open questions: Testnet resets require renewed demo identities/state; no mainnet path is provided.
