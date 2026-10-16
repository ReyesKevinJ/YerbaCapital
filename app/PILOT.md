# Acuerdos y documentación del piloto — demostración compartida

Persona: App Engineer. http://127.0.0.1:3000/pilot.

## Configuración local

Ejecutá `pnpm setup:local` solo si no existe .env y luego `pnpm setup:pilot`. Este último conserva integrantes existentes; para un entorno nuevo genera editor-demo, reviewer-demo y observer-demo. Los códigos quedan en `.stellar/pilot-access.json`, ignorado por Git, y la configuración privada en .env. Abrí ese archivo local para copiar el token del integrante, sin compartirlo en el repositorio. Reiniciá el servicio después de configurar o rotar accesos.

## Operación

Ingresá con el código privado de un integrante sintético, configurado por el responsable del entorno. No es una clave de Freighter ni concede roles on-chain. La sesión dura una hora, mediante cookie HttpOnly cifrada y SameSite Strict. La configuración solo admite HTTP loopback; no se declara lista para exposición pública ni para documentos reales.

Editor crea y modifica acuerdos y adjunta archivos de hasta 5 MiB. Reviewer puede editar y revisar un acuerdo InReview de otro editor, sin cambiar su contenido al revisarlo. Observer consulta y descarga. El servidor controla permisos; esconder controles en la UI es solo conveniencia. Una nueva edición invalida una revisión anterior. El estado Reviewed no es firma jurídica ni dictamen de viabilidad.

El expediente organiza validación comercial, legal, custodia, seguro, proveedor monetario y fee. Cada escritura conserva revisión e identidad configurada, fecha de servidor y un evento de negocio documental. Ante conflicto, actualizar y volver a abrir el acuerdo. No se reintentan escrituras automáticamente. Si una subida quedó sin vincular, al actualizar aparece para agregarla a un acuerdo sin subir nuevamente sus bytes.

Metadatos, historial y documentos están en el servidor local de evidencia; distintos navegadores conectados a esa misma instancia ven el mismo expediente al actualizar. No se habilitó acceso remoto/LAN. Cada documento se descarga por un endpoint con membresía; los nuevos archivos privados no usan el endpoint público del prototipo de evidencia.

## Exportación y copias anteriores

Exportar metadatos e historial genera un JSON sin códigos de acceso ni archivos. La copia completa del servicio debe incluir documentos y revisiones; ver svc/PILOT.md. No hay restauración arbitraria desde el navegador: sobrescribiría la autoría y la historia de revisión.

El prototipo anterior permanece en /pilot/local. No se borró su localStorage. Exportá la copia anterior, revisala y recreá los acuerdos/adjuntos pertinentes en el expediente compartido; no se confía en estados Reviewed ni hashes importados del navegador como revisión independiente o pertenencia al almacén privado. Los documentos antiguos permanecen sujetos a las reglas del prototipo original.

## Para una etapa real

AGENTS.md exige mantener este proyecto en Testnet y sin documentos reales. Un piloto real necesita una etapa separada con identidad y representación verificadas, proveedor de acceso, infraestructura privada con HTTPS, aislamiento de organizaciones, conservación/borrado acordados, backups externos y recuperación probada, monitoreo y revisión legal de firmas. No se contrató proveedor ni se afirma cumplimiento normativo.

## Verificación

- pnpm --filter app test: unidades, incluidos vencimiento, alteración y rotación de sesión.
- pnpm --filter app exec playwright test --config playwright.pilot.config.ts: app y servicio locales activos, configuración privada .env.
- pnpm --filter app test:e2e: servidores aislados y miembros sintéticos de test generados por configuración.
- pnpm --filter @yerbacapital/evidence test: autorización real del servicio, revisión cruzada, conflictos, persistencia y privacidad de documentos.

### Handoff

- Persona: App Engineer
- Changed: app/src/features/pilot/**, app/src/lib/pilot/**, app/src/app/api/pilot/**, app/src/app/pilot/**, app/e2e/pilot*.spec.ts, app/test/pilot*.test.ts, app/playwright*.ts, app/PILOT.md
- ABI change: no
- Tests: 11 pruebas de app y 12 de navegador (escritorio/móvil) passing; typecheck, lint y build passing
- Evidence: suite HTTP y capturas locales de Playwright con datos sintéticos
- Next owner: DevOps — configurar integrantes de demo y operaciones de backup local; Docs & Pitch — discutir flujo de revisión y validación jurídica fuera de la demo
- Open questions: identidad y alojamiento de una etapa real, responsable de conservación y destino externo de backups

## Checklist, vigencias y conversación

Cada categoría recibe una guía de preparación desde el servicio. Los ítems tienen responsable, fecha objetivo opcional y marca de avance. No son una lista exhaustiva de requisitos jurídicos. El servidor exige todos completos antes de una nueva revisión. Los acuerdos anteriores conservan su historia; deben incorporar el checklist cuando se editen para una nueva revisión.

La fecha de vigencia es opcional y declarada por el equipo. Al actualizar se muestran vencimientos pasados o dentro de los próximos 14 días y pendientes con fecha próxima/vencida. Las fechas se interpretan como días UTC del servidor; el día de vencimiento todavía se admite. Una revisión histórica vencida sigue en la historia pero no cuenta como cobertura revisada actual. No se envían mails ni se cambian estados automáticamente al pasar la fecha.

Editor/reviewer agregan comentarios atribuibles a su sesión, sin editar comentarios históricos. Reviewer puede solicitar una corrección: queda registrada y el acuerdo vuelve a Draft, sin reviewedBy. La respuesta o una nueva entrega requieren otra revisión independiente.

Cada archivo nuevo del acuerdo agrega una versión de su documentación con hash, autor de carga y fecha. Se distinguen Draft, Submitted y Reviewed. Se conservan los bytes y versiones anteriores; no se pueden quitar por una edición. Las versiones representan entregas cronológicas de documentación del acuerdo, no una firma ni una fusión automática de documentos.

El botón “Imprimir resumen / Guardar PDF” abre la impresión nativa con una vista específica: en el diálogo elegí guardar como PDF. Incluye revisión, fecha consultada, responsables, checklist, vigencias, comentarios y hashes; no exporta códigos ni adjuntos binarios. Actualizá primero si querés incluir cambios recientes del equipo.

### Handoff — ampliación de seguimiento

- Persona: App Engineer
- Changed: app/src/features/pilot/{shared-workspace,checklist-editor,comments,report,model}, app/src/lib/pilot/gateway.ts, app/src/app/globals.css, app/e2e/pilot-shared.spec.ts, app/test/pilot.test.ts
- ABI change: no
- Tests: 12 pruebas de app, 12 del servicio y 8 de navegador passing; tipos/lint/build passing; impresión PDF generada y revisada en escritorio/móvil
- Evidence: capturas y PDFs de prueba en test-results (datos sintéticos, ignorados)
- Next owner: responsable del proyecto — elegir alojamiento privado y cuentas antes de habilitar acceso remoto; Docs & Pitch — validar los documentos exigibles con asesoría
- Open questions: proveedor/servidor remoto, identidad, conservación y responsables reales; sin efecto sobre el alcance Testnet
