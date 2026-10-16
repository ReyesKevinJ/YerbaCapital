# Integración del dashboard recibido

Persona: App Engineer. Fuente: yerbacapital-mvp.rar, entregado por el usuario el 16/10/2026. La referencia es su página principal y estilos, no su estado de negocio.

Se integró la estructura visual de barra lateral, navegación, tarjetas, tablas, verificación y actividad. Se usa lucide-react 0.468.0, la misma versión de referencia, con pnpm y el stack Next/React vigente del repositorio. No se importaron node_modules, .next, claves, Supabase ni su API de lotes. Las tipografías usan el sistema local, sin descargar fuentes externas.

## Fuentes de datos y acciones

- Registry/vault se consultan mediante app/src/lib/stellar/query.ts y los clientes generados existentes. No se escriben tipos contractuales a mano.
- La selección inicial es lotes 1/2 y préstamos 1/2 del guion sintético. Se pueden consultar otros IDs (hasta 12 por tipo); no es un inventario global ni un catálogo exhaustivo de solicitudes.
- Los contadores muestran solo resultados consultados. No se calcula deuda, interés, haircut ni LTV en el dashboard. La deuda se pide al vault; la exposición Liquidated se identifica como no cobrable nuevamente por el protocolo.
- Los estados físico y del certificado tienen columnas distintas. Los estados financieros pertenecen a los préstamos. No hay cifras ARS, perfiles, solicitudes ni eventos ficticios de reemplazo.
- La actividad usa el indexador, con enlaces de transacción. Lecturas fallidas/cobertura incompleta se muestran y no se reemplazan con eventos inventados.
- Registrar lote, solicitar, fondear, repagar e inspeccionar preparan la operación en ProtocolWorkbench. La simulación, autorización de Freighter y envío explícito siguen por invoke.ts; no se firma ni envía al navegar.
- La consola se conserva montada para no perder una operación pendiente al cambiar de sección. Un pedido de cambiar acción mientras hay una operación en curso se rechaza. El contrato sigue decidiendo permisos.
- El expediente /pilot y su versión anterior /pilot/local permanecen disponibles. La carga de evidencia sintética mantiene su servicio y API existentes.

## Pruebas y límites

La navegación off-chain y los flujos de evidencia/piloto se prueban con los servidores de test. La suite opt-in test:testnet lee los lotes confirmados 1/2 y sus historiales y prueba billetera ausente en escritorio/móvil; no equivale a una firma humana de Freighter.

La UI continúa local y Testnet. La integración no cambia ABI ni necesita desplegar contratos de nuevo. No se conectó el Supabase del archivo porque no puede ser autoridad financiera ni reemplazar los contratos. El catálogo completo requiere una capacidad explícita del indexador y un trabajo separado de Oracle Engineer.

### Handoff

- Persona: App Engineer
- Changed: app/src/features/dashboard/**, app/src/app/{page,layout}.tsx, app/src/components/protocol-workbench.tsx, app/package.json, pnpm-lock.yaml, app/e2e/{dashboard,testnet}.spec.ts, app/test/dashboard.test.ts, app/FRONTEND-INTEGRATION.md
- ABI change: no
- Tests: typecheck, lint y build passing; 13 pruebas de app, 14 de navegador y 2 Testnet read-only passing (escritorio/móvil)
- Evidence: capturas desktop/mobile en app/test-results (ignoradas), consultas reales a contratos; sin firma humana nueva
- Next owner: App Engineer — aceptación visual y firma real de Freighter; Oracle Engineer — catálogo completo si el equipo lo prioriza
- Open questions: ninguna para usar el dashboard local; alojamiento privado y aceptación humana siguen pendientes
