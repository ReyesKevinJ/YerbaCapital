# YerbaCapital

Prototipo de financiamiento y trazabilidad para lotes de yerba canchada en estacionamiento, sobre Stellar/Soroban **Testnet**, para la NEA Tech Hackathon 2026.

**El token no es la yerba.** El certificado representa un derecho condicionado sobre un lote verificado y custodiado. La blockchain registra autoría e integridad; no garantiza existencia, calidad ni custodia física. Un default on-chain no recupera la mercadería: requiere al custodio y un proceso legal.

## Estado verificable

- `registry`: roles, atestaciones con evidencia, certificado por lote, masa, deterioro y gravamen. Estado físico y certificado independientes.
- `vault` 0.3: solicitudes, fondeo directo, interés simple, repagos parciales/totales, liberación, retiro gravado con control de LTV y default sin doble cobro.
- Dos contratos desplegados y vinculados en Testnet; IDs, revisiones y transacciones en [docs/evidence.md](docs/evidence.md). El USDC de demo es un activo propio, **no USDC de Circle**.
- Clientes de registry, vault y SAC generados desde sus interfaces; no hay una copia manual del ABI.
- App Next.js con evidencia sintética, consulta pública de estado/historial y operaciones firmadas mediante el adaptador Freighter. La co-firma de demo se recolecta cambiando de cuenta en la misma sesión, antes de enviar una única operación.
- Servicio local de evidencia SHA-256 e indexador persistente con deduplicación, cobertura y detección de discontinuidades.
- La aceptación real del recorrido completo en Freighter **todavía requiere una ejecución humana**. Las firmas de CLI y los tests con dobles de SDK no la sustituyen.

El primer despliegue detectó un repago total rechazado por el cambio de interés entre simulación y ejecución. [ADR-011](docs/adr/011-bounded-allowance-for-dynamic-repayment.md) registra la corrección con allowance acotada; ese despliegue anterior no debe usarse para la demo actual. No se implementó venta con deuda ni escrow.

## Ejecutar la app

Requisitos: Node.js 22 o superior, pnpm 8.10.2 y Python 3 para scripts de operaciones. Instalá dependencias y configurá el entorno privado:

```sh
pnpm install --frozen-lockfile
pnpm setup:local
pnpm build:clients
pnpm typecheck
pnpm lint
pnpm test
```

`setup:local` crea `.env` con una credencial aleatoria y permisos privados. No imprime la credencial ni sobrescribe archivos existentes. Si ya tenés `.env`, completalo desde `.env.example`. Los IDs del ejemplo corresponden al despliegue documentado; Testnet puede resetearse.

Para activar el protocolo en `.env`, configurá `NEXT_PUBLIC_CHAIN_ENABLED=true`. `false` mantiene disponible la carga de evidencia local. La integración exige el RPC oficial de Testnet y tres direcciones de contrato válidas y distintas. El cliente comprueba la revisión de vault antes de preparar operaciones.

En tres terminales distintas, desde la raíz:

```sh
pnpm dev:svc
```

```sh
pnpm dev:indexer
```

```sh
pnpm dev:app
```

Abrí **http://127.0.0.1:3000**. El servicio escucha en **http://127.0.0.1:3001**. Ambos usan loopback; esta app local no implementa usuarios ni permisos documentales por organización. Usá solo archivos sintéticos. Para producción local compilada: `pnpm build`, luego `pnpm --filter app start`, conservando servicio e indexador activos. Las variables `NEXT_PUBLIC_*` se fijan al compilar; recompilá si cambiás IDs.

El lanzador de Next.js carga el `.env` raíz. Desarrollo usa Webpack para evitar una recarga continua observada con las importaciones de clientes generados en Turbopack; la compilación de producción conserva el bundler predeterminado de Next. `EVIDENCE_STORAGE_DIR` e `INDEXER_STORAGE_DIR` se resuelven desde `svc/`. La credencial de evidencia solo circula entre servidores y nunca lleva prefijo `NEXT_PUBLIC_`. Ni el servicio ni la app guardan claves privadas de billetera.

## Operar con Freighter

Usá exclusivamente cuentas de Testnet fondeadas con XLM de prueba. Las cuentas que reciben o pagan USDC deben tener la trustline del emisor de demo y saldo de prueba; la app no crea trustlines ni acuña fondos automáticamente.

1. Conectá Freighter en Testnet y elegí la acción del rol. El contrato controla los permisos; seleccionar un rol en la app no lo concede.
2. Cargá evidencia sintética y copiá su hash al formulario. Completá los datos y prepará la operación: se simula antes de pedir firmas.
3. Para verificar ingreso o retirar colateral gravado, cambiá la cuenta activa en Freighter al custodio, co-firmá y volvé al firmante principal antes de enviar. Las dos firmas cubren la misma operación y evidencia.
4. Antes de repagar, elegí «Autorizar monto máximo de USDC para repago», revisá monto y vencimiento, y firmá. Luego prepará y firmá el repago. Se cobra solo hasta la deuda vigente. Revocá el permiso sobrante desde el selector o dejalo vencer; cancelar el segundo paso no revoca el primero.
5. La app declara éxito solo con confirmación `SUCCESS` y muestra Stellar Expert. Si hay timeout o fallo de transporte después del envío, consultá el hash pendiente: no se reenvía automáticamente.

El estado financiero se consulta al contrato, nunca se calcula en el navegador ni se infiere del indexador. Después de un reclamo, la exposición congelada es contabilidad del reclamo y no un segundo saldo cobrable. Ver [docs/demo-script.md](docs/demo-script.md).

## Contratos reproducibles

Herramientas fijadas: **Rust 1.92.0**, **soroban-sdk 29.0.1**, **Stellar CLI 28.1.0**, **Stellar JS SDK 16.0.1**. Rust se instala con [rustup](https://rustup.rs/); la CLI, desde su [release oficial](https://github.com/stellar/stellar-cli/releases/tag/v28.1.0). Agregá sus ejecutables a `PATH`. `rust-toolchain.toml` fija target `wasm32v1-none`, rustfmt y Clippy. La CLI rechaza Rust 1.91.0 por un problema conocido del compilador.

```sh
bash scripts/check-contracts.sh
bash scripts/bindings.sh --check
```

Primero se compila registry, cuyo Wasm importa vault; después se ejecutan formato, Clippy, tests y la compilación de vault. Los artefactos quedan en `target/wasm32v1-none/release/`. Hay **36 pruebas de contratos**, incluidas firmas ausentes, co-firmas exactas, masa, valuación, rollback, balances del SAC y una autorización de repago que sigue válida al avanzar el tiempo del ledger.

Para regenerar clientes tras cambiar el ABI:

```sh
bash scripts/bindings.sh
pnpm install --frozen-lockfile
pnpm build:clients
```

La regeneración reemplaza los directorios generados, incluido su `node_modules`; por eso se reinstala después. No los edites a mano. El cliente SAC se genera desde una captura de la interfaz builtin exportada por CLI, cuya procedencia está en [scripts/abi/README.md](scripts/abi/README.md). El contenedor de interfaz no es un contrato desplegable.

## Desplegar y probar en Testnet

Con el árbol confirmado en Git y los Wasm compilados:

```sh
bash scripts/deploy.sh
pnpm build:clients
bash scripts/seed-demo.sh
```

El despliegue solo acepta el RPC oficial de Testnet, genera las siete identidades de demo mediante Stellar CLI en `.stellar/stellar/`, reutiliza el SAC del mismo emisor si está verificado y despliega/vincula registry y vault. Registra los hashes confirmados por RPC en `docs/evidence.md`. El manifiesto por par de hashes Wasm permite reanudar la misma ejecución; `.stellar/` contiene claves locales privadas y queda ignorado.

El seeder usa datos sintéticos y el manifiesto más reciente. Ejecuta trustlines, fondos propios de prueba, roles, dos lotes de 12.000 kg, verificación con co-firma, fondeo, inspección, autorización y repagos, retiro parcial y deterioro/default/reclamo. Para co-firmas usa clientes generados y entrega las claves de demo al proceso hijo únicamente en memoria; la CLI por sí sola no descubre firmantes que no figuran entre los argumentos. Nunca imprime ni versiona las claves.

Si un envío queda sin resolver, el seeder conserva el paso pendiente y se niega a repetirlo; inspeccioná RPC antes de continuar. Después del despliegue actualizá los IDs y el primer ledger en `.env`/`.env.example`, regenerá clientes y usá un directorio nuevo de indexador por despliegue. No se modifican automáticamente esos archivos privados. Ante un reset de Testnet, archivá el manifiesto anterior, creá/fondeá nuevas identidades y repetí el despliegue; no presentes la historia anterior como estado actual.

## Evidencia e historial

- `POST /api/evidence`: bytes `application/octet-stream`, origen local autorizado, máximo 5 MiB. Devuelve SHA-256 y URI relativa.
- `GET /api/evidence/<sha256>`: descarga exacta; detecta alteraciones.
- `GET /api/lots/<id>/history`: historial público derivado con contrato, transacción, ledger y cobertura; no determina deuda ni permisos.
- `GET /api/system`: comprueba evidencia y, si la cadena está habilitada, consulta el vínculo y activo configurados mediante clientes generados. No certifica que exista una billetera conectada.
- `GET /health` del servicio solo comprueba ese proceso. Sus rutas `/evidence` y `/lots/.../history` requieren la credencial privada del gateway.

El indexador guarda eventos confirmados y su avance por escritura atómica. `INDEXER_FROM_LEDGER` debe cubrir el despliegue. Si el checkpoint quedó fuera de la retención de RPC, informa la discontinuidad: no inventa una historia a partir del estado actual. Las evidencias de la demo quedan en `.evidence/` por hash; cualquier tercero que reciba los bytes puede recomputarlo. Para una pasada del indexador: `pnpm --filter @yerbacapital/evidence index --once`.

```sh
pnpm --filter @yerbacapital/evidence evidence hash /ruta/evidencia.txt
pnpm --filter @yerbacapital/evidence evidence verify /ruta/evidencia.txt HASH_SHA256
```

## Verificación

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
bash scripts/check-contracts.sh
bash scripts/bindings.sh --check
```

Hay 15 pruebas de app/servicio. Con los puertos 3000/3001 libres, el recorrido de evidencia local se prueba en móvil y escritorio:

```sh
pnpm --filter app exec playwright install chromium
pnpm test:e2e
# macOS con Chrome instalado:
PLAYWRIGHT_CHROME_CHANNEL=chrome pnpm test:e2e
```

Estas cuatro pruebas de navegador verifican bytes, teclado, límites y recuperación de errores con la integración on-chain desactivada explícitamente. No certifican firmas reales de Freighter. Con el seeder completado y los tres servidores activos, `PLAYWRIGHT_CHROME_CHANNEL=chrome pnpm --filter app test:testnet` ejecuta otras dos pruebas de consulta pública real en Testnet (móvil/escritorio), sin billetera. Capturas y trazas quedan en `app/test-results/`, fuera de Git. GitHub Actions comprueba Rust, Wasm, consistencia de bindings, TypeScript, lint, tests, build y navegador.

## Límites y continuidad

[AGENTS.md](AGENTS.md) define principios y responsabilidades; [arquitectura](docs/architecture.md), [especificación 0.3.0](docs/contract-spec.md), [evidencia](docs/evidence.md) y [handoff](docs/handoff.md) separan diseño, implementación y validación. Toda lógica financiera y de permisos pertenece a los contratos. El índice y la app solo facilitan consulta y firma.

Solo Testnet, sin fondos reales ni incorporación de inversores. No constituye oferta de inversión ni asesoramiento legal, financiero o tributario. Cualquier uso real requiere estructuración legal, evaluación de PSAV/CNV y AML/CFT, custodia, seguros, auditorías y cumplimiento cambiario/tributario aplicable. No hay integración bancaria, off-ramp, seguro, mercado secundario ni venta con deuda.
