# Notas de entrega de la preparación del piloto

## Handoff — Configuración y operación

- Persona: DevOps / Release Engineer
- Changed: scripts/setup-pilot.mjs, .env.example, package.json; configuración privada local .env y .stellar/pilot-access.json (ignoradas)
- ABI change: no
- Tests: node --check scripts/setup-pilot.mjs; pnpm setup:pilot ejecutado y repetido sin rotar credenciales; copia local completa creada y verificada en revisión 6
- Evidence: .evidence/pilot-backups/shared-initial-20261016 (local, ignorable, sin códigos de acceso); servidores reiniciados; /api/system devuelve testnet_ready
- Next owner: responsable del entorno — distribuir privadamente códigos sintéticos; definir destino privado externo y periodicidad de backup antes de una etapa remota
- Open questions: alojamiento, proveedor de identidad, conservación y destino externo de backups; ninguna integración real fue contratada

## Handoff — Documentación de uso

- Persona: Docs & Pitch
- Changed: README.md (acceso al expediente y enlaces de operación)
- ABI change: no
- Tests: enlaces locales revisados y git diff --check passing
- Evidence: app/PILOT.md y svc/PILOT.md describen alcance local, controles y recuperación
- Next owner: equipo — discutir expediente sintético y validaciones jurídicas pendientes
- Open questions: quién representa a cada parte y qué firma/documento necesita el instrumento jurídico elegido
