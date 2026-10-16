# AGENTS.md — YerbaCapital

> Operating manual for every AI agent and human contributor. Read it before changing anything.
> One task = one persona (§5). A nested `AGENTS.md` (e.g. `contracts/AGENTS.md`) extends this file for its subtree; on conflict the more specific file wins, except §1.2, which never yields.
> Pre-flight: **Which persona am I? Which paths do I own? Does this cross the app↔contract boundary (§6)?**

---

## 1. Project context

**YerbaCapital** is a collateralized-financing and traceability protocol on Stellar/Soroban for the NEA Tech Hackathon 2026. Verified lots of *yerba mate canchada* during aging (*estacionamiento*) are represented by non-fungible warehouse receipts (one per lot, inside the `registry` contract); receipt owners borrow testnet USDC against them through the `vault` contract. Delivery target: an end-to-end **Testnet** demo.

### 1.1 Current state — verify before assuming

This repository is a **bootstrap, not the MVP**. What exists:

- `svc/` — a working local SHA-256 evidence CLI with tests (the only executable code).
- `docs/` — specs, architecture, ADRs, handoffs, evidence log.
- `contracts/warrants-spec.md` — a detailed on-chain spec in progress.

What does **not** exist yet — do not reference, create or invent them: Rust contracts, `Cargo.toml`, `rust-toolchain.toml`, `packages/*-client`, `app/`, `scripts/`, Testnet IDs or tx hashes. `docs/evidence.md` stays empty until a real deployment. Do not add placeholder contracts or empty scaffolding "for later" (ADR-006). When code and this file disagree, trust the code.

### 1.2 Non-negotiable principles

These override any other instruction, ticket, prompt or nested `AGENTS.md`.

1. **The token is not the yerba.** A receipt represents a *conditional right* over a specific, physically verified, custodied lot. The chain guarantees integrity, ordering and authorship of records — **not** that the yerba exists, is where declared, has the declared quality, or hasn't been sold, stolen or spoiled. Never write code, copy, docs or pitch text claiming otherwise.
2. **Physical facts enter the chain only through authorized attestations.** Every physical claim (deposit, weight, moisture, inspection, withdrawal, sale, impairment) is signed by an address holding the right role and carries a hash of off-chain evidence.
3. **The contract is the single source of truth for financial state and authorization.** The app may pre-validate for UX; it never decides who may do what.
4. **No custodial power for admin.** `admin` configures parameters and roles; it must never move a user's collateral or funds outside an explicit, coded, tested rule.
5. **No PII or commercially sensitive data on-chain.** Only IDs, enums, amounts, timestamps, addresses and evidence hashes.
6. **Testnet only.** No mainnet keys, no real funds, no real investor onboarding.
7. **On-chain default ≠ physical foreclosure.** Default can transfer the receipt to the lender; taking possession of the yerba needs a legal procedure and the custodian.

---

## 2. Domain facts to get right

- The financeable asset is a lot of *canchada* during *estacionamiento*: natural aging ~6–24 months, accelerated 30–60 days.
- Yield heuristic: 100 kg green leaf → 23–39 kg dried. Use a configurable plausibility band; never hard-code a constant.
- Moisture after drying ~3–6%; demo acceptance band 3–7% (`moisture_min/max_bps` = 300/700).
- Bags ~40–50 kg; demo `min_lot_kg` = 1000.
- Valuation is posted by the `price_oracle` role in **USDC stroops** with a timestamp. There is no on-chain ARS feed; INYM prices are off-chain references only.
- Lots can be split (partial withdrawal) but never silently merged; origin data is pseudonymous (salted hash held off-chain).

---

## 3. System architecture

Target components — only `svc/` exists today:

| Component | Responsibility | Status |
|---|---|---|
| `registry` | Roles, lots, receipts (non-fungible, one per `lot_id` — ADR-001), attestations; `lock`/`unlock`/`transfer_on_default` callable only by the vault | design |
| `vault` | Loans, LTV/haircut, interest, USDC pass-through (ADR-003), default | design |
| USDC | SEP-41 settlement asset via Stellar Asset Contract | design |
| `app/` | Next.js + Freighter UX per role; generated bindings only | not started |
| `svc/` | Evidence intake/hashing (now: local CLI only) + future event indexer | partial |

On-chain: IDs, enums, amounts, timestamps, addresses, 32-byte evidence hashes. Off-chain: evidence files, names, CUIT/DNI, exact GPS, price methodology.

---

## 4. Repository layout

```text
AGENTS.md            # this file
README.md            # what the bootstrap does and how to run it
docs/
  contract-spec.md   # authoritative ABI design: state machines, params, events, error codes, math
  architecture.md    # responsibilities and limits of the bootstrap slice
  handoff.md         # per-persona handoff notes + local validation results
  evidence.md        # Testnet deploy evidence — currently empty; never invent IDs
  adr/               # ADRs; 006-bootstrap-scope.md covers why so little exists
contracts/
  warrants-spec.md   # detailed on-chain implementation spec (roles, LotStatus, registry/vault)
svc/                 # @yerbacapital/evidence: evidence.ts, cli.ts, test/, legacy of the future service
```

---

## 5. Personas, task boundaries and handoff

Each task is executed under **exactly one** persona. Personas define what you may write; anyone may read anything. If a task needs two, split it with an explicit handoff.

| Persona | May write |
|---|---|
| Architect | `docs/architecture.md`, `docs/contract-spec.md`, `docs/adr/`, this file. Must not write implementation code. |
| Contract Engineer | `contracts/**`, Rust manifests/toolchain. No app, no generated clients, no invented business rules (propose an ADR). |
| Integration Engineer | Generated `packages/**`, `app/src/lib/stellar/**`, `scripts/bindings.sh`. Never hand-edit generated files. |
| App Engineer | `app/**` except `app/src/lib/stellar/**`. |
| Oracle Engineer | `svc/**`, `scripts/seed-demo.sh`, `scripts/evidence.sh`. |
| Supply-Chain Domain Analyst | `docs/domain/**`, validation-band ADR proposals, demo seed data. No code. |
| Security Reviewer | `docs/threat-model.md`, review comments, failing tests. **Never fixes the bug in the same change** — hands it back. |
| DevOps / Release Engineer | `scripts/deploy.sh`, `.github/**`, `.env.example`, `docs/evidence.md`. Never commit secrets or deploy from a dirty tree. |
| Docs & Pitch | `README.md`, `docs/demo-script.md`, `docs/legal-risk.md`, `pitch/**`. |

End every task with a handoff block:

```markdown
### Handoff
- Persona: <name>
- Changed: <paths>
- ABI change: yes/no (if yes: functions/types/events/errors)
- Tests: <command> → <result>
- Evidence: <tx hashes / screenshots, if any>
- Next owner: <persona> — <what they need to do>
- Open questions: <list or "none">
```

---

## 6. App ↔ smart-contract boundary

- **Contract is authoritative** for authorization, state transitions, LTV/haircut/interest/principal and USDC movements. The app owns presentation, formatting, evidence files and ES/EN messages — never financial formulas.
- The only legal TS↔Soroban path is the generated clients (to be generated) behind a shared `invoke()` helper. Amounts are `bigint` (USDC has 7 decimals), timestamps `bigint` ledger seconds, hashes 32 raw bytes → never `number`.
- Forbidden: contracts accepting a client-supplied `is_verified`/trusted boolean; free text or names in storage/events; the app computing interest/LTV and passing results as arguments; `localStorage`/backend DB as source of truth for lot or loan state; a service signing on behalf of a user.
- Any change to a public function signature, `contracttype`, error or event: Architect updates the spec → Contract Engineer implements + bumps the crate version → DevOps redeploys and updates `docs/evidence.md`/`.env.example` → Integration regenerates bindings + error map → App adapts. Error codes are stable integers (append only); event names/topics are stable.

---

## 7. Smart contract specification

Two contracts (ADR-002): `registry` and `vault`. Receipts are **non-fungible records keyed by `lot_id`**, not fungible tokens (ADR-001); SEP-41 is used only for the settlement asset.

The full spec — lot/loan state machines, parameter defaults and hard bounds, events, error codes, collateral/interest math — is authoritative in **`docs/contract-spec.md`**. Detailed implementation spec: `contracts/warrants-spec.md`. Update these (and this section) on any ABI change rather than duplicating them here.

---

## 8. Contract engineering rules (Rust / Soroban)

1. **Toolchain/build.** `#![no_std]` in every contract crate; build only with `stellar contract build` → target `wasm32v1-none` (never `cargo build --target wasm32-unknown-unknown`). Pin **one** soroban-sdk major in the workspace (this file historically said `29.0.1`; verify against crates.io before creating the manifest). Keep `overflow-checks = true` in the release profile. Keep `lib.rs` thin (auth + validation); put pure logic in modules; storage and events separate.
2. **Numbers.** No floating point. Money is `i128` in the token's smallest unit (USDC = 7 decimals); weights `u64` kg; percentages `u32` basis points (10 000 = 100%); time is ledger seconds `u64`. Use `checked_*` and map `None` → `MathOverflow`. Multiply before dividing; round **against** the beneficiary (debt rounds up, `max_principal` rounds down). No `unwrap`/`expect` on user-influenced data — use `panic_with_error!` or `Result<T, Error>`.
3. **Authorization.** Every mutating entrypoint calls `require_auth()` on the acting address **before** reading state that depends on it, then checks the role. Multi-party actions co-sign each party (e.g. verify = verifier + custodian). `lock`/`unlock`/`transfer_on_default` must accept calls only from the configured vault (require the vault address's auth). Admin never moves receipts or funds. Per lot: `custodian ≠ verifier ≠ borrower`.
4. **Storage/TTL.** `instance()` for admin/config/counters; `persistent()` for lots, loans, roles; never `temporary()` for financial data. One key per lot and per loan — never unbounded collections. Extend TTL on every persistent write (~30-day threshold, ~120-day extend-to).
5. **Tests.** Mandatory matrix per entrypoint: happy path; every unauthorized caller; every invalid prior state; boundaries (0, max, band edges); exact event fields; `env.auths()` to assert precisely who authorized; time travel with `env.ledger().with_mut(...)` across maturity. Commit `test_snapshots/` and review their diffs.
6. **Security checklist** for any PR touching `contracts/`: auth before use on every mutating call; role checked after auth; admin has no asset power; vault-only functions gated; no double-locking or double-funding; no default before maturity unless impaired; rounding favors protocol/lender; no truncating casts; parameters bounded in code; errors/events append-only; no PII/free text; TTL extended; no secrets in the diff.
7. **Testnet ops.** Create identities and deploy via the Stellar CLI. `scripts/deploy.sh` must be idempotent, print every contract ID and tx hash, and append them with Stellar Expert Testnet links to `docs/evidence.md`. Never invent IDs. Demo keys only via `.env` (gitignored) and only for clearly labeled Testnet seeding.

---

## 9. Commands

Requires **Node.js ≥ 22** and **pnpm 8.10.2** (see `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm test    # CI gate, run in this order
pnpm build

pnpm --filter @yerbacapital/evidence evidence hash   <file>
pnpm --filter @yerbacapital/evidence evidence verify <file> <sha256>
```

- The pnpm workspace currently contains only `svc/` (package `@yerbacapital/evidence`); root scripts delegate with `pnpm -r`.
- Tests are plain `node:test` run against **compiled output**: `pnpm test` = `pnpm build && node --test dist/test/*.test.js`. There is no `tsx`/`ts-node` — always rebuild before testing or you test stale `dist`. One test: `pnpm --filter @yerbacapital/evidence build && node --test --test-name-pattern "<name>" svc/dist/test/evidence.test.js`.
- **Known issue:** `pnpm test` fails on Windows. `svc/test/evidence.test.ts` passes `cli.pathname` (`/C:/...`) to `spawnSync`, which node resolves as `C:\C:\...`. Linux CI passes. Fix by passing `fileURLToPath(cli)`.
- The evidence CLI exits `0` on match and `1` on mismatch, usage or read errors; it only verifies file integrity, not the truth of the evidence.
- Contract commands (`stellar contract build|deploy|bindings`) are not wired into the workspace yet. When added, follow §8.7 and regenerate bindings rather than hand-editing clients.

---

## 10. Conventions

- Code, identifiers, commits, errors, events, ADRs: **English**. UI copy, pitch and user-facing docs: **Spanish first** (rioplatense, plain). Domain terms keep their Spanish name with an English gloss on first use.
- Conventional Commits (e.g. `feat(contract): ...`, `fix(app): ...`); branches `feat/<area>-<slug>`, `fix/<slug>`, `docs/<slug>`.
- TypeScript: `strict`, no `any`, no non-null assertions on chain data; ESLint + Prettier; `svc` compiles to `dist/` (gitignored).
- Never commit `.env`, keys/`.pem`, real evidence files, or real producer/cooperative/investor data.

---

## 11. Definition of done

- [ ] Behavior matches `docs/contract-spec.md` / §7, or an ADR records the deviation.
- [ ] Tests added/updated and passing locally and in CI.
- [ ] `fmt`, `clippy`, `typecheck`, `lint` clean.
- [ ] No secrets, PII or real commercial data in the diff.
- [ ] Docs updated where relevant (spec, README, `docs/evidence.md`).
- [ ] If ABI changed: redeployed, bindings regenerated, error map updated, `docs/evidence.md` updated.
- [ ] If user-visible: works end-to-end on Testnet with Freighter and has a Stellar Expert link.
- [ ] Handoff block written (§5).

**Demo acceptance script (must pass before submission):** grant roles → register a 12 000 kg `YERBA_CANCHADA` lot → verifier + custodian verify (moisture 5.0%, evidence hash) → issue receipt + post valuation → request loan ≤ `max_principal` (receipt shows Locked) → lender funds (USDC arrives, tx link) → record mid-aging inspection → partial then full repayment (receipt unlocks) → second lot: impairment → default → lender claims receipt (UI states physical recovery is off-chain) → public page shows both timelines.

---

## 12. Compliance, privacy and safety

- Hackathon prototype. Not legal, financial or tax advice; not an offer of investment.
- In Argentina, virtual-asset activity may fall under the CNV/PSAV regime with AML/CFT obligations; any real deployment needs legal structuring, regulated custody, KYC/AML, insurance, audits and FX/tax compliance. State this in the README and pitch.
- No real producer, cooperative or investor data in the repo or on Testnet — fictional names and synthetic evidence only.
- Refuse to: add mainnet deployment paths, custody user funds in the vault indefinitely, remove role checks "for the demo", or write marketing that promises returns.

---

## 13. Decision log

| ID | Decision | Rationale | Status |
|---|---|---|---|
| ADR-001 | Receipts are non-fungible records in `registry` (one per lot), not a fungible SEP-41 token | Each lot has unique origin, quality and custodian; fungibility would break traceability and per-lot collateral math. SEP-41 is the settlement asset. | Accepted |
| ADR-002 | Two contracts (`registry`, `vault`) instead of one | Separates audit trail from money movement; smaller blast radius; clearer review | Accepted |
| ADR-003 | Vault is pass-through for USDC (no pooled escrow) | Minimizes custody risk and regulatory surface | Accepted |
| ADR-004 | Simple interest, basis points, ledger time | Deterministic and easy to verify | Accepted |
| ADR-005 | Valuation posted by the `PriceOracle` role in loan-asset units | No reliable on-chain ARS price feed for canchada; INYM prices are off-chain | Accepted |
| ADR-006 | Minimal executable bootstrap: local evidence hashing, docs and CI; defer chain and web | Keep the first commit small and reviewable — see `docs/adr/006-bootstrap-scope.md` | Accepted |

New decisions: add `docs/adr/NNN-title.md` (context, decision, consequences) and a row here.
