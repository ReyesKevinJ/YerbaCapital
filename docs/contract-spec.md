# Especificación de contratos — YerbaCapital

Versión de diseño: **0.2.0**. Estado: especificación acordada para implementación, todavía sin despliegue. La autoridad del diseño está en esta sección y su espejo en AGENTS.md §7. Una implementación, unos clientes o una demo no se consideran disponibles por estar especificados acá.

## 7. Smart contract specification

### 7.1 Alcance y decisiones

Dos contratos Soroban: `registry` mantiene roles, lotes, evidencia y certificados; `vault` mantiene préstamos y coordina movimientos del SAC de liquidación. No hay escrow ni pool. Certificado no fungible, uno por lote. Todo es Testnet y evidencia sintética.

- ADR-007 acepta separar estado físico, existencia del certificado y gravamen. Un reclamo no rehabilita un lote deteriorado.
- ADR-008 excluye la venta con deuda de la primera demo. `SaleConfirmed` queda reservado; no se publica una operación de venta o liquidación comercial en esta versión.
- ADR-009 define autorización conjunta en una única operación y usa `vault` como coordinador del retiro gravado, evitando ciclos de llamadas.
- ADR-010 define política de préstamo inmutable, redondeo y repagos posteriores al default pero anteriores al reclamo.

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

Para cada lote: custodio, verificador y borrower original son direcciones distintas por pares. El owner que solicita financiación también debe ser distinto del custodio y del verificador. `price_oracle` debe ser distinto del custodio y del verificador; no se presupone independencia económica adicional. La misma dirección no puede representar dos de esas tres funciones especializadas sobre el mismo lote, aunque tenga roles globales múltiples.

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
| `transfer_receipt(owner, lot_id, new_owner)` | owner actual | `Verified` / `Receipted`, sin préstamo activo; destinatario distinto y no es dirección de vault. No se incorpora mercado. `ReceiptTransferred`. |
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
| `repay(payer, loan_id, amount)` | dueño de los fondos payer | `Funded`, `PartiallyRepaid` o `Defaulted`, nunca `Liquidated`; cantidad positiva. Devenga y transfiere solo mínimo entre amount y deuda vigente payer → lender. Interés primero, capital después. Parcial conserva `Defaulted` si ya estaba así; en otro caso `PartiallyRepaid`. Total: `Repaid` + unlock, incluso si físico sigue `Impaired`; `LoanRepaid`. |
| `mark_default(caller, loan_id)` | caller, sin rol privilegiado | Solo deuda fondeada positiva en `Funded`/`PartiallyRepaid`, y tiempo estrictamente posterior a vencimiento + gracia del préstamo, o lote `Impaired`. Devenga a fecha de declaración; `Defaulted`; `LoanDefaulted`. No transfiere colateral. |
| `claim_collateral(lender, loan_id)` | lender del préstamo | Solo `Defaulted` con deuda positiva. Devenga a fecha de reclamo, congela exposición y ordena transferencia del certificado; `Liquidated`; `CollateralClaimed`. No realiza pago de dinero. |
| `partial_withdraw(owner, loan_id, kg, evidence)` | owner + custodio | Préstamo `Funded`/`PartiallyRepaid`, físico `Verified`, valuación vigente y remanente mínimo. Decide D ≤ capacidad restante usando snapshot del préstamo, luego invoca retiro gravado del registro. No hay aprobación financiera reutilizable fuera de esta operación. |
| `set_params(admin, params)` | admin | Cambia política para solicitudes futuras dentro de límites; no reescribe las condiciones de préstamos existentes. `ParamsUpdated`. |
| `set_paused(admin, paused)` | admin | Pausa únicamente nuevas solicitudes y fondeos. No bloquea repagos, cancelación, default, reclamo, evidencia o consulta. `ParamsUpdated`, política pause. |

Si el activo rechaza la transferencia, toda la operación financiera se revierte, incluidos estado, gravamen y eventos de éxito. El vault no conserva saldos de usuario en el ciclo normal; no hay método administrativo de retiro o rescate de tokens.

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

### Handoff

- Persona: Architect
- Changed: docs/contract-spec.md, AGENTS.md §7, docs/architecture.md y ADR-007 a ADR-010
- ABI change: diseño 0.2.0 previo a la primera implementación; tipos/operaciones de esta sección sustituyen el borrador, sin contrato desplegado que migrar
- Tests: revisión de permisos, transiciones, redondeo y correspondencia entre contratos; ninguna prueba de contrato ejecutada por la mera especificación
- Evidence: no transacciones on-chain generadas por este documento
- Next owner: Contract Engineer — implementar registry y vault por separado, con la matriz §7.14
- Open questions: ninguna de las reglas necesarias para la primera demo; venta, re-verificación y ejecución física real permanecen fuera de alcance
