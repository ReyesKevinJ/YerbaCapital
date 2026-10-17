# Publicación de YerbaCapital en Vercel

Esta guía publica la aplicación web de YerbaCapital en una cuenta personal de Vercel. No requiere crear un equipo: al importar el repositorio, elegí el alcance personal de la cuenta.

El proyecto sigue siendo una demo de Stellar Testnet con datos sintéticos. No cargar claves, frases de recuperación, cuentas Mainnet ni fondos reales.

## Qué publica Vercel

Vercel publica `app/`: la landing, los dashboards, la consulta pública y las rutas API de Next.js. Las firmas se realizan en la billetera Freighter del navegador y las transacciones van a Stellar Testnet.

El directorio `svc/` no debe ejecutarse en Vercel como sustituto de un servicio persistente. Allí viven el almacenamiento de evidencia y el indexador; ambos requieren volumen persistente y un proceso que siga leyendo eventos. Para una demo pública completa, se los debe alojar en un servicio Node con disco persistente y HTTPS, y luego apuntar la web a ese servicio. Vercel por sí solo permite publicar la interfaz y las lecturas on-chain, pero no transforma `svc/` en infraestructura persistente.

## 1. Antes de importar

1. Confirmá que `main` está actualizado en GitHub.
2. Creá una cuenta personal en Vercel o ingresá con GitHub.
3. En Vercel, elegí **Add New → Project → Import Git Repository** y seleccioná `ReyesKevinJ/YerbaCapital`.
4. Elegí el alcance personal de la cuenta. No hace falta crear un team.
5. En **Root Directory**, seleccioná `app`.
6. Vercel detectará Next.js. Conservá los comandos definidos en `app/vercel.json`:
   - Install: `pnpm install --frozen-lockfile`
   - Build: `pnpm --dir .. build:clients && pnpm build:host`
   - Output: `.next`

No modificar los IDs de los contratos: corresponden al despliegue activo de Testnet documentado en `docs/evidence.md`.

## 2. Variables de entorno de la web

En **Settings → Environment Variables**, agregá estas variables para `Production` y `Preview`. Las variables `NEXT_PUBLIC_*` son visibles en el navegador por diseño: contienen solo red Testnet e IDs públicos, nunca secretos.

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_CHAIN_ENABLED` | `true` |
| `NEXT_PUBLIC_REGISTRY_ID` | `CBS7LFX54UPME7UU4NUZ2UKM5XL5KBMUWIYXW6SNSZKMORZJ7UAEQNN2` |
| `NEXT_PUBLIC_VAULT_ID` | `CAUF5CYPJXY2HUBY2XI67QY55A5QESGCKPOV664Q3JMDVG7URZWDH32U` |
| `NEXT_PUBLIC_USDC_ID` | `CCY7HWQXSH7PL2NZHLLOHKXY2IOGLAIQLZKF7WAHYZQNN2NAJGIDKEJM` |

Con esas seis variables se habilitan las consultas y firmas de la demo sobre Stellar Testnet. Nunca usar valores Mainnet.

## 3. Evidencia e historial: requisito para una demo completa

La carga de evidencia, el dossier del piloto y el historial indexado necesitan un servicio externo para `svc/`. Prepará allí estas variables privadas:

| Variable | Valor esperado |
|---|---|
| `NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
| `STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_REGISTRY_ID` | ID público del registry de la tabla anterior |
| `NEXT_PUBLIC_VAULT_ID` | ID público del vault de la tabla anterior |
| `INDEXER_FROM_LEDGER` | `5220046` o un ledger anterior al despliegue activo |
| `INDEXER_STORAGE_DIR` | Ruta de un volumen persistente, por ejemplo `/data/indexer` |
| `EVIDENCE_STORAGE_DIR` | Ruta de un volumen persistente, por ejemplo `/data/evidence` |
| `EVIDENCE_ACCESS_TOKEN` | Secreto aleatorio de al menos 32 caracteres, distinto por entorno |

Una vez exista ese servicio HTTPS, la web necesita recibir su URL y el mismo `EVIDENCE_ACCESS_TOKEN` como variables privadas. La implementación actual valida explícitamente un origen local y un servicio en `127.0.0.1`; por eso **no se debe inventar una URL remota ni declarar la carga de evidencia como operativa** hasta que el equipo implemente y pruebe la configuración de transporte para HTTPS. La variable `PINATA_JWT`, si se usa, también es privada y se carga únicamente en el entorno servidor; no se versiona ni se expone con `NEXT_PUBLIC_`.

Para una presentación inmediata, la web puede desplegarse con la funcionalidad on-chain de Testnet. Informá que el almacenamiento de evidencia y el indexador de producción siguen pendientes si el servicio externo no está publicado.

## 4. Deploy y verificación

1. Pulsá **Deploy**. El primer deploy usará el commit actual de `main`.
2. Abrí la URL `https://<nombre-del-proyecto>.vercel.app`.
3. Confirmá que la landing carga y que `/dashboard`, `/investors` y `/lots/3` responden.
4. Instalá Freighter en un navegador de escritorio, elegí Testnet y conectá una cuenta de prueba. Nunca importes una clave en la web.
5. Consultá un lote público y comprobá que los enlaces de Stellar Expert refieran a Testnet.
6. Probá una simulación antes de firmar. Solo firmá transacciones sintéticas que reconozcas en Freighter.

No se considera listo el recorrido completo hasta verificar desde la URL pública: lectura de historial desde el indexador, carga de evidencia con hash reproducible y una firma Freighter de Testnet. Registrá el resultado y la URL en `docs/evidence.md`.

## 5. Actualizaciones posteriores

Cada `git push origin main` crea un nuevo deploy de producción. Los Pull Requests generan previews si el repositorio queda conectado a Vercel. Antes de promover una modificación, ejecutá localmente:

```sh
pnpm --filter app typecheck
pnpm --filter app lint
pnpm --filter app test
pnpm --filter app build
```

No redeployar contratos para publicar la web. Si cambian contrato, ABI, IDs o eventos, seguir el protocolo de interfaz de `AGENTS.md` antes de actualizar las variables de Vercel.

## Checklist de entrega

- [ ] Cuenta personal de Vercel conectada al repositorio.
- [ ] Root Directory = `app`.
- [ ] Seis variables `NEXT_PUBLIC_*` de Testnet cargadas en Production y Preview.
- [ ] URL de Vercel abierta en incógnito y rutas principales verificadas.
- [ ] Freighter probado en Testnet con cuentas sintéticas.
- [ ] Servicio `svc/` e indexador alojados con HTTPS y volumen persistente, o limitación comunicada para la demo.
- [ ] Secretos cargados solo en el proveedor; ningún `.env.production` ni token subido a Git.

### Handoff

- Persona: DevOps / Release Engineer
- Changed: `docs/production.md`, `README.md`
- ABI change: no
- Tests: build de Vercel local (`pnpm --dir app exec sh -c 'pnpm --dir .. build:clients && pnpm build:host'`) → exitoso
- Evidence: contratos activos y hashes de demo en `docs/evidence.md`
- Next owner: compañero con cuenta personal de Vercel — importar repositorio, cargar las seis variables públicas y desplegar `app`
- Open questions: hosting persistente y adaptación HTTPS para `svc/`/evidencia; ninguna clave se debe compartir en el repositorio
