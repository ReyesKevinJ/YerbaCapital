# Manual de la aplicación — YerbaCapital

Manual de uso de la aplicación web de YerbaCapital: qué hace, cómo se instala, cómo se opera cada tarea y qué límites tiene. Está escrito para quien va a usar o demostrar la app (cooperativa, depósito, inspector, valuador, inversor, administrador) y para quien la prepara en una computadora o en Internet.

La app es un prototipo de hackathon sobre **Stellar Testnet**. Todos los lotes, documentos, cuentas y precios son **sintéticos**. No hay fondos reales, no hay incorporación de inversores y no es una oferta de inversión ni asesoramiento legal, financiero o tributario. Los detalles técnicos y las transacciones registradas están en [evidence.md](evidence.md); el guion de demo paso a paso, en [demo-script.md](demo-script.md); la publicación en Vercel, en [production.md](production.md).

---

## Índice

1. [Qué es y qué no es](#1-qué-es-y-qué-no-es)
2. [Glosario mínimo](#2-glosario-mínimo)
3. [Requisitos previos](#3-requisitos-previos)
4. [Opción A: usar la demo pública](#4-opción-a-usar-la-demo-pública)
5. [Opción B: correr todo en tu computadora](#5-opción-b-correr-todo-en-tu-computadora)
6. [Recorrido por la interfaz](#6-recorrido-por-la-interfaz)
7. [Conectar Freighter](#7-conectar-freighter)
8. [Cómo se firma una operación](#8-cómo-se-firma-una-operación)
9. [Tareas por rol](#9-tareas-por-rol)
10. [Detalle de cada operación](#10-detalle-de-cada-operación)
11. [Cofirmas: verificar ingreso y retirar en garantía](#11-cofirmas-verificar-ingreso-y-retirar-en-garantía)
12. [Permiso de pago, repagos y default](#12-permiso-de-pago-repagos-y-default)
13. [Comprobantes (evidencia)](#13-comprobantes-evidencia)
14. [Consulta pública, historial y QR](#14-consulta-pública-historial-y-qr)
15. [Mapa de inversores y simulador de pesos](#15-mapa-de-inversores-y-simulador-de-pesos)
16. [Expediente del piloto](#16-expediente-del-piloto)
17. [Mensajes frecuentes y cómo resolverlos](#17-mensajes-frecuentes-y-cómo-resolverlos)
18. [Qué no hace la app](#18-qué-no-hace-la-app)
19. [Buenas prácticas](#19-buenas-prácticas)
20. [Preguntas frecuentes](#20-preguntas-frecuentes)
21. [Referencias](#21-referencias)

---

## 1. Qué es y qué no es

YerbaCapital permite registrar un lote de **yerba canchada** en estacionamiento, verificarlo con evidencia firmada, emitir un certificado digital sobre ese lote, valuarlo y usarlo como garantía para pedir un préstamo en **USDC de prueba**, con repagos, inspecciones, deterioro y default.

**El token no es la yerba.** El certificado representa un **derecho condicionado** sobre un lote físico verificado y custodiado. La blockchain garantiza autoría, orden e integridad de los registros; **no** garantiza que la yerba exista, esté donde se declara, tenga la calidad informada ni que no se haya vendido, robado o deteriorado.

Qué sí resuelve:

- Un historial público y firmado de las afirmaciones físicas y financieras del lote.
- Reglas de autorización y de riesgo que decide el contrato, no la interfaz.
- Transferencias directas de USDC de prueba entre las partes, con comprobante en Stellar Expert.

Qué no resuelve:

- No acredita el hecho físico: cada afirmación entra por la firma de una cuenta autorizada y un hash de evidencia.
- No recupera mercadería: reclamar el certificado en un default **no** entrega la yerba. La recuperación física requiere al custodio y un proceso legal fuera de la cadena.
- No convierte USDC a pesos: esa pantalla es una simulación educativa.

Estados que vas a ver, siempre separados:

| Estado físico | Estado del certificado | Estado financiero del préstamo |
|---|---|---|
| Registrado | Sin emitir | Solicitado |
| Verificado | Emitido / libre | Cancelado |
| Rechazado | En garantía | Financiado |
| Deteriorado | Retirado | Pagado en parte |
| Cerrado | | Pagado |
| | | En incumplimiento |
| | | Certificado reclamado |

Que el certificado esté libre **no** rehabilita una mercadería deteriorada.

---

## 2. Glosario mínimo

| Término | Significado en la app |
|---|---|
| **Lote** | Cantidad de yerba canchada, en un depósito, con un identificador numérico (`lote 3`). |
| **Certificado** | Registro no fungible, uno por lote, que representa el derecho condicionado sobre ese lote. No es un token transferible libre. |
| **Custodio** | Cuenta del depósito que resguarda la mercadería. Cofirma el ingreso y los retiros. |
| **Verificador** | Cuenta del inspector o laboratorio que atestigua peso, humedad y estado. |
| **Valuador (price oracle)** | Cuenta que publica el valor del lote en USDC de prueba. |
| **USDC de prueba** | Activo propio de esta demo en Testnet. **No** son pesos ni USDC emitidos por Circle. |
| **Cofirma** | Segunda autorización sobre la *misma* operación (por ejemplo, verificador + custodio). No es una operación aparte. |
| **Gravamen / En garantía** | El certificado está bloqueado como colateral de un préstamo. |
| **Haircut y LTV** | Margen por riesgo y porcentaje máximo financiable respecto del valor. Los calcula el contrato; la app solo los consulta. |
| **Comprobante / evidencia** | Archivo sintético cuyo SHA-256 se registra en cadena. Prueba integridad, no veracidad. |
| **Ledger** | Bloque de la red. El vencimiento de un permiso de pago se expresa en número de ledger, no en fecha. |

---

## 3. Requisitos previos

**Para recorrer la app** podés usar cualquier navegador de escritorio. Para firmar operaciones necesitás **Google Chrome con la extensión Freighter**, una billetera con una cuenta de **Stellar Testnet** y conectar esa billetera a la app cuando te lo pida. Para operar, la cuenta activa debe tener el rol o la titularidad que requiere esa tarea.

**Para correr la app en tu computadora**, además:

- Node.js 22 o superior y **pnpm 8.10.2**.
- Python 3 (para los scripts de operaciones del despliegue).
- Google Chrome y la extensión Freighter instalada y desbloqueada.
- Cuentas de Testnet con:
  - XLM de prueba (Friendbot) para pagar comisiones.
  - Trustline del activo de demo USDC, si la cuenta recibe o paga USDC.
  - Saldo de USDC de prueba: el inversor necesita suficiente para financiar y la cooperativa para pagar intereses.

La app **no** crea trustlines, no acuña fondos y no genera claves: eso lo prepara el responsable del despliegue. Nunca escribas claves secretas en la app, en el chat ni en un documento del repositorio.

---

## 4. Opción A: usar la demo pública

La web está publicada en Vercel y apunta a los contratos activos de Testnet.

- URL actual de la demo: `https://app-rouge-zeta-96.vercel.app`
- Funciona sin cuenta: la landing, el dashboard, la consulta pública por lote y el QR.
- Para firmar operaciones necesitás una billetera Freighter conectada a la app, en Testnet, y una cuenta autorizada para la tarea. La app presenta el recorrido según el rol, pero no se lo asigna a la cuenta.
- La carga de evidencia y el historial indexado dependen del servicio `svc/`, que **todavía no está alojado**. Por eso:

| Endpoint | Qué devuelve hoy | Motivo |
|---|---|---|
| `/api/system` | `503` con `evidence_unavailable`, `registry` y `vault` en `available` | La evidencia no está publicada, la cadena sí |
| `/api/catalog` | `503` con mensaje explícito | Depende del indexador local |
| `/api/lots/<id>/history` | `503` con mensaje explícito | Depende del indexador local |
| Carga de comprobantes | No disponible | Requiere el servicio en `127.0.0.1` |

La app **no** inventa datos cuando un servicio falta: muestra el mensaje de indisponibilidad. La publicación y sus variables están documentadas en [production.md](production.md).

---

## 5. Opción B: correr todo en tu computadora

### 5.1 Instalación

Desde la raíz del repositorio:

```sh
pnpm install --frozen-lockfile
pnpm setup:local
pnpm build:clients
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm setup:local` crea el archivo `.env` con una credencial aleatoria y permisos privados. No imprime la credencial ni sobrescribe un `.env` existente. Si ya tenías `.env`, completalo tomando `.env.example` como referencia.

### 5.2 Variables principales de `.env`

| Variable | Para qué sirve |
|---|---|
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Debe ser `Test SDF Network ; September 2015`. |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | RPC oficial de Testnet. |
| `NEXT_PUBLIC_CHAIN_ENABLED` | `true` habilita firmas on-chain; `false` deja solo el modo off-chain (evidencia y expediente). |
| `NEXT_PUBLIC_REGISTRY_ID`, `NEXT_PUBLIC_VAULT_ID`, `NEXT_PUBLIC_USDC_ID` | IDs del despliegue activo; deben ser tres contratos válidos y distintos. |
| `EVIDENCE_SERVICE_URL` | Debe ser HTTP en `127.0.0.1` (por defecto `http://127.0.0.1:3001`). |
| `APP_ORIGIN` | Origen local autorizado (por defecto `http://127.0.0.1:3000`). |
| `EVIDENCE_ACCESS_TOKEN` | Credencial privada de al menos 32 caracteres. Nunca lleva prefijo `NEXT_PUBLIC_`. |
| `EVIDENCE_STORAGE_DIR`, `INDEXER_STORAGE_DIR` | Carpetas de archivos y del índice, dentro de `svc/`. |
| `INDEXER_FROM_LEDGER` | Ledger desde el que se reconstruye el historial; debe cubrir el despliegue. |
| `PINATA_JWT` | Opcional y solo en el servidor: habilita el intento de publicación en IPFS. |

Cambiar `NEXT_PUBLIC_*` exige recompilar: esas variables se fijan al compilar.

### 5.3 Arrancar los tres procesos

Abrí tres terminales distintas desde la raíz y ejecutá una en cada una:

```sh
pnpm dev:svc
```

```sh
pnpm dev:indexer
```

```sh
pnpm dev:app
```

- App: **http://127.0.0.1:3000**
- Servicio de evidencia: **http://127.0.0.1:3001**

El servicio guarda comprobantes y el indexador actualiza el historial. El contrato decide estados y permisos. Con los tres procesos activos, comprobá el estado en `/api/system`.

Versión compilada para producción local:

```sh
pnpm build
pnpm --filter app start
```

Dejá el servicio y el indexador activos.

### 5.4 Verificaciones útiles

```sh
pnpm --filter @yerbacapital/evidence evidence hash /ruta/evidencia.txt
pnpm --filter @yerbacapital/evidence evidence verify /ruta/evidencia.txt HASH_SHA256
pnpm --filter @yerbacapital/evidence index --once
bash scripts/check-contracts.sh
bash scripts/bindings.sh --check
```

---

## 6. Recorrido por la interfaz

| Ruta | Qué encontrás |
|---|---|
| `/` | Landing pública: problema, propuesta, recorridos para entidades yerberas e inversores, casos de demo y límites. |
| `/dashboard` | Panel de trabajo guiado: elegís un recorrido, una tarea y luego firmás solo si la cuenta tiene el permiso on-chain. |
| `/investors` | El mismo panel, abierto en la vista Prestamista, con el mapa ilustrativo. |
| `/lots/<id>` | Consulta pública de un lote: estado actual, historial, comprobantes y QR. No pide billetera. |
| `/pilot` | Expediente compartido de acuerdos sintéticos del piloto. |
| `/pilot/local` | Versión anterior del expediente, guardada en el navegador. |

### 6.1 Landing: entendé la propuesta antes de operar

La landing no pide billetera. Presenta el problema del capital inmovilizado durante el estacionamiento y explica qué registra la demo en Testnet.

- En **«Elegí tu recorrido»** podés alternar entre `Tengo yerba estacionándose` y `Quiero explorar oportunidades`. Cada opción traduce el mismo sistema a los pasos y preguntas de cooperativas, secaderos, depósitos o prestamistas.
- En **«Dos casos. Las señales a la vista.»** podés abrir el lote demo 3, que muestra un ciclo de repago y liberación, o el lote demo 4, que muestra deterioro, default y reclamo del certificado. Ambos enlaces llevan a la consulta pública del lote.
- La sección sobre el consumo de mate vincula la propuesta con la continuidad de la cadena, pero no convierte a YerbaCapital en una oferta de crédito ni garantiza precio, abastecimiento o rendimiento.
- Los enlaces `Soy una entidad yerbera` y `Explorar como inversor` abren el panel en el recorrido correspondiente. El mapa del inversor sigue usando ejemplos ficticios, no ofertas de mercadería.

### 6.2 Dashboard: un paso por vez

Elementos permanentes:

- Banner **«El token no es la yerba»**: *"La blockchain registra autoría e integridad; no garantiza existencia, calidad ni custodia física."*
- Píldoras de entorno: `Testnet · Datos sintéticos` o `Modo off-chain`; pie: `Solo Testnet · Datos sintéticos · Sin oferta de inversión`.
- Selector **Recorrido de la demo**: ordena la pantalla según cooperativa, prestamista, custodio, verificador, valuador, administrador o consulta pública. **No otorga permisos**: el contrato autentica a cada firmante.
- En **Resumen**, la tarjeta `Próximo paso` propone una sola tarea relevante para ese recorrido. También podés ver el recorrido completo o explorar lotes e historial de ejemplo.
- La navegación principal conserva `Resumen`, `Lotes`, `Financiamiento`, `Verificaciones` y `Actividad` cuando corresponden. `Integraciones` y `Operaciones` están dentro de **«Más detalles de la demo»** para no mezclar los datos técnicos con el primer recorrido.
- Al preparar una tarea, la app prioriza el flujo `Comprobantes → Datos → Revisión y firma` y oculta temporalmente catálogo, métricas e historial. Volvé a `Resumen` o a otra sección para abandonar esa tarea antes de firmar.
- La pantalla **Operaciones** permite preparar manualmente otra tarea del recorrido seleccionado. No reemplaza las reglas del contrato.

Con la cadena desactivada vas a leer: *"Las operaciones de la red de prueba están desactivadas. Podés guardar archivos de prueba y gestionar acuerdos. Para firmar, el equipo tiene que activar la conexión con Testnet."*

### 6.3 Consultar lotes y préstamos

- Escribí hasta **12 identificadores por vista** y tocá `Consultar`.
- El catálogo indexado se pagina de a 12 registros (`Página anterior` / `Página siguiente`).
- La tabla de lotes muestra: `Lote / titular`, `Peso actual`, `Estado físico`, `Certificado` y `Detalle`.
- La lista de préstamos se puede filtrar (`Solicitudes sin financiar`, `Todos los estados consultados`) y buscar por número de lote o préstamo.
- Si el indexador no está disponible, la app lo informa: *"No se pudo consultar Testnet. No hay datos de reemplazo simulados."* El estado financiero siempre se consulta al contrato, nunca se calcula en el navegador.

---

## 7. Conectar Freighter

1. En Google Chrome, instalá la extensión oficial **Freighter** y abrila.
2. Creá o importá una billetera en Freighter y desbloqueala. La app nunca debe recibir tu contraseña ni frase de recuperación.
3. Elegí **Stellar Testnet** en Freighter y seleccioná la cuenta que vas a usar.
4. En la app, tocá **Conectar Freighter** y aprobá la conexión. Esto permite que la app consulte la dirección pública y solicite firmas; no le entrega la clave privada.
5. Confirmá que la cuenta activa corresponde a la tarea. La cuenta puede tener un rol especializado —`custodian`, `verifier` o `price_oracle`— o actuar como `borrower` o `lender`, según la operación.

Los roles se configuran en la cuenta de Stellar, no en el selector **Recorrido de la demo**. Para las cuentas de prueba preparadas, el equipo debe indicar qué cuenta usar para cada rol. En una configuración propia, el administrador autorizado otorga o revoca los roles especializados; la cuenta que solicita un préstamo o presta fondos debe ocupar la posición correspondiente. Una cuenta puede tener permisos para ciertas tareas y no para otras. Además, en el mismo lote, custodio, verificador y tomador deben ser cuentas distintas.

La app rechaza firmar si la red no es Testnet: *"Cambiá Freighter a Stellar Testnet antes de firmar."* Si cambiás de cuenta en Freighter después de conectar, la app pide reconectar antes de firmar. La app nunca guarda claves privadas.

---

## 8. Cómo se firma una operación

1. En **Resumen**, tocá `Próximo paso`; si ya sabés qué hacer, podés abrir la sección correspondiente o `Más detalles de la demo → Operaciones`.
2. Si la tarea usa evidencia, prepará primero el comprobante indicado. Para registrar un lote, empezá por la carpeta documental; para otros hechos físicos, usá un archivo o foto de inspección según corresponda.
3. Completá los campos y tocá **Revisar datos antes de firmar**. La app simula la operación contra Testnet. Si el contrato la rechaza (por ejemplo, humedad fuera de banda o rol faltante), ves el error antes de cualquier firma.
4. Si la operación necesita **cofirma**, se habilita `Co-firmar con la cuenta activa`. El bloque indica qué cuentas faltan.
5. **Firmar y enviar a Testnet**: Freighter muestra la transacción y la aprobás.
6. La app declara éxito solo con confirmación `SUCCESS` y publica el enlace a **Stellar Expert Testnet**.

Estados que vas a ver durante el envío:

| Estado | Texto |
|---|---|
| Simulando | `Simulando en Testnet…` |
| Esperando firma | `Esperando firma en Freighter…` |
| Enviando | `Enviada; esperando confirmación…` |
| Confirmada | `Confirmada en Testnet.` |

Si el envío queda sin resolver: *"La confirmación sigue pendiente. Consultá la transacción antes de volver a enviarla."* La app conserva el hash y ofrece `Consultar confirmación pendiente`. **No reenvíes la misma operación.**

Atajos útiles del formulario:

- `Consultar monto máximo del contrato` (al solicitar un préstamo): devuelve la capacidad calculada por el contrato. Es una consulta, no una aprobación.
- `Completar vencimiento automáticamente` (al dar permiso de pago): escribe un vencimiento de 100 ledgers por delante del actual, como propone la demo.
- `Copiar código del comprobante`: pega el SHA-256 en la operación.

---

## 9. Tareas por rol

Elegí tu recorrido en **Recorrido de la demo** para ver solo las tareas que la interfaz puede presentar para esa situación. Recordá que el selector no concede permisos: la cuenta que firma debe tener el rol o ser la titular correspondiente.

| Recorrido de la demo | Puede preparar |
|---|---|
| **Administrador** | `Habilitar una tarea` (otorgar Custodian, Verifier o PriceOracle). No mueve fondos ni colateral. |
| **Cooperativa / quien pide el préstamo** | `Registrar lote`, `Solicitar préstamo`, `Cancelar solicitud sin fondeo`, `Dar permiso para el pago`, `Pagar préstamo`, `Quitar el permiso de pago`, `Retirar parte del lote en garantía`, `Declarar incumplimiento`. |
| **Prestamista** | `Financiar un préstamo`, `Reclamar certificado`, `Declarar incumplimiento`, `Dar permiso para el pago`, `Pagar préstamo`, `Quitar el permiso de pago`. |
| **Depósito / custodio** | `Verificar ingreso` (cofirma), `Retirar parte del lote en garantía` (cofirma). |
| **Inspector / verificador** | `Verificar ingreso`, `Emitir certificado`, `Registrar inspección aprobada`, `Informar deterioro por humedad`. |
| **Valuador del lote** | `Publicar el valor del lote`. |
| **Consulta pública** | Solo lectura, sin billetera. |

Reglas de separación de funciones sobre el mismo lote: custodio, verificador y quien solicita deben ser **cuentas distintas**; el valuador también debe ser distinto del custodio y del verificador. El contrato rechaza la operación si dos funciones recaen en la misma cuenta.

---

## 10. Detalle de cada operación

En todos los formularios, los datos de peso son **kilos enteros** (`12000`, nunca `12.000`). Los porcentajes se escriben como porcentaje (`5` o `5,25`), no en puntos básicos. El plazo se escribe en **días enteros** (`180`). Los importes son en **USDC de prueba** con punto decimal y hasta 7 decimales (`1500.50`).

### 10.1 Administrador · Habilitar una tarea

- Campos: cuenta que recibirá el rol (pública, nunca una clave) y tarea (`Custodiar mercadería`, `Verificar e inspeccionar lotes`, `Publicar el valor de los lotes`).
- Resultado: se otorga el rol. El admin no puede mover colateral ni fondos de terceros.
- `borrower`, `lender` y `observer` no necesitan rol.

### 10.2 Cooperativa · Registrar lote

- Campos: cuenta del custodio, peso en kg, código del depósito entregado por el equipo (referencia opaca de 64 hex), inicio del estacionamiento (fecha y hora local), comprobante (SHA-256).
- Fijos: commodity `YERBA_CANCHADA`, estacionamiento `Natural`.
- El peso declarado **no** está verificado todavía. Si ya consultaste otro lote, el formulario ofrece reutilizar su custodio y su código de depósito.
- Resultado: lote `Registrado` / `Sin emitir`.

### 10.3 Verificador + custodio · Verificar ingreso

- Campos: lote, peso verificado, humedad (%), comprobante.
- Requiere **cofirma del custodio** (ver sección 11).
- Restricciones: el inicio del estacionamiento no puede ser futuro; la humedad debe estar dentro de las bandas (por defecto 3 % a 7 %, con etiqueta `La humedad está fuera de las bandas admitidas.`).
- Resultado: lote `Verificado`. Fija el peso inicial verificado. La declaración de ingreso ya no se considera verificada.

### 10.4 Verificador · Emitir certificado

- Campo: lote.
- Resultado: certificado `Emitido / libre`. La evidencia es la verificación ya enlazada, no una afirmación nueva.

### 10.5 Valuador · Publicar el valor del lote

- Campos: lote, **valor total del lote** en USDC de prueba (no por kilo, no en pesos), comprobante metodológico.
- Resultado: valuación con peso base y fecha. La app no reproduce la fórmula de capacidad: la consulta al contrato (por ejemplo, 6.120 USDC de prueba para un lote de 12.000 kg con los parámetros iniciales).
- Una valuación vencida (por defecto, 7 días) **bloquea** el fondeo y el retiro en garantía hasta que se actualice.

### 10.6 Cooperativa · Solicitar préstamo

- Campos: lote, importe, tasa anual (%), plazo (días).
- Restricciones: el lote debe estar valuado y sin otro préstamo; el importe no puede superar la capacidad calculada por el contrato.
- Resultado: préstamo `Solicitado` y certificado `En garantía`. **La solicitud todavía no genera deuda**: la deuda nace al fondearse.

### 10.7 Cooperativa · Cancelar solicitud sin fondeo

- Campo: préstamo. Solo sobre solicitudes sin financiar.
- Resultado: `Cancelado`, certificado liberado y deuda cero, incluso si el lote se deterioró mientras tanto.

### 10.8 Prestamista · Financiar un préstamo

- Campo: préstamo. El prestamista debe ser distinto del solicitante.
- El contrato vuelve a comprobar lote, valuación vigente y separación de funciones.
- Resultado: `Financiado` y transferencia directa de USDC de prueba al solicitante. El vault no retiene el dinero.

### 10.9 Verificador · Registrar inspección aprobada

- Campos: lote, peso actual, humedad, comprobante.
- No puede aumentar el peso: la inspección solo registra pérdidas. Tampoco renueva la valuación.
- Resultado: se agrega la inspección al historial. Una inspección aprobada dentro de bandas cierra una señal de deriva de humedad, pero no cura un deterioro.

### 10.10 Verificador · Informar deterioro por humedad

- Campos: lote, comprobante.
- En esta demo solo informa la causa **humedad**; no sirve para robo, incendio u otros motivos.
- Resultado: lote físico `Deteriorado`, conservando titular, certificado y vínculo de deuda. Habilita el default sin esperar el vencimiento.

### 10.11 Cooperativa + custodio · Retirar parte del lote en garantía

- Campos: préstamo, kilos a retirar, comprobante. Requiere **cofirma del custodio**.
- Solo aplica a un retiro **con gravamen** (con préstamo activo). El contrato revisa deuda, vigencia de la valuación y remanente mínimo: `Ese retiro deja colateral insuficiente para la deuda.`
- Resultado: menos kilos en el lote, certificado que sigue `En garantía`.
- El **retiro libre** (sin préstamo) y el **retiro total** no están expuestos en esta interfaz.

### 10.12 Pagador · Dar permiso para el pago

- Campos: monto máximo autorizado y vencimiento en **número de ledger**.
- Es un permiso al contrato del vault para usar esa cantidad del activo de demo: no transfiere nada por sí solo y no es un depósito.
- Usá `Completar vencimiento automáticamente` para no equivocarte con el número de bloque.
- Resultado: queda registrado el máximo. **Cancelar el repago después de esto no revoca el permiso**: hay que revocarlo.

### 10.13 Pagador · Pagar préstamo

- Campos: préstamo, monto máximo de este pago.
- Se transfiere **hasta la deuda vigente**, no todo el máximo autorizado. El contrato imputa primero intereses y después capital.
- Resultado: `Pagado en parte` o `Pagado`. Al cancelar toda la deuda, el certificado vuelve a `Emitido / libre`, incluso si el lote sigue `Deteriorado`.

### 10.14 Pagador · Quitar el permiso de pago

- Sin campos. Deja el permiso en cero y no mueve fondos.
- Usalo cuando ya no vayas a pagar para no dejar un permiso abierto.

### 10.15 Cualquier cuenta · Declarar incumplimiento

- Campo: préstamo.
- Requisitos: deuda financiada positiva y que se cumpla el vencimiento + gracia **o** que el lote esté `Deteriorado`. Error si todavía no se cumple: `Todavía no se cumple una condición de default.`
- Resultado: `En incumplimiento`. **No** transfiere colateral.

### 10.16 Prestamista · Reclamar certificado

- Campo: préstamo. Solo el prestamista de ese préstamo, sobre uno `En incumplimiento` con deuda positiva.
- Resultado: préstamo `Certificado reclamado`, certificado a nombre del prestamista y físico conservado (por ejemplo, `Deteriorado`).
- No hay segundo reclamo ni repago posterior. La exposición congelada es contabilidad del reclamo, **no** dinero recuperado.

---

## 11. Cofirmas: verificar ingreso y retirar en garantía

Dos tareas necesitan dos firmas sobre **una misma operación**: `Verificar ingreso` y `Retirar parte del lote en garantía`.

1. Conectá la cuenta que inicia (por ejemplo, el verificador) y completá el formulario.
2. Tocá `Revisar datos antes de firmar`. La app indica: *"Falta co-firma: <cuentas>."*
3. Abrí el selector de cuentas de Freighter y elegí manualmente la cuenta cofirmante (el custodio).
4. Volvé a la app y tocá `Co-firmar con la cuenta activa`.
5. Volvé a la cuenta de firma final en Freighter y tocá `Firmar y enviar a Testnet`.

Ambas autorizaciones viajan en la **misma transacción**. Si cambiás de rol en el formulario no obtenés permisos, y si la cuenta activa no es una de las cofirmantes verás: *"La cuenta activa no es una de las cofirmantes requeridas."*

No hay una bandeja automática de solicitudes: la cofirma se hace cambiando de cuenta en el mismo navegador.

---

## 12. Permiso de pago, repagos y default

El repago tiene dos pasos porque el interés se devenga por tiempo de ledger: si autorizaras un monto exacto al simular, el interés podría cambiarlo antes de ejecutar.

1. **Dar permiso para el pago**: máximo en USDC de prueba y vencimiento en ledgers (100 ledgers en la demo).
2. **Pagar préstamo**: se cobra solo la deuda vigente, primero interés y después capital.
3. Si no vas a pagar el resto, **Quitar el permiso de pago**.

Notas:

- Un pago menor que el interés no reduce capital.
- Un exceso solicitado no se transfiere ni queda guardado en el vault.
- Si el activo rechaza la transferencia, toda la operación se revierte: no hay estado parcial.
- Después del reclamo no se admite otro repago por el protocolo.

---

## 13. Comprobantes (evidencia)

Cada afirmación física necesita un hash de evidencia de 64 caracteres hexadecimales.

### 13.1 Carpeta documental al registrar un lote

Cuando el recorrido de Cooperativa abre `Registrar lote`, la pantalla de Lotes muestra **«Preparar documentos de un lote: informe, secadero y seguro»** antes del formulario de firma.

1. Abrí la carpeta y cargá el **informe o foto de inspección de prueba**; es obligatorio. El comprobante de secadero y la póliza de seguro son opcionales y siempre sintéticos.
2. Si querés, escribí un alias ficticio para el secadero. No uses nombres reales, CUIT, CBU ni información comercial sensible.
3. Tocá `Guardar carpeta de comprobantes`. La app guarda cada archivo y un manifiesto que reúne sus hashes.
4. Tocá `Usar carpeta en la operación actual`. El SHA-256 del manifiesto pasa al campo de comprobante del registro; los nombres de archivo y el alias permanecen fuera de cadena.

Guardar una carpeta no firma el ingreso ni contrata un seguro. Solo deja preparada la evidencia sintética para la atestación posterior.

### 13.2 Guardar un archivo individual de prueba

1. Abrí **«Más detalles de la demo» → `Operaciones`** y buscá `Guardá un archivo de prueba`.
2. Elegí un archivo **sintético** de hasta 5 MiB. No incluyas datos personales, CBU, CUIT ni documentos comerciales reales.
3. Tocá `Guardar comprobante`. La app muestra el SHA-256 y el aviso *"No está firmada ni registrada en blockchain."*
4. Copiá el código con `Copiar código del comprobante` (o con `Usar comprobante en la operación actual`) y pegalo en la operación que vas a firmar.

Guardar el archivo **no** firma la inspección ni acredita el hecho físico: solo prueba que el archivo no cambió.

### 13.3 Resultado del guardado

| Mensaje | Significado |
|---|---|
| `Imagen guardada y pin IPFS verificado` | El proveedor confirmó la publicación y los bytes son idénticos. |
| `Imagen guardada localmente` | El archivo está en el servicio local; IPFS no está configurado o no se confirmó. |
| `El archivo quedó guardado localmente; no se pudo confirmar su publicación y recuperación en IPFS.` | Se intentó publicar y no se pudo verificar. |

Un CID o un hash calculado no publican los bytes: solo un pin confirmado permite decir que está en IPFS.

### 13.4 Fotografía de inspección (solo verificador)

1. Elegí una imagen **JPG, PNG o WebP** de hasta 5 MiB (el archivo debe ser realmente de ese formato).
2. Tocá `Autorizar con Freighter y guardar`: Freighter te pide firmar un permiso de carga (no mueve fondos).
3. El servidor verifica la firma, el origen y que la cuenta tenga el rol **Verifier** vigente.
4. Después hace falta **otra firma** para registrar el hecho en cadena: *"guardar un archivo no acredita un hecho físico."*

---

## 14. Consulta pública, historial y QR

En `/lots/<id>` cualquier persona puede leer, sin billetera:

- **Estado actual consultado**: estado físico, certificado, estado financiero y titular del certificado. Aclaración fija: *"Un certificado libre no rehabilita una mercadería deteriorada..."*
- **Historia del lote**: eventos del indexador con fecha, enlace a Stellar Expert, código de comprobante y descarga. Se informa la **cobertura de bloques**: si falta historial o hay una discontinuidad, la app lo dice y no reconstruye eventos desde el estado actual.
- **Comprobante vinculado**: la app descarga el archivo, calcula su SHA-256 y lo compara con el código registrado en el contrato antes de mostrarlo.
  - Coincide: `Integridad comprobada: el archivo coincide con el código registrado.`
  - No coincide: `El archivo recibido no coincide con el código registrado...`
  - No se puede recuperar: `No se pudo recuperar y comprobar el archivo...`
- **Compartir este lote**: enlace público y QR descargable en SVG (`yerbacapital-testnet-lot-<id>.svg`).
  - Si el enlace es `127.0.0.1` o `localhost`, la app avisa que solo abre en esa computadora y que hay que publicar la app para escanearlo desde un celular.
  - El QR identifica el registro digital; no certifica la mercadería.
- Si el enlace pertenece a **otros contratos**, la app no muestra esos datos como si fueran del mismo lote.

---

## 15. Mapa de inversores y simulador de pesos

### 15.1 Mapa ilustrativo (vista Prestamista)

Muestra localidades del NEA con oferta **ficticia** (Cooperativa Monte Verde, Secadero Tierra Roja, Depósito Las Palmeras). Las ubicaciones son orientativas y los kilos son ilustrativos: no provienen de los contratos. Aviso fijo: *"Ejemplos ficticios, sin ofertas de venta reales... La venta no está habilitada en el MVP."*

### 15.2 Simulador de conversión a pesos (vista Cooperativa)

Es una **simulación local** de una futura rampa tipo MoneyGram. No está conectada a MoneyGram, bancos ni un Anchor SEP-24; no mueve ni bloquea USDC, no emite órdenes y no permite cobrar pesos.

- Supuesto fijo del ejemplo: **1 USDC = 1.280 ARS**, antes de costos. No es una cotización.
- Importe hasta 1.000.000, con punto decimal y hasta 7 decimales.
- Destino: `Efectivo (simulación)` con una zona ilustrativa, o `Cuenta bancaria (simulación)` con una cuenta ficticia fija. No se ingresan CBU, alias ni datos reales.
- El resultado aclara que no se creó ninguna transacción, ni orden, ni código de retiro.

### 15.3 Casos de trazabilidad desde la landing

La landing ofrece dos casos navegables para explicar el sistema sin pedir una firma:

- **Lote demo 3 · Ciclo completo:** recorrido de verificación conjunta, certificado, valuación, fondeo, repago y liberación de garantía.
- **Lote demo 4 · Riesgo a la vista:** deterioro atestado, default y reclamo del certificado. El estado físico sigue deteriorado: el reclamo digital no entrega la yerba ni reemplaza al custodio o la vía legal.

Son recorridos sintéticos en Testnet. Sirven para revisar la separación entre estado físico, certificado y préstamo; no son una oferta de inversión ni evidencia de una operación comercial real.

---

## 16. Expediente del piloto

`/pilot` organiza acuerdos y documentos **sintéticos** del piloto con revisión por integrantes. No es un contrato legal ni habilita operaciones reales.

1. Prepará los accesos: `pnpm setup:local` y luego `pnpm setup:pilot`.
   - Crea los códigos de `editor-demo`, `reviewer-demo` y `observer-demo` en `.stellar/pilot-access.json` (ignorado por Git). No los imprime. Reiniciá el servicio después.
2. Entrá a `/pilot` con tu **código de integrante**. La sesión dura una hora.
3. Roles: `Edición` crea y edita acuerdos y adjuntos; `Revisión` revisa acuerdos de otra persona y puede pedir correcciones; `Solo lectura` consulta y descarga.
4. Cada acuerdo tiene categoría, estado (`Borrador`, `En revisión`, `Revisado`, `Bloqueado`), vigencia, checklist, pendientes, comentarios y adjuntos de hasta 5 MiB (máximo 20 por acuerdo).
5. Botones: `Actualizar expediente`, `Exportar metadatos e historial`, `Imprimir resumen / Guardar PDF`, `Cerrar sesión`.

Límites que la app repite: *"Revisado exige otro integrante con permiso de revisión. No implica firma, aprobación jurídica ni habilitación de un piloto real."* El historial registra identidad configurada y fecha del servidor; no es firma jurídica ni registro on-chain. Instrucciones completas en `app/PILOT.md` y `svc/PILOT.md`.

---

## 17. Mensajes frecuentes y cómo resolverlos

### 17.1 Billetera y red

| Mensaje | Qué hacer |
|---|---|
| `Instalá o desbloqueá Freighter para conectar una cuenta de Testnet.` | Instalá o desbloqueá la extensión y volvé a conectar. |
| `Cambiá Freighter a Stellar Testnet antes de firmar.` | Cambiá la red en la billetera; la app no firma en otra red. |
| `La cuenta cambió; reconectá antes de firmar.` | Volvé a conectar la cuenta correcta. |
| `La firma no corresponde a la cuenta conectada.` | Firmá con la cuenta que la app muestra como activa. |
| `Freighter no respondió. Revisá la extensión y volvé a conectar. No se envió ninguna transacción.` | Reintentá; no se envió nada. |

### 17.2 Errores del contrato

La app traduce los códigos del contrato. Los más frecuentes:

| Código | Mensaje | Qué hacer |
|---|---|---|
| 3 | `La cuenta no tiene el rol requerido.` | Pedile al admin que habilite el rol, o usá la cuenta correcta. |
| 4 | `Los roles del lote deben usar cuentas distintas.` | Usá cuentas distintas para custodio, verificador, valuador y solicitante. |
| 6 | `El estado físico o del certificado no permite esta acción.` | Consultá el estado del lote antes de reintentar. |
| 7 | `La humedad está fuera de las bandas admitidas.` | Corregí el valor con la medición del informe. |
| 8 | `Revisá el peso y el remanente mínimo.` | El peso debe ser positivo y dejar un remanente suficiente. |
| 12 | `El lote está deteriorado.` | El físico no se rehabilita en esta versión. |
| 13 | `La valuación venció; el price oracle debe actualizarla.` | Pedí una valuación nueva antes de fondear o retirar. |
| 14 | `El importe supera la capacidad del colateral.` | Bajá el importe o consultá el máximo del contrato. |
| 16 | `El estado del préstamo no permite esta acción.` | Verificá el estado financiero actual. |
| 17 | `Todavía no se cumple una condición de default.` | Esperá vencimiento + gracia, o registrá el deterioro. |
| 22 | `Ese retiro deja colateral insuficiente para la deuda.` | Retirá menos kilos. |
| 25 | `Todavía no se vinculó el vault.` | El despliegue no está completo: avisá al responsable. |

Cualquier código desconocido se muestra como `Error de contrato #<código>` con el hash de la transacción. No se oculta.

### 17.3 Servicios y datos

| Mensaje | Qué hacer |
|---|---|
| `No se pudo consultar Testnet. No hay datos de reemplazo simulados.` | Reintentá o revisá la conexión con el RPC de Testnet. |
| `Catálogo no disponible. Podés consultar registros por número; no se inventan solicitudes.` | Consultá un lote por número o reactivá el indexador. |
| `El historial no está disponible; no se infiere el estado del lote.` | Reactivá el indexador; el estado actual se consulta al contrato. |
| `No se pudo conectar con el servicio de evidencias. Podés volver a intentar.` | Verificá que `pnpm dev:svc` esté activo. |
| `El archivo supera los 5 MiB.` | Elegí un archivo más chico. |
| `La imagen cambió después de autorizarla. Volvé a firmar.` | No modifiques el archivo entre autorizar y subir. |
| `La autorización ya se utilizó o no pudo registrarse. Volvé a firmar.` | Volvé a firmar la autorización de carga. |
| `No se pudo conectar con el expediente compartido. No reenvíes una escritura sin consultar su estado.` | Revisá el servicio antes de reenviar. |

---

## 18. Qué no hace la app

Para evitar expectativas equivocadas:

- No hay **retiro total** del lote, ni **cambio de custodio**, ni **rehabilitación** de un lote deteriorado.
- No hay **transferencia libre** del certificado ni **venta con deuda**.
- No hay `Rechazar lote`, ni cambio de parámetros, ni pausa desde la interfaz: son operaciones administrativas fuera de esta UI.
- No hay **mainnet**: la app exige el RPC oficial de Testnet.
- No hay integración bancaria, off-ramp real, seguro, mercado secundario ni incorporación de inversores.
- No hay firmas automáticas: cada operación se aprueba en Freighter.

---

## 19. Buenas prácticas

- Usá **solo cuentas de Testnet** con datos sintéticos. Nunca cargues claves, frases de recuperación ni cuentas de mainnet.
- No pegues datos personales (nombres, CUIT/DNI, CBU, direcciones, teléfonos) en archivos, acuerdos ni formularios.
- Verificá el hash y el estado antes de firmar; revisá que la huella de la operación coincida con lo que querés hacer.
- Revocá los permisos de pago que no vas a usar.
- Si una operación queda pendiente, **consultá el hash** antes de reintentar.
- En una demo, contá primero qué resuelve la blockchain y después qué no.

---

## 20. Preguntas frecuentes

**¿Puedo usar cuentas propias?**
Sí, en Testnet. Pedile al admin que habilite los roles que correspondan y asegurate de tener XLM de prueba; para USDC, trustline y saldo de prueba.

**¿La app calcula la deuda o el máximo financiable?**
No. Consulta esos valores al contrato; no los recalcula en el navegador.

**¿Qué pasa si el lote se deteriora con un préstamo activo?**
El físico queda `Deteriorado` y el certificado sigue `En garantía`. Se bloquean fondeo y retiros, y se habilita el default. Un repago total libera el certificado pero **no** cura el deterioro.

**¿Reclamar el certificado me da la yerba?**
No. Transferís el derecho on-chain. La entrega o recuperación física requiere al custodio y un proceso legal.

**¿El simulador de pesos mueve dinero?**
No. Es un cálculo local con un supuesto fijo (1 USDC = 1.280 ARS).

**¿Por qué el historial público a veces está incompleto?**
Porque depende del indexador y de la retención del RPC. La app informa la cobertura y no inventa eventos.

**¿Por qué no puedo cargar comprobantes en la demo pública?**
Porque el servicio de evidencia solo corre en `127.0.0.1` y todavía no está publicado con HTTPS. Ver [production.md](production.md).

---

## 21. Referencias

- [README](../README.md): instalación, contratos, despliegue y verificación.
- [demo-script.md](demo-script.md): guion de la demo de 10 pasos, kit de datos y pruebas de errores.
- [evidence.md](evidence.md): IDs de contratos, hashes y transacciones de Testnet.
- [production.md](production.md): publicación de la web en Vercel.
- [contract-spec.md](contract-spec.md): especificación de los contratos.
- [legal-risk.md](legal-risk.md): límites legales y regulatorios.
- `app/PILOT.md` y `svc/PILOT.md`: expediente del piloto.

### Handoff

- Persona: Docs & Pitch
- Changed: `docs/manual.md`, `README.md`
- ABI change: no
- Tests: revisión documental contra rutas, recorridos guiados, formularios de evidencia, etiquetas y mensajes actuales de la app; `git diff --check` correcto.
- Evidence: rutas públicas de la demo en Vercel y contratos activos en [evidence.md](evidence.md).
- Next owner: equipo de demo — validar el manual en una ejecución real con Freighter y registrar la URL final.
- Open questions: alojamiento del servicio de evidencia/índice con HTTPS y volumen persistente; URL definitiva de la demo.
