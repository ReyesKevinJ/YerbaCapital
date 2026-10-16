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
