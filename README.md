# YerbaCapital

Base ejecutable de un protocolo de financiamiento y trazabilidad para lotes de yerba canchada durante su estacionamiento, pensado para Stellar/Soroban Testnet y el NEA Tech Hackathon 2026.

**El token no es la yerba.** El certificado representa un derecho condicionado sobre un lote verificado y custodiado. La blockchain registra autoría e integridad; no garantiza existencia, calidad ni custodia física.

## Qué funciona

- App Next.js con carga de archivos sintéticos y descarga de los bytes originales.
- Servicio HTTP de evidencia con SHA-256, almacenamiento local por hash y acceso mediante credencial privada.
- Detección de evidencia alterada, límites de carga y escritura atómica frente a cargas simultáneas.
- Configuración compartida desde `.env`, restringida a Testnet y al servicio local.
- Estado operativo en `/api/system`, separado de cualquier estado financiero.
- Pruebas unitarias, de integración HTTP y de navegador en móvil y escritorio.
- CLI original para calcular y verificar hashes sin usar la app.

El recorrido implementado es **app → API local → servicio de evidencia → almacenamiento → descarga verificable**. Guardar un archivo no constituye una atestación firmada ni un registro on-chain.

## Qué sigue pendiente

Contratos `registry` y `vault`, clientes generados, indexador de eventos, firma Freighter y transferencias de USDC de prueba. No hay contratos desplegados, lotes on-chain ni un flujo financiero operativo. La configuración exige `NEXT_PUBLIC_CHAIN_ENABLED=false`; llenar IDs no habilita operaciones inexistentes.

Las propuestas de venta por etapas y separación del deterioro/gravamen siguen pendientes en [la arquitectura](docs/architecture.md). Antes de implementar contratos corresponde cerrar la especificación de §17. No se agregan contratos vacíos, clientes manuales ni datos simulados presentados como confirmados.

## Ejecutar desde cero

Requisitos: Node.js 22 o superior y pnpm 8.10.2.

```sh
pnpm install --frozen-lockfile
pnpm setup:local
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`setup:local` crea `.env` con una credencial aleatoria de acceso a evidencia y permisos privados. No imprime la credencial ni sobrescribe un `.env` existente. Si ya existe, completá los valores faltantes usando `.env.example`. El archivo y las evidencias quedan fuera de Git.

En dos terminales distintas, desde la raíz:

```sh
pnpm dev:svc
```

```sh
pnpm dev:app
```

Abrí **http://127.0.0.1:3000**. El servicio escucha en **http://127.0.0.1:3001**. Ambos procesos se limitan a loopback. Esta base es para desarrollo local con archivos sintéticos; el gateway de la app no implementa usuarios ni control documental por organización y no debe publicarse como un servicio de evidencia privada.

El lanzador de Next.js carga el `.env` raíz antes de iniciar su proceso. El proceso independiente de `svc` lo carga explícitamente. El directorio `EVIDENCE_STORAGE_DIR=../.evidence` se resuelve desde `svc/`, porque ese es el directorio del comando del workspace. La clave de acceso solo circula entre procesos del servidor; no lleva prefijo `NEXT_PUBLIC_`.

Para ejecutar la app compilada: primero `pnpm build`, después `pnpm --filter app start`, manteniendo el servicio de evidencias activo.

## API local

- `GET /api/system`, en la app: estado de configuración y disponibilidad real del servicio; marca contratos, indexador y Freighter como pendientes. No consulta ni certifica conectividad RPC.
- `POST /api/evidence`, en la app: recibe bytes con contenido `application/octet-stream`, origen del mismo sitio y máximo 5 MiB. Devuelve hash y URI de descarga del gateway.
- `GET /api/evidence/<sha256>`, en la app: descarga los bytes comprobados por el servicio.
- `GET /health`, en el servicio: confirma únicamente que el proceso está disponible.
- `POST /evidence` y `GET /evidence/<sha256>`, en el servicio: requieren `Authorization: Bearer <EVIDENCE_ACCESS_TOKEN>`. Una carga devuelve `{ sha256, uri }`; el URI es relativo al servicio y no es una dirección pública de blockchain.

La credencial HTTP protege el almacenamiento local; no concede roles del protocolo. El servicio no firma, calcula deuda, registra atestaciones en cadena ni mueve fondos. No se habilita CORS público. Las evidencias se recuperan como descargas de bytes, sin ejecutar su contenido.

## Pruebas

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Para pruebas de navegador, con `.env` ya configurado y los puertos 3000/3001 libres:

```sh
pnpm --filter app exec playwright install chromium
pnpm test:e2e
```

En macOS también podés usar Chrome instalado:

```sh
PLAYWRIGHT_CHROME_CHANNEL=chrome pnpm test:e2e
```

Playwright inicia y cierra sus propios procesos. Prueba carga, descarga exacta, validación, recuperación de un error de carga simulado, acceso por teclado y ausencia de desbordamiento horizontal en móvil/escritorio. El camino exitoso usa el servicio y almacenamiento reales locales; estas pruebas no validan contratos, Freighter ni Testnet. Las capturas y trazas se guardan en `app/test-results/`, fuera de Git.

GitHub Actions ejecuta instalación reproducible, tipos, lint, pruebas, compilación y navegador. Su ejecución remota queda pendiente del próximo push.

## CLI de evidencia

Después de compilar, con un archivo sintético local:

```sh
pnpm --filter @yerbacapital/evidence evidence hash /ruta/evidencia.txt
pnpm --filter @yerbacapital/evidence evidence verify /ruta/evidencia.txt HASH_SHA256
```

Coincidencia: código 0. Diferencia, entrada inválida o error de lectura: código 1. El hashing local no requiere billetera, red ni `.env`.

## Organización y continuidad

- `AGENTS.md`: principios, personas, fronteras y baseline del protocolo.
- `app/src/app/`: entrada Next.js y gateway HTTP local.
- `app/src/components/`: interfaz mínima de evidencia.
- `app/src/lib/evidence/`: transporte servidor a servicio, con credencial privada.
- `app/src/lib/stellar/`: configuración de Testnet y bloqueo de integración on-chain hasta contar con clientes generados.
- `svc/src/config/`: configuración operativa del servicio.
- `svc/src/http/`: transporte HTTP; no contiene lógica financiera.
- `svc/src/storage/`: evidencia local direccionada por contenido.
- `svc/src/evidence.ts`: hashing y verificación usados por la CLI.
- `scripts/setup-local.mjs`: preparación privada de configuración local.
- `scripts/run-app.mjs`: carga del entorno compartido y arranque de Next.js.
- `docs/architecture.md`: arquitectura objetivo; no sustituye la especificación de implementación.
- `docs/contract-spec.md`: baseline preliminar que el Contract Engineer debe conciliar antes del código financiero.
- `docs/handoff.md`: tareas por persona, verificaciones y próximos responsables.

Los futuros directorios `contracts/registry` y `contracts/vault` pertenecerán a Contract Engineer. `packages/*-client` se creará exclusivamente por generación desde contratos; no existe una interfaz escrita a mano que la app pueda confundir con la real. Las operaciones futuras deberán usar esa integración compartida, con permisos y cálculos autoritativos en contratos.

## Límites del prototipo

Solo Testnet, sin fondos reales ni incorporación de inversores. No constituye una oferta de inversión ni asesoramiento legal, financiero o tributario. Cualquier uso real requiere evaluación y estructuración legal, cumplimiento regulatorio aplicable, custodia, KYC/AML, seguros y auditorías. Un default on-chain no equivale a recuperar físicamente la yerba: eso requiere al custodio y un procedimiento legal.
