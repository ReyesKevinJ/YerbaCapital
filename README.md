# YerbaCapital

Base inicial de un protocolo de financiamiento y trazabilidad de lotes de yerba canchada durante su estacionamiento, pensado para Stellar/Soroban Testnet y el NEA Tech Hackathon 2026.

Un recibo representa un derecho condicional sobre un lote verificado y custodiado. La blockchain registra autoría e integridad de registros; no garantiza existencia, calidad ni custodia física de la yerba.

## Alcance de este primer commit

Incluye las instrucciones en `AGENTS.md`, la especificación de contratos, el workspace TypeScript, CI y una herramienta local que calcula y verifica SHA-256 sobre los bytes exactos de un archivo. No sube archivos, firma attestaciones ni realiza transacciones.

Pendientes: contratos `registry` y `vault`, clientes generados, web Next.js, Freighter, servicio HTTP de evidencias e indexador. No hay contratos desplegados ni un flujo financiero operativo.

## Ejecutar desde cero

Requisitos: Node.js 22 o superior y pnpm 8.10.2.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Con un archivo local de evidencia sintética (reemplazá la ruta y el hash):

```sh
pnpm --filter @yerbacapital/evidence evidence hash /ruta/evidencia.txt
pnpm --filter @yerbacapital/evidence evidence verify /ruta/evidencia.txt HASH_SHA256
```

Una coincidencia termina con código 0; diferencias, entradas inválidas y errores de lectura terminan con código 1. El hash verifica integridad, no la veracidad de lo documentado. No uses datos reales ni agregues evidencias privadas al repositorio.

La utilidad local no necesita `.env`, billetera ni conexión de red. `.env.example` documenta la configuración futura de Testnet; sus IDs vacíos no representan despliegues.

## Organización y continuidad

- `svc/`: herramienta local de evidencia; base del futuro servicio de attestaciones.
- `docs/contract-spec.md`: espejo de §7 de `AGENTS.md`, todavía sin ABI implementada.
- `docs/architecture.md`: responsabilidades y límites de la primera entrega.
- `docs/handoff.md`: tareas separadas por persona y validación.
- `docs/evidence.md`: estado de despliegues y transacciones.

Leé `AGENTS.md` antes de contribuir. Cada tarea debe respetar su persona; los clientes de contratos se generan y la lógica financiera pertenece a los contratos. Los commits usan Conventional Commits en inglés.

## Límites del prototipo

Solo Testnet, sin fondos reales ni incorporación de inversores. No constituye una oferta de inversión ni asesoramiento legal, financiero o tributario. Cualquier uso real requiere evaluación y estructuración legal, cumplimiento regulatorio aplicable, custodia, KYC/AML, seguros y auditorías. Un default on-chain no equivale a recuperar físicamente la yerba: eso requiere al custodio y un procedimiento legal.
