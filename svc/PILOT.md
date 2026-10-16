# Expediente compartido — servicio local de Testnet

Un workspace sintético con integrantes configurados en PILOT_MEMBERS_JSON: lista JSON de id, role (editor/reviewer/observer) y token aleatorio de 32 bytes en base64url. Nunca publicar esa variable. La membresía es off-chain y no concede roles Soroban. Ausencia de configuración deshabilita estas rutas.

GET /pilot/session identifica al integrante mediante Bearer. GET /pilot devuelve revisión, acuerdos e historial. POST /pilot/documents conserva bytes privados. POST /pilot/agreements crea; PUT /pilot/agreements/:id actualiza. GET /pilot/documents/:hash descarga con membresía. Las mutaciones requieren If-Match con revisión global vigente; un conflicto no se reintenta automáticamente.

Observer solo consulta. Editor y reviewer editan documentos/acuerdos; solo reviewer puede pasar de InReview a Reviewed, sin cambiar contenido y siendo distinto de editedBy. Una edición posterior elimina reviewedBy. No representa firma legal ni atestación física on-chain.

Los archivos están separados del almacén público de evidencia bajo .evidence/pilot/documents. Las revisiones completas se publican atómicamente bajo .evidence/pilot/revisions, con checksum de integridad y permisos locales restringidos. El historial registra identidad configurada y hora de servidor. No es resistente a un administrador del filesystem que reescriba archivos y checksums. Es un almacén local de demostración, no una base de datos distribuida.

Respaldar con el servicio detenido el directorio pilot completo (documentos y revisiones) a un destino privado; verificar checksums y SHA-256 antes de restaurar. Exportar JSON desde la app solo respalda metadatos, no los archivos. El comando `pnpm --filter @yerbacapital/evidence pilot:backup create <directorio-privado-nuevo>` crea una copia completa consistente con manifiesto y permisos restringidos. `pilot:backup verify <directorio>` valida todas las revisiones y documentos. El destino se resuelve desde svc/ y debe existir su carpeta padre. No se sobrescriben copias existentes. Para restaurar, detener el servicio, verificar la copia y copiar sus carpetas documents y revisions a un workspace nuevo antes de apuntar el servicio allí. La suite comprueba lectura de metadatos y bytes desde la copia. No se configuró un destino externo ni automatización porque no se proporcionó. Una copia en el mismo disco no protege de pérdida de ese disco. Tras caída durante una escritura puede quedar .writer-lock: detener todos los procesos, verificar que no hay escritor activo y respaldar antes de quitar el lock; no se rompe automáticamente. Una subida fallida en su vinculación puede dejar un archivo huérfano, sin acceso por API.

Límites: 100 acuerdos, 20 adjuntos por acuerdo, 500 documentos, 5000 revisiones, archivos hasta 5 MiB. Sin borrado automático ni caducidad documental hasta acordar conservación. Revocar/rotar token o cambiar rol requiere actualizar configuración y reiniciar servicio. Sin cuentas reales, correo, recuperación automática, proveedor de identidad ni firma jurídica. Solo archivos e identidades sintéticos.

### Handoff

- Persona: Oracle Engineer
- Changed: svc/src/pilot/**, svc/src/http/server.ts, svc/src/config/environment.ts, svc/test/pilot.test.ts, svc/src/pilot/backup*.ts, svc/package.json, svc/PILOT.md
- ABI change: no
- Tests: pnpm --filter @yerbacapital/evidence test → 10 passing; lint → passing
- Evidence: HTTP con almacenamiento temporal real, permisos, acceso privado, revisión cruzada y conflictos
- Next owner: App Engineer — sesión de integrante, transporte protegido y UI compartida; DevOps — configurar integrantes sintéticos y reiniciar servicio
- Open questions: integrantes reales, proveedor de identidad, alojamiento privado, conservación y destino de backup

## Ampliación de preparación documental

Las plantillas de checklist son guías por categoría del acuerdo y se entregan por GET /pilot junto con serverDate. No se duplican como fuente autoritativa en la app. La revisión exige checklist completo y fecha de vigencia no anterior al día UTC actual. La API admite acuerdos anteriores sin checklist, pero para una nueva revisión exige completarlo; no altera snapshots anteriores al leer.

POST /pilot/agreements/:id/comments exige membresía de edición/revisión, revisión If-Match y texto de hasta 2000 caracteres. Un comentario Note conserva el estado. ChangesRequested exige reviewer, devuelve el acuerdo a Draft e invalida reviewedBy. Autor y fecha se asignan en servidor, sin confiar en valores enviados por el cliente. Hasta 100 comentarios por acuerdo.

Las nuevas entregas crean versiones cronológicas de documentación, con hash, autor, fecha y fase Draft/Submitted/Reviewed. Se preservan archivos previos; no se permite quitar evidencia anterior del acuerdo al editar. Corregir, editar y renovar requieren nueva revisión. No hay calendario de mails ni firma jurídica ni revocación física de documentos.

### Handoff — flujo documental

- Persona: Oracle Engineer
- Changed: svc/src/pilot/{model,workflow,error,http}.ts, svc/test/pilot-workflow.test.ts, svc/test/pilot.test.ts
- ABI change: no
- Tests: validación de fecha, checklist, autoría de comentarios, revisión cruzada, invalidación por corrección, preservación de versiones y conflictos
- Evidence: servidor HTTP y almacenamiento temporal real en tests; sin documentos reales
- Next owner: App Engineer — mostrar checklist, alertas y conversación según permisos; responsable del entorno — acceso remoto sigue pendiente de proveedor
- Open questions: listado jurídico definitivo por tipo de acuerdo, destino de alojamiento y política de conservación
