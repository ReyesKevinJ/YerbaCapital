# Demo de YerbaCapital — solo Testnet

Este guion verifica capacidades, no un producto financiero real. Todos los lotes, documentos, actores y precios son sintéticos. El certificado no garantiza que exista yerba y no ejecuta una recuperación física.

## Preparación

- Usar los contratos actuales de `docs/evidence.md` y `.env.example`; vault debe responder revisión 3.
- Mantener app, servicio e indexador activos. Verificar `/api/system` y la cobertura del historial.
- Usar cuentas Freighter Testnet distintas para cooperativa, custodio y verificador; oracle separado de custodio/verificador. Las cuentas de pago requieren XLM, trustline y USDC propio de prueba del emisor documentado.
- Las identidades del seeder están en la configuración local de Stellar CLI, no dentro de Freighter. La demo de CLI no prueba por sí sola el navegador. Para la aceptación humana, preparar cuentas de Testnet en Freighter y otorgar sus roles con admin; nunca enviar claves al chat.
- Tener hashes de archivos sintéticos recuperables mediante el servicio. Cada afirmación física usa evidencia específica.

## Diez pasos de aceptación

1. **Roles.** Conectar admin, elegir «Otorgar rol» y conceder Custodian, Verifier y PriceOracle a las cuentas correspondientes. Verificar cada transacción confirmada.
2. **Ingreso.** Conectar cooperativa y registrar `YERBA_CANCHADA`, 12.000 kg, custodio, referencia opaca del depósito, inicio no futuro y evidencia. Consultar el lote: Registered / Unissued.
3. **Verificación.** Conectar verifier, preparar verificación de 12.000 kg y humedad 500 bps. Cambiar Freighter al custodio y co-firmar la misma operación; volver a verifier y enviar. Consultar Verified / Unissued y el hash del evento.
4. **Certificado y precio.** Verifier emite el certificado. Oracle publica valuación sintética de 12.000 USDC con evidencia. La consulta al vault devuelve capacidad de 6.120 con los parámetros iniciales; la app no reproduce esa fórmula.
5. **Solicitud.** Cooperativa solicita 5.000 USDC, tasa 1.200 bps, plazo 15.552.000 segundos. Consultar Requested / Encumbered; la solicitud aún no genera deuda.
6. **Fondeo.** Fund conecta y fondea una vez. Verificar LoanFunded y la transferencia del SAC directamente a cooperativa con enlace de Stellar Expert. El vault no retiene el dinero.
7. **Inspección.** Verifier registra inspección aprobada con nueva evidencia, peso actual y humedad. El historial registra autoría; la inspección no renueva automáticamente la valuación.
8. **Repagos.** Cooperativa autoriza un máximo de 1.000 USDC con vencimiento breve, luego firma un repago parcial. Consultar deuda al contrato. Opcional: retirar 1.000 kg con co-firma del custodio, si el contrato admite el remanente. Autorizar un máximo suficiente para el total, consultar y firmar repago total. Se transfiere solo la deuda vigente; verificar Repaid y Receipted sin gravamen. Revocar el permiso sobrante del SAC.
9. **Riesgo.** Repetir ingreso/verificación/certificado/valuación/solicitud/fondeo con otro lote. Verifier atesta deterioro por humedad con evidencia; una cuenta declara default y el lender reclama el certificado. Confirmar Liquidated, nuevo owner y físico Impaired. El texto debe aclarar que la recuperación física es off-chain. No se acepta otro reclamo ni repago posterior.
10. **Consulta pública.** Sin conectar billetera, consultar ambos lotes e historiales. Ver eventos, contratos, ledgers, hashes y enlaces públicos. La exposición congelada del préstamo Liquidated no representa dinero recuperado ni una nueva deuda cobrable por el protocolo.

## Casos de recuperación

- Rechazar una firma no envía la operación; los campos se conservan.
- Red o cuenta equivocada bloquean la firma. Cambiar de rol en el formulario no concede permisos.
- Un timeout después del envío conserva el hash y permite consultar; no reenviar automáticamente.
- Cancelar el repago después de aprobar USDC deja un permiso finito hasta revocación/vencimiento; mostrarlo y ofrecer revocación.
- Si falta historial o hay una discontinuidad de RPC, informar cobertura incompleta; no reconstruir eventos desde el estado actual.

## Evidencia de aceptación

Las transacciones del seeder se registran en `docs/evidence.md` como **CLI**, con datos sintéticos. Las capturas locales de navegador no sustituyen una firma de Freighter. Registrar por separado la ejecución humana, las cuentas públicas/roles usados, hashes y grabación; este documento no afirma que esa aceptación ya haya ocurrido.

## Kit de datos para probar desde el navegador

Preparado el 17/10/2026. Persona: **Docs & Pitch**. Este kit documenta datos y pruebas; no cambia contratos, permisos ni saldos. Los valores monetarios son ficticios, no precios de mercado.

### 1. Abrir la demo y preparar las cuentas

Abrí <http://127.0.0.1:3000/> y después <http://127.0.0.1:3000/dashboard> en Chrome con Freighter. Seleccioná **Testnet** en la billetera. El navegador interno de Codex no comparte la extensión de Chrome.

Si los servicios están apagados, abrí tres terminales desde la raíz del proyecto y ejecutá uno en cada una:

```bash
pnpm dev:app
```

```bash
pnpm dev:svc
```

```bash
pnpm dev:indexer
```

Si el puerto 3000 ya está ocupado por la app, usá esa instancia. El servicio guarda los comprobantes y el indexador actualiza el historial; el contrato decide estados y permisos.

Para repetir toda la demo, prepará cinco cuentas de prueba distintas en Freighter: cooperativa, custodio, verificador, valuador e inversor. El administrador habilita Custodian, Verifier y PriceOracle; borrower y lender no necesitan un rol otorgado. Cada firmante necesita XLM de Friendbot para comisiones. Cooperativa e inversor necesitan la trustline del activo propio de demo; el inversor necesita al menos 10.000 USDC de prueba para financiar ambos recorridos y la cooperativa un extra de prueba para intereses. **Friendbot entrega XLM, no el USDC de esta demo**: la emisión/distribución del activo debe prepararla el responsable del despliegue.

La cuenta conectada durante la prueba de carga es:

`GB4T2BPEQHTQDIJRNZD355KY4GNYEG2VK6XUIG6YENBS74IQHAYX5FRH`

Se habilitó como Verifier y se probó una firma de mensaje para guardar una imagen. Eso no demuestra todavía la firma de una transacción contractual desde Freighter ni el recorrido financiero completo. No uses esta misma cuenta como cooperativa o custodio de su lote.

### 2. Referencias públicas del despliegue local

Estas son las cuentas del seeder CLI, **no cuentas automáticamente disponibles en Freighter**. Conocer una dirección pública no permite firmar. Para un recorrido nuevo usá las direcciones de tus propias cuentas y pedí que les habiliten los roles; no copies claves al chat ni al documento.

- `admin`: `GDBMXKBKB3WTKU5QQ7T4FZ4AD7G225PRWWAEANEBS2LBQC7LAMK22UPR`
- `custodian`: `GDTZ57KOZHIDRPHFGXOBXK5VAAHEQYO2KV52PZGUX466CJF3QLJAZTS4`
- `verifier`: `GCSOGUNJDZKGGBQ5RTIE4IS4KSY6C4H46BMSMD6CTIKHFGRSCKWWTURQ`
- `oracle`: `GBEKHHOJTLSKI2NIA2O2JDKXTU5W6P6YXEH4VHMTEDPUPN6YRNHRSQ54`
- `coop`: `GDDTGVCRK22BDQPEHNQJDVL7FM3CFSP2GMMIHGJRVOBORDZL466NWWZ2`
- `fund`: `GB7H6LTP3TDR27MVSMCJAXBHFPKP4YKJDKHX36KU5BMRRX4QBM7F4ZIX`
- `usdc-issuer`: `GB6SGEAZSEHRLBND4AP32NVPK6CGVYPMWDKRX7KHGOZPWCK7RQYTFI5Z`

Contratos del manifiesto local, ejecución `4d2e8e0c36bc7699`:

- `usdc`: `CCY7HWQXSH7PL2NZHLLOHKXY2IOGLAIQLZKF7WAHYZQNN2NAJGIDKEJM`
- `registry`: `CBS7LFX54UPME7UU4NUZ2UKM5XL5KBMUWIYXW6SNSZKMORZJ7UAEQNN2`
- `vault`: `CAUF5CYPJXY2HUBY2XI67QY55A5QESGCKPOV664Q3JMDVG7URZWDH32U`

El activo es USDC propio de Testnet envuelto como SAC; no es USDC de Circle. Si se cambia el despliegue o se resetea Testnet, revisá estas referencias con `docs/evidence.md` y la configuración de la app.

### 3. Comprobantes sintéticos reproducibles

El siguiente bloque crea archivos nuevos en `/tmp/yerbacapital-demo-kit`. Cada archivo identifica su escenario y afirmación. No representa una medición ni un documento real. Ejecutalo desde una terminal; no envía transacciones.

```bash
python3 - <<'PYDATA'
from pathlib import Path
import hashlib
root = Path('/tmp/yerbacapital-demo-kit')
root.mkdir(exist_ok=True)
claims = {
    'A-ingreso': 'Declaracion sintetica: 12000 kg de YERBA_CANCHADA.',
    'A-verificacion': 'Ingreso sintetico verificado: 12000 kg; humedad 5%; custodia segregada simulada.',
    'A-valuacion': 'Valuacion sintetica: 12000 USDC de prueba para 12000 kg; no es precio de mercado.',
    'A-inspeccion': 'Inspeccion sintetica Passed: 12000 kg; humedad 5%; sin perdida simulada.',
    'A-retiro': 'Retiro sintetico: 1000 kg; remanente 11000 kg; entrega fisica simulada.',
    'B-ingreso': 'Declaracion sintetica: segundo lote de 12000 kg de YERBA_CANCHADA.',
    'B-verificacion': 'Segundo ingreso sintetico verificado: 12000 kg; humedad 5%.',
    'B-valuacion': 'Segundo lote: valuacion sintetica 12000 USDC de prueba; no es precio de mercado.',
    'B-deterioro': 'Deterioro sintetico por humedad; sin peritaje ni mercaderia real.',
}
for name, claim in claims.items():
    data = ('TESTNET ONLY | SYNTHETIC | ' + name + ' | ' + claim + '\n').encode('utf-8')
    path = root / (name + '.txt')
    path.write_bytes(data)
    print(name, hashlib.sha256(data).hexdigest(), str(path))
print('warehouse:', hashlib.sha256(b'YERBACAPITAL-SYNTHETIC-WAREHOUSE-DEMO-01').hexdigest())
PYDATA
```

Subí cada `.txt` desde **Guardá un archivo de prueba** y usá el SHA-256 devuelto en la operación correspondiente. No pegues solamente un hash sin guardar el archivo: la evidencia debe poder recuperarse. El archivo de ingreso es una declaración; la verificación requiere después las firmas del verificador y custodio.

Para el campo **Código del depósito entregado por el equipo**, usá esta referencia opaca sintética (no es dirección física):

`5ef6de370c5b2f6c096dd6bde8281c7147d89083a860ffc0d1c3bcf2bda6870a`

Para probar específicamente **Fotografía de inspección**, elegí un JPG/PNG/WebP sintético de hasta 5 MiB. Los `.txt` anteriores corresponden al cargador general, no al de imágenes. El cargador de imágenes pide firma de permiso al Verifier; después hace falta otra firma para registrar el hecho en cadena. IPFS solo se prueba con el proveedor configurado; guardar localmente es un resultado válido y debe mostrarse así.

### 4. Escenario A — ingreso, préstamo y repago

Usá un lote nuevo. Anotá su ID confirmado como **LOTE_A** y el ID del préstamo como **PRESTAMO_A**; no supongas que serán 3 ni que ambos IDs coinciden.

1. **Admin:** habilitá las tareas Custodian, Verifier y PriceOracle en las cuentas elegidas. La vista por rol solo ordena el panel; no otorga permisos.
2. **Cooperativa → Registrar lote:** custodio = cuenta habilitada de depósito; peso = `12000`; código del depósito = referencia anterior; inicio = ayer a las 12:00, hora local; comprobante = A-ingreso. El formulario actual registra `YERBA_CANCHADA` y estacionamiento `Natural`. Esperado: `Registered` / `Unissued`.
3. **Verificador → Verificar ingreso:** lote = LOTE_A; peso = `12000`; humedad = `5`; comprobante = A-verificacion. Revisá los datos, cambiá Freighter al custodio cuando se solicite su cofirma de la misma operación y volvé al verificador para enviar. Esperado: `Verified` / `Unissued`.
4. **Mismo verificador → Emitir certificado:** lote = LOTE_A. Esperado: `Verified` / `Receipted`.
5. **Valuador → Publicar el valor:** lote = LOTE_A; valor total = `12000` USDC de prueba; comprobante = A-valuacion. Consultá la capacidad al contrato. Con parámetros iniciales debe ser `6120` USDC; si cambió la configuración, manda la respuesta contractual.
6. **Cooperativa → Solicitar préstamo:** lote = LOTE_A; importe = `5000`; tasa anual = `12`; plazo = `180` días. Esperado: `Requested`, certificado `Encumbered` y deuda todavía cero.
7. **Inversor → Financiar:** préstamo = PRESTAMO_A. Esperado: `Funded`; transferencia directa de 5.000 USDC de prueba a cooperativa. Guardá el hash confirmado.
8. **Verificador → Registrar inspección aprobada:** lote = LOTE_A; peso = `12000`; humedad = `5`; comprobante = A-inspeccion. Esperado: `InspectionRecorded`, sin renovar automáticamente la valuación.
9. **Cooperativa → Dar permiso para el pago:** máximo = `1000` USDC; vencimiento = ledger actual + `100`. Es un número de bloque, no fecha ni segundos. Consultá el ledger actual en la red al preparar la operación; no reutilices un número viejo.
10. **Cooperativa → Pagar préstamo:** préstamo = PRESTAMO_A; máximo = `1000`. Esperado: `PartiallyRepaid`; el contrato imputa primero interés y después capital. Consultá la deuda real.
11. **Opcional, cooperativa + custodio → Retirar parte del lote en garantía:** préstamo = PRESTAMO_A; peso a retirar = `1000`; comprobante = A-retiro; recolectá ambas firmas. Con la política inicial y ejecución cercana al fondeo debería admitirse. El contrato vuelve a comprobar deuda, vigencia y capacidad restante. Esperado: 11.000 kg, certificado todavía `Encumbered`.
12. **Cooperativa → Dar permiso para el pago:** consultá deuda actual y elegí un máximo finito suficiente, por ejemplo `4500` USDC si la deuda consultada es menor y tenés ese saldo. Renovar vencimiento a ledger actual + `100`. Luego **Pagar préstamo**, mismo máximo y PRESTAMO_A. Se transfiere solo la deuda vigente, no todo el tope. Si la deuda supera ese ejemplo, ajustá el tope explícitamente; no uses una aprobación ilimitada.
13. **Cooperativa → Quitar el permiso de pago.** Consultá: préstamo `Repaid`, deuda `0`, lote `Verified` / `Receipted` y sin préstamo vinculado. Si hubo retiro, conserva 11.000 kg; si no, 12.000 kg.

En los formularios escribí `5000`, no `50.000.000.000`; `5`, no `500`; `12`, no `1200`; `180`, no `15552000`. La app convierte unidades de presentación, mientras el contrato calcula capacidad, deuda e interés.

### 5. Escenario B — deterioro y reclamo

Registrá un **segundo lote nuevo**. Repetí los pasos 2 a 7 con comprobantes B-ingreso, B-verificacion y B-valuacion; mismos peso, humedad, valuación, tasa, plazo y principal. Anotá **LOTE_B** y **PRESTAMO_B**.

1. **Verificador → Informar deterioro por humedad:** LOTE_B y comprobante B-deterioro. Esperado: físico `Impaired`, certificado `Encumbered`; no se borra la deuda.
2. **Inversor u otra cuenta → Declarar incumplimiento:** PRESTAMO_B. El deterioro permite esta ruta sin esperar 180 días; no se adelanta artificialmente el reloj de Testnet. Esperado: `Defaulted`.
3. **Inversor que fondeó → Reclamar certificado:** PRESTAMO_B. Esperado: préstamo `Liquidated`, owner del certificado = inversor, certificado `Receipted` y físico todavía `Impaired`.
4. Comprobá que no se presenta una transferencia de dinero recuperado. La exposición congelada es contabilidad del reclamo. La recuperación física requiere custodio y proceso legal off-chain. Otro reclamo o un repago posterior deben rechazarse.

### 6. Consultas públicas y pruebas de errores

- Consultá LOTE_A y LOTE_B sin conectar billetera, desde el historial público de la app; verificá eventos, enlaces de transacciones y comprobantes. Descargá un archivo y comprobá su hash. El mapa de inversores y sus referencias ilustrativas no sustituyen el estado contractual.
- Como referencia de la ejecución CLI previa, lote `1` terminó `Verified` / `Receipted`, 11.000 kg, préstamo `1` `Repaid`; lote `2` terminó `Impaired` / `Receipted`, préstamo `2` `Liquidated`. Son estados registrados de aquella ejecución, no una consulta nueva ni lotes vacíos para reiniciar pasos. Consultalos antes de usarlos.
- En un lote nuevo todavía Registered, intentá verificar con humedad `20`: debe rechazarse. Luego corregí a `5`.
- Intentá verificar usando custodio = verificador, o registrar con custodio = cooperativa: debe rechazarse por separación de funciones.
- Con un préstamo solicitado, intentá financiar dos veces: el segundo intento debe rechazarse sin otra transferencia.
- En un lote de prueba dedicado, intentá solicitar más que la capacidad consultada: debe rechazarse. No supongas que esa capacidad sigue siendo 6.120 tras un retiro o cambio de política.
- Intentá declarar default sobre deuda vigente, lote sano y antes de vencimiento + gracia: debe rechazarse.
- Rechazá una firma en Freighter: no debe aparecer éxito ni una transacción enviada por esa firma.
- Usá una cuenta sin Verifier en la carga de imagen: debe rechazarse la autorización. Cambiar el selector de rol no debe habilitarla.
- Para probar cancelación, usá otro lote elegible, solicitá y cancelá antes del fondeo: `Cancelled`, certificado liberado y deuda cero.

La venta con deuda, retiro completo, cambio de custodio y rehabilitación de un lote deteriorado no forman parte del recorrido implementado en estos formularios. La conversión a pesos es una simulación educativa; no envía dinero ni genera una orden real de retiro.

### 7. Registro de resultados

Completá durante la ejecución; no marques un paso solo porque la simulación fue exitosa.

- [ ] Roles confirmados y direcciones públicas anotadas.
- [ ] LOTE_A: ______ / PRESTAMO_A: ______.
- [ ] Registro, verificación con dos firmas, certificado y valuación confirmados.
- [ ] Fondeo confirmado; hash: ______.
- [ ] Inspección confirmada y archivo recuperable.
- [ ] Repago parcial confirmado; hash: ______.
- [ ] Retiro opcional confirmado o anotado como omitido.
- [ ] Repago total confirmado; hash: ______; deuda cero y sin gravamen.
- [ ] Permiso de pago sobrante revocado.
- [ ] LOTE_B: ______ / PRESTAMO_B: ______.
- [ ] Deterioro, default y reclamo confirmados; hash de reclamo: ______.
- [ ] Físico Impaired conservado después del reclamo.
- [ ] Historial de ambos lotes consultado sin billetera.
- [ ] Grabación humana de Freighter y enlaces archivados en docs/evidence.md.

### 8. MoneyGram — simulación de conversión a pesos

**Estado actual:** simulación local de una futura rampa como MoneyGram. No está integrada con MoneyGram, bancos ni un Anchor SEP-24. No solicita firmas, consulta saldos, mueve USDC ni permite cobrar pesos. Se puede probar independientemente del fondeo del préstamo.

1. Abrí `/dashboard` y elegí el rol **Cooperativa**.
2. Tocá **Simular conversión a pesos**, o **Explorar simulación** en el apartado de conversión.
3. Cambiá el importe que aparece por `1000`.
4. Elegí **Efectivo (simulación)** y **Posadas · Misiones**.
5. Tocá **Ver resultado de ejemplo**.
6. Debe mostrar 1.000 USDC y un equivalente ilustrativo de **1.280.000 ARS**, antes de costos, con destino **Zona ilustrativa: Posadas · Misiones**. El formato de separadores puede variar; el valor debe coincidir.
7. Tocá **Probar otro ejemplo**, ingresá `5000` y seleccioná **Cuenta bancaria (simulación)**. El resultado debe ser **6.400.000 ARS**, con una cuenta bancaria ficticia de demostración. No se ingresan CBU, alias ni datos personales.
8. Cerrá el diálogo. Comprobá que el estado del préstamo no cambió y que no se abrió Freighter para firmar.

El supuesto fijo del simulador es **1 USDC = 1.280 ARS**. Es un dato de prueba del código, no una cotización vigente. No incluye comisiones, impuestos ni condiciones de un proveedor. Las ciudades del selector son ejemplos geográficos, no sucursales verificadas.

Otros importes para probar:

- `0.5` → **640 ARS**.
- `12.3456789` → **15.802,468992 ARS** como valor numérico, antes de costos.
- `1000000` → **1.280.000.000 ARS**, máximo admitido.
- `0`, `-1` y `1000001` → mensaje de importe inválido y botón de resultado deshabilitado.
- `1.12345678`, `abc` y `1,5` → error de formato. Usar punto decimal, hasta siete decimales y sin separador de miles.

Pruebas de interacción:

- [ ] Efectivo y cuenta ficticia muestran el destino correcto.
- [ ] El resultado mantiene el aviso de simulación y ausencia de operación real.
- [ ] No se genera hash de transacción, código de retiro ni comprobante de cobro.
- [ ] Escape, Cancelar y el botón de cierre cierran el diálogo.
- [ ] Tab y Shift+Tab mantienen el foco dentro del diálogo; al cerrar vuelve al botón que lo abrió.
- [ ] Se puede abrir nuevamente y probar otro importe en modo claro y oscuro, también desde móvil.

Para el relato de la demo: «Después de recibir USDC de prueba, mostramos cómo podría verse una conversión a pesos. Esta parte es una simulación; conectar un proveedor y habilitar retiros reales queda fuera del MVP».

### Handoff
- Persona: Docs & Pitch
- Changed: docs/demo-script.md
- ABI change: no
- Tests: revisión documental contra AGENTS.md, formularios actuales y seed-demo.py; sin nuevas transacciones de demo.
- Evidence: referencias públicas del manifiesto local; los resultados de esta nueva ejecución quedan pendientes de completar.
- Next owner: equipo de demo — preparar cuentas/saldos y ejecutar ambos escenarios con Freighter.
- Open questions: direcciones de las cuentas Freighter restantes y distribución de USDC de prueba para el nuevo recorrido.
