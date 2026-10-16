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
| `contracts/registry` | Roles, lot lifecycle, receipt ownership, attestations, lock/unlock (callable only by `vault`) | Contract Engineer |
| `contracts/vault` | Loan lifecycle, pass-through USDC transfers, interest, LTV checks, default | Contract Engineer |
| USDC (testnet) | SEP-41 settlement asset via Stellar Asset Contract (SAC) | DevOps |
| `packages/*-client` | TypeScript bindings generated from contract specs | Integration Engineer |
| `app/` | UX for each role, wallet connection, tx lifecycle, public history | App Engineer |
| `svc/` | Evidence intake and hashing, indexer / read model, demo seeding | Oracle Engineer |
| Evidence storage | Heavy files; only their SHA-256 goes on-chain | Oracle Engineer |

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

### 7.1 Alcance y decisiones

Dos contratos Soroban: `registry` mantiene roles, lotes, evidencia y certificados; `vault` mantiene préstamos y coordina movimientos del SAC de liquidación. No hay escrow ni pool. Certificado no fungible, uno por lote. Todo es Testnet y evidencia sintética.

- ADR-007 acepta separar estado físico, existencia del certificado y gravamen. Un reclamo no rehabilita un lote deteriorado.
- ADR-008 excluye la venta con deuda de la primera demo. `SaleConfirmed` queda reservado; no se publica una operación de venta o liquidación comercial en esta versión.
- ADR-009 define autorización conjunta en una única operación y usa `vault` como coordinador del retiro gravado, evitando ciclos de llamadas.
- ADR-010 define política de préstamo inmutable, redondeo y repagos posteriores al default pero anteriores al reclamo.
- ADR-011 requiere allowance SAC acotada y revocable antes del repago; resuelve el cambio de interés entre simulación y ejecución sin escrow.

El ABI objetivo de esta versión se enumera abajo. Toda función mutante autentica a cada actor antes de ejercer su capacidad; las lecturas públicas no requieren autorización. La ausencia de auth es un fallo del host, distinto de un error de negocio.

### 7.2 Representaciones y unidades

- `Address`: direcciones Soroban; `BytesN<32>`: SHA-256, nunca todo cero; `Symbol`: identificadores de commodity/categoría, no texto libre.
- Identificadores de lote y préstamo: `u64`, asignación monótona comprobada desde 1.
- Masa: kilogramos enteros `u64`. El primer MVP no acepta gramos ni cantidades fraccionarias.
- Humedad y tasas: basis points `u32`; 10.000 equivale al 100 %. Importes: `i128`, 7 decimales del activo de demo.
- Tiempos: segundos `u64` del ledger. Año financiero: 31.536.000 segundos. La fecha de observación física permanece en evidencia off-chain.
- Toda aritmética de dominio usa operaciones comprobadas. Overflow produce `MathOverflow`; nunca wrap, saturación silenciosa o conversión truncada.
- `PhysicalStatus`: `Registered`, `Verified`, `Rejected`, `Impaired`, `Closed`.
- `ReceiptStatus`: `Unissued`, `Receipted`, `Encumbered`, `Retired`.
- `LoanStatus`: `Requested`, `Cancelled`, `Funded`, `PartiallyRepaid`, `Repaid`, `Defaulted`, `Liquidated`.
- `Role`: `Custodian`, `Verifier`, `PriceOracle`. `admin` es la autoridad configurada al construir, no un rol otorgable. `borrower`/`lender` son posiciones abiertas y `observer` solo consulta.
- `AgingMethod`: `Natural`, `Accelerated`. `InspectionKind`: `Passed`, `MoistureDrift`. Un resultado que acredita deterioro usa la operación específica de deterioro.
- `ImpairmentReason`: `Moisture`, `Pest`, `Fire`, `Theft`, `Flood`, `Other`. El detalle de `Other` permanece off-chain.

### 7.3 Modelo persistente y consultas

**Lot** conserva: identificador; commodity; owner actual; borrower original inmutable; custodio; verificador que acreditó el ingreso; estado físico; estado del certificado; préstamo vinculado opcional; peso verificado inicial; peso actual; retiros y pérdidas acumulados; humedad; referencia opaca de depósito; método/comienzo del estacionamiento; última evidencia; valuación nominal y peso de referencia de esa valuación; fecha de valuación; indicador de deriva de humedad abierto.

El peso declarado inicial no se considera verificado. Al verificar se fija el peso verificado inicial. Desde entonces: inicial verificado = actual + retiros + pérdidas. Inspeccionar puede reducir peso, nunca aumentarlo. No hay re-verificación, mezcla de lotes ni rehabilitación de `Impaired` en esta versión.

**Loan** conserva: identificador; lote; borrower; lender opcional; principal solicitado; capital pendiente; interés devengado impago; tasa; duración; fecha de fondeo, vencimiento y última liquidación de interés; estado; snapshot de política de riesgo y gracia; deuda congelada al reclamo si la hay. Antes del fondeo no hay deuda, aunque haya principal solicitado y certificado bloqueado.

**Attestation** conserva: lote, categoría, actor, co-firmante cuando corresponde, hash y tiempo de registro; la historia se reconstruye con eventos. El URI, archivos y cualquier nombre, CUIT/DNI, coordenada exacta o información comercial privada permanecen off-chain.

Consultas de `registry`: `get_admin()`, `get_vault()`, `has_role(address, role)`, `get_params()`, `get_lot(lot_id)` y `version()`. Consultas de `vault`: `get_config()`, `get_params()`, `get_loan(loan_id)`, `debt_of(loan_id)`, `max_principal(lot_id)` y `version()`. Se publican tipos desde Rust y se generan clientes; TypeScript no replica tipos contractuales manualmente.

### 7.4 Construcción y vínculo inmutable

- `registry.__constructor(admin)` establece autoridad, parámetros iniciales y vínculo de vault todavía vacío. No se registran lotes antes de vincularlo.
- `vault.__constructor(admin, registry, settlement_asset)` exige direcciones de contrato para registro/activo y el mismo admin que el registro. Establece referencias inmutables e invoca `registry.bind_vault(admin, vault)` como sí mismo.
- `bind_vault` exige firma de admin, autorización del contrato vault, dirección de contrato, vínculo todavía vacío y ausencia de lotes. Solo puede ejecutarse una vez. La construcción de vault y el vínculo son una misma operación confirmada; si algo falla, no queda un vínculo parcial.
- El despliegue debe comprobar el código y las referencias de ambos componentes antes de otorgar roles o ingresar lotes. No se permite reemplazar vault, registry, admin o activo con lotes/deudas ya existentes. No hay upgrade administrativo en el MVP.
- No se recibe dirección de token de parte del usuario en operaciones de valor. El activo de liquidación es siempre el configurado al construir vault.

### 7.5 Roles y separación de funciones

`grant_role(admin, address, role)` y `revoke_role(admin, address, role)` pertenecen a `registry`. Exigen admin y no modifican activos. Otorgamiento/revocación redundante es idempotente, sin evento si no hay cambio. Revocar no borra atestaciones anteriores. No se cambia el custodio del lote en este MVP.

Para cada lote: custodio, verificador y borrower original son direcciones distintas por pares. El owner que solicita financiación también debe ser distinto del custodio y del verificador. `price_oracle` debe ser distinto del custodio y del verificador; no se presupone independencia económica adicional. La misma dirección no puede representar dos de esas tres funciones especializadas sobre el mismo lote, aunque tenga roles globales múltiples. Una autorización de retiro requiere owner y custodio distintos; no se cuenta dos veces una misma firma.

El registro comprueba roles vigentes al atestar. El verificador de emisión es quien verificó ese lote; posteriores inspecciones/deterioros admiten otro `Verifier` habilitado que respete la separación del lote. No hay permiso implícito por una bandera enviada por la app.

### 7.6 ABI de registry y reglas de lote

| Operación objetivo | Autorizaciones | Reglas y efectos |
|---|---|---|
| `register_lot(owner, custodian, commodity, net_kg, warehouse_id, aging_method, aging_started_at, evidence)` | owner | Vault vinculado; commodity `YERBA_CANCHADA`; custodio habilitado y distinto; referencia opaca de depósito no cero; peso no menor al mínimo; inicio de estacionamiento no futuro; evidencia no cero. Crea `Registered` / `Unissued`; `LotRegistered`. |
| `verify_lot(verifier, lot_id, net_kg, moisture_bps, evidence)` | verifier + custodio del lote | Ambas autorizaciones cubren la misma operación/evidencia. Solo `Registered` / `Unissued`; roles separados, peso mínimo y humedad admisible. Fija peso inicial verificado; `Verified`; `LotVerified`. |
| `reject_lot(verifier, lot_id, evidence)` | verifier | `Registered` o `Verified` sin certificado; rol separado, evidencia no cero. `Rejected`; `LotRejected`. |
| `issue_receipt(verifier, lot_id)` | verificador original habilitado | Solo `Verified` / `Unissued`; mantiene owner. Pasa a `Receipted`; `ReceiptIssued`. La evidencia es la verificación enlazada, no otra afirmación física. |
| `post_valuation(oracle, lot_id, valuation, evidence)` | price_oracle | Lote `Verified`, certificado `Receipted` o `Encumbered`; valuación positiva y separación de funciones. Registra valor, peso actual como base y fecha actual del ledger; evidencia metodológica sintética. `ValuationPosted`. |
| `record_inspection(verifier, lot_id, net_kg, moisture_bps, kind, evidence)` | verifier | Lote `Verified` o `Impaired`, certificado emitido y no retirado; peso positivo sin aumento, humedad física entre 0 y 10.000. Agrega pérdidas por reducción; no cambia valuación ni su fecha. Fuera de bandas o `MoistureDrift` abre señal de riesgo; no cura `Impaired`. `InspectionRecorded`. |
| `impair(verifier, lot_id, reason, evidence)` | verifier | Lote `Verified`, certificado emitido; evidencia no cero. Pasa a `Impaired` conservando owner, certificado y vínculo de deuda; `LotImpaired`. No duplica deterioro ya registrado. |
| `transfer_receipt(owner, lot_id, new_owner)` | owner actual | `Verified` / `Receipted`, sin préstamo activo; destinatario distinto, separado del custodio/verificador y no es dirección de vault. No se incorpora mercado. `ReceiptTransferred`. |
| `partial_withdraw(owner, lot_id, kg, evidence)` | owner + custodio | Ruta libre: `Verified` / `Receipted`, cantidad positiva menor al peso y remanente al menos mínimo. Actualiza masa y retiros; evidencia no cero; `PartialWithdrawal`. Si gravado, se rechaza esta ruta y se usa vault. |
| `withdraw_full(owner, lot_id, evidence)` | owner + custodio | `Verified` / `Receipted`, sin gravamen; evidencia no cero. Retira masa restante, `Closed` / `Retired`; `LotClosed`. No significa una entrega física atómica con la cadena. |
| `lock(lot_id, loan_id, owner)` | vault vinculado | Solo `Verified` / `Receipted` y owner coincidente; conserva calidad y pasa a `Encumbered`; `CollateralLocked`. |
| `unlock(lot_id, loan_id)` | vault vinculado | Coincidencia exacta de vínculo activo, incluso con físico `Impaired`; libera a `Receipted` y elimina vínculo, sin rehabilitar físico; `CollateralUnlocked`. |
| `transfer_on_default(lot_id, loan_id, lender)` | vault vinculado | Certificado `Encumbered` y vínculo coincidente; transfiere owner a lender, libera ese gravamen y preserva físico; `ReceiptTransferred`, causa default. |
| `withdraw_encumbered(lot_id, loan_id, owner, kg, evidence)` | vault + owner + custodio | Ruta interna de retiro gravado: vault ya decidió riesgo; registro exige físico `Verified`, vínculo coincidente, remanente mínimo y co-firmas. Conserva `Encumbered`; `PartialWithdrawal`. |
| `set_params(admin, params)` | admin | Parámetros de registro dentro de límites; efecto prospectivo sobre nuevas verificaciones y acciones; nunca cambia hechos anteriores. `ParamsUpdated`. |

No existen `confirm_sale`, rehabilitación, retiro de lote deteriorado, cambio de custodia, préstamo por fracción ni transferencia libre de un certificado gravado en esta versión. Los nombres/eventos reservados del baseline no habilitan capacidades ausentes.

### 7.7 ABI de vault y ciclo financiero

| Operación objetivo | Autorizaciones | Reglas y efectos |
|---|---|---|
| `request_loan(borrower, lot_id, principal, rate_bps, duration_secs)` | owner que será borrower | No pausado; lote elegible con valuación vigente; principal positivo dentro de capacidad; tasa/plazo válidos; sin otro préstamo vinculado. Snapshot de política; `registry.lock`; `Requested`; `LoanRequested`. |
| `cancel_request(borrower, loan_id)` | borrower del préstamo | Solo `Requested`; desbloquea certificado incluso si el lote se deterioró; `Cancelled`; `LoanCancelled`. |
| `fund(lender, loan_id)` | lender | Solo `Requested`, no pausado; lender distinto de borrower; reconsulta lote, separación y valuación vigente con política del préstamo. Transfiere SAC lender → borrower, una sola vez; fija fondeo y vencimiento; `Funded`; `LoanFunded`. |
| `repay(payer, loan_id, amount)` | dueño de los fondos payer | `Funded`, `PartiallyRepaid` o `Defaulted`, nunca `Liquidated`; cantidad positiva. Requiere allowance SAC previa al vault, con monto acotado y vencimiento explícito. Devenga y transfiere con transfer_from solo mínimo entre amount y deuda vigente payer → lender; payer autentica siempre la operación raíz. Interés primero, capital después. Parcial conserva `Defaulted` si ya estaba así; en otro caso `PartiallyRepaid`. Total: `Repaid` + unlock, incluso si físico sigue `Impaired`; `LoanRepaid`. |
| `mark_default(caller, loan_id)` | caller, sin rol privilegiado | Solo deuda fondeada positiva en `Funded`/`PartiallyRepaid`, y tiempo estrictamente posterior a vencimiento + gracia del préstamo, o lote `Impaired`. Devenga a fecha de declaración; `Defaulted`; `LoanDefaulted`. No transfiere colateral. |
| `claim_collateral(lender, loan_id)` | lender del préstamo | Solo `Defaulted` con deuda positiva. Devenga a fecha de reclamo, congela exposición y ordena transferencia del certificado; `Liquidated`; `CollateralClaimed`. No realiza pago de dinero. |
| `partial_withdraw(owner, loan_id, kg, evidence)` | owner + custodio | Préstamo `Funded`/`PartiallyRepaid`, físico `Verified`, valuación vigente y remanente mínimo. Decide D ≤ capacidad restante usando snapshot del préstamo, luego invoca retiro gravado del registro. No hay aprobación financiera reutilizable fuera de esta operación. |
| `set_params(admin, params)` | admin | Cambia política para solicitudes futuras dentro de límites; no reescribe las condiciones de préstamos existentes. `ParamsUpdated`. |
| `set_paused(admin, paused)` | admin | Pausa únicamente nuevas solicitudes y fondeos. No bloquea repagos, cancelación, default, reclamo, evidencia o consulta. `ParamsUpdated`, política pause. |

Si el activo rechaza la transferencia, toda la operación financiera se revierte, incluidos estado, gravamen y eventos de éxito. La autorización de gasto se firma en el SAC configurado antes del repago; puede revocarse con aprobación cero. La demo propone una vigencia de 100 ledgers, no una aprobación ilimitada. El remanente de autorización no es un depósito y no permite al vault gastar sin un repago autenticado. El vault no conserva saldos de usuario en el ciclo normal; no hay método administrativo de retiro o rescate de tokens.

`debt_of`: cero para `Requested`, `Cancelled`, `Repaid`; deuda actual en estados activos/default; exposición congelada en `Liquidated`, identificada como contabilidad del reclamo, no como un saldo que se pueda pagar otra vez por el protocolo. No hay segundo reclamo ni repago posterior a adjudicar. Cualquier deuda o recupero jurídico residual queda fuera del protocolo de demo.

### 7.8 Interés, capacidad y redondeo

La valuación conserva su peso base y fecha: V actual = floor(valor publicado × peso actual / peso base valorado). Una pérdida/retirada no rejuvenece la valuación. El cálculo financiero solo existe en vault.

Haircut = base + ajuste de borde de humedad + ajuste de deriva abierta. El borde aplica si la humedad está dentro de la distancia configurada de alguno de los límites admitidos; se agrega una sola vez aunque las bandas se superpongan. El ajuste de deriva aplica mientras exista una señal abierta; una inspección `Passed` dentro de bandas la cierra, sin curar deterioro. Humedad fuera de las bandas impide nuevo fondeo y retiro gravado hasta una inspección admisible; no declara default por sí misma sin `LotImpaired`.

C = floor(V actual × (10.000 − haircut) / 10.000). M = floor(C × LTV / 10.000). `max_principal` usa la política actual para una solicitud nueva; fondeo y retiro de un préstamo existente usan su snapshot. Una valuación con antigüedad mayor al máximo es vencida; exactamente en el límite sigue vigente. Una fecha futura es inválida.

Interés de intervalo = ceil(capital pendiente × tasa anual × segundos transcurridos / (10.000 × 31.536.000)). Se suma a interés impago y se avanza la última fecha de devengo. Pagar en el mismo timestamp no devenga de nuevo. Interés impago no se capitaliza. Las consultas calculan sin escribir; las mutaciones financieras devengan antes de imputar pagos. Un repago menor al interés no reduce capital. Un exceso solicitado no se transfiere ni queda en vault.

Los límites de capacidad redondean hacia abajo y la deuda hacia arriba. Se admite la mínima diferencia por redondear cada intervalo cerrado al realizar pagos; no se vuelve a cobrar un intervalo anterior. Toda multiplicación/división es comprobada.

### 7.9 Parámetros iniciales y límites

Parámetros de registro:

| Parámetro | Inicial | Límite |
|---|---|---|
| Humedad mínima/máxima | 300 / 700 bps | 0 ≤ mínima < máxima ≤ 2.000 |
| Peso mínimo | 1.000 kg | Entre 1 y 1.000.000 kg |

Parámetros financieros, snapshot al solicitar:

| Parámetro | Inicial | Límite |
|---|---|---|
| LTV máximo | 6.000 bps | Entre 1 y 8.000 |
| Haircut base | 1.500 bps | Entre 0 y 5.000 |
| Vigencia de valuación | 604.800 s | Entre 3.600 y 2.592.000 s |
| Tasa anual máxima | 3.000 bps | Entre 0 y 10.000 |
| Duración máxima Natural | 31.536.000 s | Entre 86.400 y 31.536.000 s |
| Duración máxima Accelerated | 5.184.000 s | Entre 86.400 y 5.184.000 s |
| Gracia | 0 s | Entre 0 y 2.592.000 s |
| Distancia al borde de humedad | 50 bps | Entre 0 y 200 |
| Ajuste por borde | 500 bps | Entre 0 y 1.500 |
| Ajuste por deriva | 500 bps | Entre 0 y 1.500 |

Duración solicitada mínima: un día. La demo usa 180 días Natural; no es un default obligatorio de interfaz. Haircut total máximo resultante: 8.000 bps. La política de humedad aplicable a una operación consulta los parámetros actuales del registro; una alteración administrativa no acredita deterioro ni habilita default. La tasa y los límites financieros de un préstamo ya solicitado permanecen fijos.

### 7.10 Eventos estables

Los identificadores de negocio se conservan. La primera topic es el nombre PascalCase declarado explícitamente en `#[contractevent]`, seguida de lote y/o préstamo; no se depende de la conversión de nombres por defecto del SDK. El contrato y la transacción aportan procedencia, sin publicar URI ni texto libre. Cada evento contiene fecha de ledger.

| Evento | Emisor | Contenido mínimo de negocio |
|---|---|---|
| `LotRegistered` | registry | Lote, owner, custodio, commodity, peso declarado, depósito opaco, estacionamiento y evidencia |
| `LotVerified` | registry | Lote, verifier, custodio, peso verificado, humedad y evidencia |
| `LotRejected` | registry | Lote, verifier y evidencia |
| `ReceiptIssued` | registry | Lote, owner, verifier y evidencia de verificación |
| `ReceiptTransferred` | registry | Lote, owner anterior/nuevo, causa libre/default y préstamo si aplica |
| `ValuationPosted` | registry | Lote, oracle, valor, peso base, fecha y evidencia metodológica |
| `InspectionRecorded` | registry | Lote, verifier, peso, humedad, pérdida, categoría y evidencia |
| `LotImpaired` | registry | Lote, verifier, causa y evidencia |
| `PartialWithdrawal` | registry | Lote, owner, custodio, retiro, remanente, préstamo si corresponde y evidencia |
| `SaleConfirmed` | reservado | No se emite ni habilita en esta versión; ADR-008 |
| `LotClosed` | registry | Lote, owner, custodio, masa retirada y evidencia |
| `CollateralLocked` | registry | Lote, préstamo, owner |
| `CollateralUnlocked` | registry | Lote y préstamo |
| `LoanRequested` | vault | Préstamo, lote, borrower, principal, tasa y duración |
| `LoanCancelled` | vault | Préstamo, lote y borrower |
| `LoanFunded` | vault | Préstamo, lote, borrower, lender, principal, activo y vencimiento |
| `LoanRepaid` | vault | Préstamo, lote, payer, importe transferido, interés/capital imputados, capital/interés remanentes y estado |
| `LoanDefaulted` | vault | Préstamo, lote, caller, causa por plazo/deterioro y deuda de referencia |
| `CollateralClaimed` | vault | Préstamo, lote, lender y exposición congelada; no importe recuperado en dinero |
| `RoleGranted` / `RoleRevoked` | registry | Dirección, rol, admin |
| `ParamsUpdated` | registro/vault | Política afectada, parámetros resultantes o pausa y autoridad |

Bind de vault publica `ParamsUpdated` con referencia del vínculo, sin renumerar eventos. Una mutación exitosa emite su evento; las rutas compuestas emiten los de ambos contratos. En default, `ReceiptTransferred` y `CollateralClaimed` se correlacionan; no se emite un repago ni liberación por cancelación ficticios.

### 7.11 Errores estables

Se preservan códigos 1–24 y solo se agregan nuevos al final:

| Código | Identificador | Código | Identificador |
|---|---|---|---|
| 1 | `AlreadyInitialized` | 13 | `ValuationStale` |
| 2 | `NotAuthorized` | 14 | `ExceedsMaxPrincipal` |
| 3 | `RoleMissing` | 15 | `LoanNotFound` |
| 4 | `RoleConflict` | 16 | `InvalidLoanStatus` |
| 5 | `LotNotFound` | 17 | `NotMatured` |
| 6 | `InvalidLotStatus` | 18 | `AmountInvalid` |
| 7 | `MoistureOutOfBand` | 19 | `MathOverflow` |
| 8 | `WeightInvalid` | 20 | `ParamOutOfBounds` |
| 9 | `EvidenceMissing` | 21 | `Paused` |
| 10 | `ReceiptLocked` | 22 | `WithdrawalBreaksLtv` |
| 11 | `NotReceiptOwner` | 23 | `OnlyVault` |
| 12 | `LotImpaired` | 24 | `UnsupportedCommodity` |
| 25 | `VaultNotConfigured` | 26 | `VaultAlreadyConfigured` |
| 27 | `InvalidDuration` | 28 | `InvalidAddress` |

`AlreadyInitialized` se reserva por compatibilidad del baseline; el host impide reconstruir una instancia. Los errores del SAC/host se propagan y no se transforman en éxito. Los clientes generados son la autoridad sobre el formato de errores publicado.

### 7.12 Almacenamiento, TTL y restauración

Cada contrato conserva en almacenamiento de instancia únicamente referencias inmutables, política y contadores acotados. Roles, lotes y préstamos tienen entradas persistentes separadas; no se guardan listas ilimitadas o historiales dentro de una única entrada.

TTL de diseño: 30 días de ledger como umbral, extensión objetivo de 120 días, usando 17.280 ledgers/día como estimación operativa. Cada escritura persistente y lectura significativa renueva la entrada y la instancia; no se usa almacenamiento temporal para derechos o deuda. Las extensiones deben respetar el máximo de TTL de la red.

Las entradas archivadas se restauran con una operación de restauración/preparación antes de reintentar la operación original. La restauración no cambia titularidad ni estado financiero. Release debe mantener estas entradas durante la demo y distinguir una entrada archivada de un lote/préstamo inexistente. Los resets de Testnet se tratan como despliegues nuevos, no como restauración de una deuda borrada.

### 7.13 Frontera entre contratos y clientes

`vault` utiliza el cliente Rust generado por los tipos/entrypoints publicados de `registry`, compartiendo la misma versión de SDK. No se reimplementa la máquina de lotes. La fuente ABI es Rust; TypeScript se genera desde el Wasm o despliegue verificado con Stellar CLI. Ningún tipo contractual se define manualmente en app.

`registry` exige auth del vault vinculado para gravar, liberar, adjudicar y reducir un lote gravado; la auth de admin no sirve como sustituto. El retiro gravado entra por vault, que consulta registry y luego ordena la reducción. Registry no vuelve a invocar vault ni existe ciclo registry → vault → registry.

Co-firmas de usuario: una transacción Soroban con entradas de autorización para todos los actores. No se implementa una confirmación de custodia en dos pasos ni se da por verificado un lote a medio firmar. El flujo de integración deberá recolectar y presentar las autorizaciones antes de enviar.

### 7.14 Pruebas de aceptación de contratos

- Constructores/vínculo: no se registra antes de bind; no se cambia vínculo; admin/dirección de cuenta no suplanta vault; references correctas.
- Roles: cada escritura exige auth y rol; se prueban direcciones no autorizadas y conflictos por pares, con auth real declarada en pruebas de límite.
- Lote: declaración no equivale a verificación; ambas firmas requeridas; límites de peso/humedad/evidencia; emisión única; rechazo y estados terminales; balance de masa ante pérdidas y retiros.
- Gravamen: solo vault; no doble préstamo; nadie transfiere o retira completamente un certificado gravado; unlock/default coinciden con préstamo vinculado.
- Deterioro: preserva gravamen; bloquea fondeo y retiros; default/reclamo conserva físico `Impaired`; repago total no lo cura.
- Dinero: activo fijado; fondeo una vez y directo; pagos parciales y totales; interés primero; sobrepago acotado; fondos insuficientes revierten todo y no emiten éxito.
- Tiempo/riesgo: vigencia exactamente al límite y vencida; vencimiento/gracia y instante estrictamente posterior; interés mismo timestamp y varios intervalos; redondeo, overflow y snapshot ante cambios administrativos.
- Default: cualquiera puede solicitar con firma; solo lender reclama; payer puede cancelar deuda antes del reclamo; no doble reclamo ni cobro después de adjudicar.
- Pausa: bloquea solicitud/fondeo, permite pagar/cancelar/reclamar y consultar.
- Eventos: nombres, orden de topics, datos y correlación entre contratos; auth y eventos no se validan solo con mocks globales.
- Flujo integrado: dos lotes sintéticos, camino feliz con fondeo/repagos y segundo lote deteriorado adjudicado; transferencias y saldos observables con SAC de pruebas.

---

## 8. Technical skills

Each skill is a self-contained playbook. Load the ones your persona lists. If your tool supports modular skills, each subsection can be extracted to `skills/<name>/SKILL.md` with frontmatter `name` and `description`.

### 8.1 Skill: Rust for Soroban

**Use when:** writing or reviewing anything under `contracts/`.

Rules:

- `#![no_std]` in every contract crate. No `std`, no `String`, no `Vec` from alloc; use `soroban_sdk::{String, Vec, Map, Bytes, BytesN, Symbol}`.
- No floating point anywhere. Percentages are basis points (`u32`, 10 000 = 100%). Weights are integer kilograms or grams (`u64`). Money is `i128` in the token's smallest unit (USDC on Stellar uses 7 decimals).
- Checked arithmetic only: `checked_mul`, `checked_div`, `checked_add`, `checked_sub`; map `None` to `Error::MathOverflow`. Also keep `overflow-checks = true` in the release profile as a second line of defense.
- Multiply before dividing; round **against** the user who benefits (debt rounds up, max principal rounds down).
- No `unwrap()` / `expect()` on user-influenced data. Use `panic_with_error!(&env, Error::X)` or return `Result<T, Error>`.
- Keep `lib.rs` thin: entrypoints validate auth, call pure functions in `lot.rs` / `loan.rs` / `math.rs`, persist via `storage.rs`, emit via `events.rs`.
- Pure logic (state transitions, math) must be testable without an `Env` where possible.
- Explicit enums over magic numbers or symbols for status, role and attestation kind.
- `clippy` clean with `-D warnings`; `rustfmt` enforced.

Workspace manifest:

```toml
# Cargo.toml (root)
[workspace]
resolver = "2"
members = ["contracts/*"]

[workspace.dependencies]
# Pin ONE major across all contracts. Match the network protocol (see Stellar "Software Versions").
# Latest at time of writing: 29.0.1. Verify before bumping.
soroban-sdk = "29.0.1"

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true

[profile.release-with-logs]
inherits = "release"
debug-assertions = true
```

```toml
# contracts/registry/Cargo.toml
[package]
name = "yerbacapital-registry"
version = "0.2.0"
edition = "2021"
publish = false

[lib]
crate-type = ["lib", "cdylib"]
doctest = false

[dependencies]
soroban-sdk = { workspace = true }

[dev-dependencies]
soroban-sdk = { workspace = true, features = ["testutils"] }
```

### 8.2 Skill: Soroban SDK

**Use when:** implementing contract entrypoints, storage, auth, events, cross-contract calls or tests.

#### 8.2.1 Building

- Target is **`wasm32v1-none`** (Rust 1.84+). Build only with `stellar contract build`; never `cargo build --target wasm32-unknown-unknown`.
- Recent SDK majors require a recent Stellar CLI (SDK v28+ requires `stellar-cli` ≥ 25.2.0). Pin versions in `README.md` and CI.

#### 8.2.2 Contract definitions

Use §7 and docs/contract-spec.md 0.3.0 as the authoritative definitions. PhysicalStatus and ReceiptStatus are independent; a single combined LotStatus must not replace them. Use #[contractevent] with explicit PascalCase business-name topics. Keep lib.rs entrypoints thin; state and authorization behavior must follow the specification, not an illustrative skeleton.

#### 8.2.3 Authorization

- Every mutating function takes the acting `Address` as an argument and calls `addr.require_auth()` **before** reading state that depends on it.
- Role checks come after `require_auth()`: auth proves identity, role proves permission. Both are required.
- Multi-party actions (verifier + custodian) call `require_auth()` on each party. The client must collect both signatures (in the demo, the custodian signs a separate auth entry in the same transaction; no two-step custody confirmation is implemented, per ADR-009).
- Contract-to-contract: `registry.lock` checks the caller is the configured vault by requiring auth from the stored vault address (`vault_addr.require_auth()`); the vault invokes as itself, so this passes only for calls made by the vault contract.
- Never use `require_auth_for_args` unless the spec says so; prefer plain `require_auth()`.

#### 8.2.4 Storage and TTL

| Storage | Use for | Notes |
|---|---|---|
| `instance()` | Admin, vault address, params, counters | Shares the contract instance TTL; keep small |
| `persistent()` | Lots, loans, roles | Long-lived; extend TTL on every write and on important reads |
| `temporary()` | Short-lived nonces, caches | May expire; never store anything financial |

- Define TTL constants in `storage.rs` (e.g. `DAY_IN_LEDGERS = 17_280`, threshold 30 days, extend-to 120 days) and call `extend_ttl(&key, threshold, extend_to)` on writes. Extend instance TTL in every entrypoint.
- Archived persistent entries can be restored; still design so that a missed TTL bump is never catastrophic during the demo.
- One key per lot and per loan; never store unbounded `Vec`s of all lots in one entry. Indexing lists is the indexer's job.

#### 8.2.5 Tokens (USDC via SEP-41)

- Use `soroban_sdk::token::TokenClient` against the USDC SAC address stored in vault config.
- Funding: `usdc.transfer(&lender, &borrower, &principal)` after `lender.require_auth()`. The vault never holds funds longer than one call in the MVP (pass-through). If escrow is introduced, document it in an ADR.
- Never accept a token address as a function argument for value-moving calls; use the configured one.

#### 8.2.6 Cross-contract calls

- Vault imports the registry interface via `contractimport!` (from the built Wasm) or a shared client trait crate. Prefer `contractimport!` for type fidelity once the registry ABI is stable.
- Order: checks → effects (write vault state) → interactions (registry/token calls). Soroban reverts the whole transaction on failure, but this ordering keeps reasoning simple.

#### 8.2.7 Testing

```rust
#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, token::StellarAssetClient, Address, BytesN, Env};

#[test]
fn verify_requires_verifier_role() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let id = env.register(Registry, (&admin,));
    let client = RegistryClient::new(&env, &id);
    let stranger = Address::generate(&env);
    let lot_id = 1u64; // seeded by helper
    let res = client.try_verify_lot(&stranger, &lot_id, &10_000, &500, &BytesN::from_array(&env, &[1; 32]));
    assert_eq!(res, Err(Ok(Error::RoleMissing)));
}

fn setup_usdc(env: &Env) -> (Address, StellarAssetClient<'_>) {
    let issuer = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let addr = sac.address();
    (addr.clone(), StellarAssetClient::new(env, &addr))
}
```

Mandatory test matrix for every entrypoint: happy path; each unauthorized caller; each invalid prior state; boundary values (0, max, band edges); event emitted with exact fields; for vault, time travel with `env.ledger().with_mut(|l| l.timestamp += ...)` across maturity. Use `env.auths()` to assert exactly which addresses authorized. Keep snapshot files (`test_snapshots/`) committed and review their diffs.

### 8.3 Skill: TypeScript & Stellar client

**Use when:** working in `app/`, `svc/` or `packages/`.

Stack: Node ≥ 20, TypeScript `strict: true`, `@stellar/stellar-sdk`, `@stellar/freighter-api`, Next.js (App Router), generated contract clients.

Rules:

- **Generated bindings only.** Run `scripts/bindings.sh` (wraps `stellar contract bindings typescript`). Never hand-edit `packages/*-client`.
- **Amounts are `bigint`.** Convert for display with a single `formatUnits(amount: bigint, decimals = 7)` helper. Parsing user input uses `parseUnits(str, 7)`; reject more than 7 decimals.
- **Network config in one place** (`app/src/lib/stellar/network.ts`) read from env: `NEXT_PUBLIC_STELLAR_RPC_URL`, `NEXT_PUBLIC_NETWORK_PASSPHRASE`, `NEXT_PUBLIC_REGISTRY_ID`, `NEXT_PUBLIC_VAULT_ID`, `NEXT_PUBLIC_USDC_ID`. Fail fast at boot if missing.
- **Wallet adapter.** All Freighter calls live in `app/src/lib/wallet/freighter.ts`: `isConnected`, `requestAccess`, `getAddress`, `getNetwork`, `signTransaction(xdr, { networkPassphrase, address })`. Refuse to sign if the wallet network passphrase differs from the app's.
- **Transaction lifecycle** (one helper, used everywhere): build → simulate (surface contract errors here, before asking for a signature) → assemble/prepare (footprint + resource fees) → sign in Freighter → send → poll `getTransaction` until `SUCCESS`/`FAILED` with timeout → return `{ hash, result }`. With generated clients this is `const tx = await client.fund({ lender, loan_id }); const { result } = await tx.signAndSend();`.
- **Error mapping.** Map contract error codes (§7.7) to user messages in `app/src/lib/stellar/errors.ts` (ES default, EN fallback). Unknown codes show the code and tx hash; never swallow errors.
- **Read paths use simulation**, not transactions: `debt_of`, `max_principal`, `get_lot`.
- **Never** store secret keys in the browser, in `NEXT_PUBLIC_*` vars, or in the repo. Demo seeding scripts in `svc/` read `DEMO_*_SECRET` from `.env` and refuse to run if `NETWORK_PASSPHRASE` is not Testnet.
- **Evidence hashing** (`svc/`): SHA-256 over the exact uploaded bytes; for bundles, hash a canonical JSON manifest (sorted keys, UTF-8, no whitespace) listing each file's hash. Return 32 raw bytes as hex; convert to `Buffer` for `BytesN<32>`.
- **UI rules:** separate "Physical status" (Registered / Verified / Impaired / Closed) from "Financial status" (Free / Locked / Loan funded / Defaulted). Each tx button shows idle → simulating → awaiting signature → submitting → confirmed (with Stellar Expert link) → error. Spanish-first copy, plain language, no crypto jargon for cooperative users.

Minimal invoke helper shape:

```ts
// app/src/lib/stellar/invoke.ts
export type TxOutcome<T> = { hash: string; result: T };

export async function invoke<T>(
  build: () => Promise<{ signAndSend: () => Promise<{ result: T; getTransactionResponse?: { txHash?: string } }> }>,
): Promise<TxOutcome<T>> {
  const tx = await build();                  // simulation happens here; contract errors throw
  const sent = await tx.signAndSend();       // Freighter prompt
  const hash = sent.getTransactionResponse?.txHash ?? "";
  return { hash, result: sent.result };
}
```

Testing: Vitest for pure helpers (units, error map, hashing), Playwright for the demo flow against Testnet or a local `stellar container` quickstart network.

### 8.4 Skill: Commodities supply-chain logic

**Use when:** modeling lots, attestations, valuation, collateral math, demo data, or extending to other commodities.

#### 8.4.1 Lot identity and genealogy

- A **lot** is a physically segregated quantity of one commodity, in one warehouse, with one quality profile, identified by `lot_id` on-chain and by physical tags (bag labels/QR containing `lot_id` + short hash) off-chain.
- Lots can be **split** (partial withdrawal) but never silently **merged**. Merging lots with different origins destroys traceability; if ever needed, model it as closing N lots and registering a new one that references their IDs in its evidence manifest.
- Origin data (grower, plot) is pseudonymous on-chain: store only a hash of a salted origin record held off-chain.

#### 8.4.2 Mass balance

For every lot, the indexer and tests must hold:

\[ \text{net\_kg}_{\text{initial}} = \sum \text{withdrawn\_kg} + \text{net\_kg}_{\text{current}} + \text{recorded\_losses\_kg} \]

- Inspections may reduce `net_kg` (moisture loss, spoilage) but never increase it without a new verification.
- If upstream data exists (green-leaf kg), check the plausibility band `canchada_kg / green_leaf_kg ∈ [0.23, 0.39]` and flag (do not block) outside it.

#### 8.4.3 Quality attributes

| Attribute | Unit on-chain | Demo band | Effect |
|---|---|---|---|
| Moisture | bps | 300–700 | Outside band → verification fails; drift on inspection → impairment candidate |
| Net weight | kg (`u64`) | ≥ `min_lot_kg` | Drives valuation |
| Aging start | ledger seconds | — | Informational; buyers price maturity |
| Aging method | enum `Natural` / `Accelerated` | — | Expected maturity window differs (months vs. 30–60 days) |
| Stick content, foreign matter | off-chain lab report | — | Evidence hash only |

#### 8.4.4 Attestation types

`DepositVerified`, `InspectionPassed`, `InspectionFailed`, `MoistureDrift`, `PartialWithdrawal`, `SaleConfirmed`, `Impaired(reason)` where reason ∈ {`Moisture`, `Pest`, `Fire`, `Theft`, `Flood`, `Other`}. Each carries `attester`, `timestamp`, `evidence: BytesN<32>`.

#### 8.4.5 Valuation and collateral math

All in integers, computed **only** in the vault:

\[ \text{collateral\_value} = \text{valuation} \times \frac{10000 - \text{haircut\_bps}}{10000} \]
\[ \text{max\_principal} = \left\lfloor \text{collateral\_value} \times \frac{\text{max\_ltv\_bps}}{10000} \right\rfloor \]
\[ \text{interest} = \left\lceil \text{principal\_outstanding} \times \text{rate\_bps} \times \frac{\Delta t}{10000 \times 31\,536\,000} \right\rceil \]

- `haircut_bps = base_haircut_bps + risk_adders` where adders (configurable) apply for moisture near band edges or an open `MoistureDrift` attestation.
- Valuation older than `valuation_max_age_secs` blocks `fund` and `partial_withdraw`.
- Simple interest, accrued since last repayment; repayments pay interest first, then principal.
- Partial withdrawal is allowed only if, after removing `kg`, `debt ≤ max_principal(remaining)`. Valuation scales linearly with remaining kg.

#### 8.4.6 Seasonality and timing

- Loan duration should fit the aging window: demo default 180 days, max 365 days (natural aging). Accelerated aging lots should use shorter maturities.
- The harvest season drives demand for liquidity; demo copy and seed data should reflect cooperatives borrowing to finance the next harvest against aging canchada.

#### 8.4.7 Extending to other commodities (design only)

- `commodity: Symbol` plus a per-commodity profile in config (moisture band, min lot, unit). Soy and rice fit the same model (tonnes, moisture, silo); cattle does **not** (individual identity, health, mortality, movement) and needs a different module. Do not implement in MVP.

### 8.5 Skill: Physical oracle / attestation

**Use when:** designing or implementing how physical facts get on-chain.

- Flow: inspector captures evidence (photos, scale ticket, moisture meter reading, lab PDF) → `svc` stores files and returns `sha256` + `uri` → inspector reviews and signs `verify_lot`/`record_inspection` in Freighter with that hash → indexer links tx hash ↔ evidence URI.
- Evidence must be reproducible: anyone with the files can recompute the hash and compare with the on-chain value. Provide `scripts/evidence.sh verify <lot_id> <files...>`.
- Separation of duties: custodian co-signs deposit and withdrawals; verifier attests quality; price oracle values. One address cannot hold two of these for the same lot.
- Never claim real-time sensing. IoT sensors (humidity, temperature) are future work; if mocked in the demo, label them "simulated".

### 8.6 Skill: Security review

**Use when:** any PR touches `contracts/`, `svc/` key handling, or the tx lifecycle.

Checklist (all must be answered in the PR):

- [ ] Every mutating entrypoint calls `require_auth()` on the acting address before using it.
- [ ] Every privileged action checks the role after auth.
- [ ] Admin cannot transfer receipts, lock/unlock collateral, or move USDC.
- [ ] `lock`/`unlock`/`transfer_on_default` are callable only by the configured vault.
- [ ] A borrower cannot lock a receipt they do not own; cannot request two loans on one lot.
- [ ] A loan cannot be funded twice; cannot be funded with stale valuation or on an impaired lot.
- [ ] Default cannot be marked before maturity unless the lot is impaired.
- [ ] Repayment rounding favors the lender; max principal rounding favors the protocol.
- [ ] All arithmetic is checked; no `as` casts that can truncate `i128` → smaller types.
- [ ] Parameters are bounded in code (§7.5).
- [ ] Error codes unchanged or appended only; events unchanged or appended only.
- [ ] No PII or free text written to storage or events.
- [ ] TTL extended for every persistent write.
- [ ] Tests cover happy path, unauthorized callers, invalid states, boundaries, time travel.
- [ ] No secrets in diff; `.env` not committed.

Threat scenarios to keep in `docs/threat-model.md`: rogue verifier, verifier–borrower collusion, double-pledging the same physical lot in two systems (off-chain risk; mitigate with custodian attestation and bag tags), stale price, oracle key compromise, front-end phishing (wrong network), admin key loss.

### 8.7 Skill: Testnet operations & release

**Use when:** deploying, seeding, recording evidence, CI.

- Identities via Stellar CLI only: `stellar keys generate <name> --network testnet --fund`. Names: `admin`, `custodian`, `verifier`, `oracle`, `coop` (borrower), `fund` (lender), `usdc-issuer`.
- Settlement asset: for full reproducibility the demo issues its own test asset `USDC:<usdc-issuer>` and wraps it with `stellar contract asset deploy`. Circle's testnet USDC may be used instead by setting `USDC_CONTRACT_ID`; document which one the recorded demo used.
- `scripts/deploy.sh` must be idempotent per run, print every contract ID and tx hash, and append them to `docs/evidence.md` with Stellar Expert Testnet links.
- Testnet can be reset by the network operators; scripts must be able to redeploy from scratch in one command.
- CI (`.github/workflows/ci.yml`): `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, `stellar contract build`, bindings generation check (fail if generated code differs), `pnpm -r typecheck lint test`.

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

| ADR-006 | Minimal executable bootstrap: local evidence hashing, docs and CI; defer chain and web implementation | Keep the first commit small and reviewable; see `docs/adr/006-bootstrap-scope.md` | Accepted |

| ADR-007 | Independent physical and receipt state | Preserve impairment and encumbrance across repayment/default; see docs/adr/007-independent-physical-and-receipt-state.md | Accepted |
| ADR-008 | Defer sale with debt from first demo | No agreed atomic/legal settlement; preserve no escrow; see docs/adr/008-defer-sale-settlement.md | Accepted |
| ADR-009 | Single-operation multi-party auth; vault coordinates pledged withdrawals | No partial custody acceptance or contract-call cycle; see docs/adr/009-atomic-multi-party-authorization.md | Accepted |
| ADR-010 | Snapshot loan policy; allow repayment before claim | Deterministic economics, bounded payment and no double collection; see docs/adr/010-loan-policy-and-post-default-repayment.md | Accepted |

| ADR-011 | Bounded SAC allowance for dynamic repayment | Stable payer authorization across ledger-time accrual, no escrow; see docs/adr/011-bounded-allowance-for-dynamic-repayment.md | Accepted |

New decisions: add a file `docs/adr/NNN-title.md` (context, decision, consequences) and a row here.

---

## 14. References

Stellar / Soroban:

- soroban-sdk on crates.io (version, `wasm32v1-none`, CLI requirement): https://crates.io/crates/soroban-sdk
- soroban-sdk docs (`contractevent`, storage, token, testutils): https://docs.rs/soroban-sdk/latest/soroban_sdk/
- `#[contractevent]` migration notes: https://docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v23_contractevent/
- rs-soroban-sdk releases: https://github.com/stellar/rs-soroban-sdk/releases
- Soroban Rust SDK v28 announcement: https://stellar.org/blog/developers/soroban-rust-sdk-v28
- Smart contract setup (Rust, Stellar CLI): https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup
- Stellar CLI manual: https://developers.stellar.org/docs/tools/cli/stellar-cli
- Contract SDKs: https://developers.stellar.org/docs/tools/sdks/contract-sdks
- TypeScript bindings: https://developers.stellar.org/docs/build/apps/guestbook/bindings
- Software versions per protocol: https://developers.stellar.org/docs/networks/software-versions
- Events example: https://developers.stellar.org/docs/build/smart-contracts/example-contracts/events
- Protocol 23 upgrade guide (Stellar RPC rename, JS SDK Node ≥ 20): https://stellar.org/blog/developers/protocol-23-upgrade-guide

Yerba mate domain:

- INYM, production overview (sapeco, secado, canchado, 9+ months aging): https://inym.org.ar/noticias/produccion-sustentable/80256-de-las-chacras-a-los-mates-argentinos-asi-se-produce-la-yerba-mate.html
- INYM production manual (100 kg green leaf → 30–36 kg dried; 5–6% moisture): https://inym.org.ar/descargar.html?archivo=MTU5ZDY2dnVyTUZKaTNwcmJRSzhFaFdwNXlOS2hCWHJ5YzRzZTA4biswSGRWT3VhcytGL2J5UERDTE1RWVZkR0YvNGg0NktydFNDZDNnSThBbGpEdVE9PQ==&nombre=dEdXdk9vT1NTZ25VZUNCelRuZjVLeFZmSHFrOFZLZ2hEcmNuYXNwQlJRMTBqWHBqMWFtZndsWUx1MDJNaXlxYUhGTFVYdDQ2R25OVlFqdHJPQ3hoM2c9PQ==
- INYM raw-material prices by arbitration (*laudo*): https://inym.org.ar/noticias/precio/80226-el-precio-de-la-materia-prima-sera-fijado-por-laudo.html
- Productive system summary (sapecado weight loss, 6–24 months in *noques*): https://www.dol.gov/sites/dolgov/files/Sistema%20productivo%20Yerba%20Mate%20-%20Resumen%20Ejecutivo.pdf
- Ruta de la Yerba Mate (natural 6–24 months vs. accelerated 30–60 days, ~50 kg bags): https://www.rutadelayerbamate.org.ar/yerba-mate/proceso-de-elaboracion/
- Stage-by-stage microbiology study (drying to 2–4%, aging 6–24 months): https://dialnet.unirioja.es/descarga/articulo/9991121.pdf
