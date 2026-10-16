# Webapp — cierre de alcance sin modificar contratos

## Implementado

- Dashboard por rol con ayudas por toque/teclado, claro/oscuro y estados separados.
- Consulta pública `/lots/<id>` sin conectar billetera. Lee lote y préstamo vinculado
  mediante los clientes generados y los wrappers existentes; muestra historia y
  cobertura del indexador. Fallos de lectura no se reemplazan por datos inventados.
- Enlace y QR SVG generados localmente. El QR incluye registry y vault; si el enlace
  corresponde a otro despliegue, la app avisa y no mezcla registros. Los QR de
  127.0.0.1 solo sirven en esta computadora: no son un despliegue público.
- Catálogo paginado de identificadores descubiertos por eventos confirmados. El
  servicio filtra por contratos configurados, conserva cobertura y errores; la app
  rechaza catálogos de otro despliegue. Cada estado/importe se lee de nuevo al contrato.
- Vista de financiamiento con filtros por estado y número, condiciones del préstamo,
  vínculo al lote público y preparación del fondeo de solicitudes Requested. No es
  mercado secundario de certificados, pool, recomendación ni promesa de rentabilidad.
- Comprobantes sintéticos de informe, secadero y seguro fuera de cadena. Un manifiesto
  determinista lista huellas de archivos; su SHA-256 se puede usar como evidencia de
  la operación existente. No se contrata seguro ni se incorpora una póliza al ABI.
- Copiado explícito de un comprobante/carpeta a la operación actual sin borrar los
  otros campos. No se cambia una preparación firmada ni una confirmación pendiente.
- Referencia opcional de depósito copiada de un lote consultado, con código y cuenta.
  Solo usarla cuando corresponda al nuevo lote de demo. No crea identidades de depósito.
- Consulta de capacidad máxima usando `max_principal` a través del wrapper ya existente.
  No se calcula LTV, deuda ni interés en la app. La simulación/ejecución vuelve a validar.
- Se conserva Freighter, simulación, firma final, cofirma, rechazo, confirmación y
  consulta de transacciones pendientes. No se envían fondos desde el backend.

## Revisión por tarjeta de Trello

Freighter y vistas por rol están implementados. La aceptación humana con la extensión
real sigue pendiente: las pruebas de navegador sin billetera no equivalen a firmar.
La cooperativa ya puede preparar los adjuntos de prueba y consultar capacidad; el
inspector puede aplicar su comprobante a la operación; el prestamista tiene catálogo;
la consulta pública tiene enlace y QR. No marcar como completado el despliegue público
ni el recorrido de firmas mientras no exista evidencia verificable.

## Compañero de smart contracts

No se modifican `contracts/**`, ABI, tipos generados, reglas económicas, activos ni
contratos desplegados. La app apunta al despliegue actual. Si cambia el ABI, se aplica
el handoff habitual: especificación/IDs/versiones → bindings generados → adaptación
por Integration Engineer → aceptación humana. No se regeneran bindings por anticipado.

La cofirma actual usa cambio de cuentas en el mismo navegador. No se inventó un inbox
entre dispositivos ni una firma de custodia en el servicio. Inspector inicia ingreso;
titular inicia retiro; custodio cofirma. No se elimina ninguna autorización por UX.

## Publicación preparada

Vercel: usar Root Directory `app`, acceso a archivos del workspace fuera de esa raíz,
Node >=22 y pnpm del repositorio. `app/vercel.json` instala el workspace, compila los
clientes TypeScript existentes y ejecuta `build:host` (Next directo, sin requerir un
archivo `.env` del equipo). El flujo local conserva su script de arranque existente.

Configurar explícitamente las variables públicas de Testnet en el proyecto: passphrase,
RPC oficial, chain enabled e IDs de registry/vault/activo. Nunca subir `.env`, `.stellar`,
`.evidence`, `.indexer`, códigos de integrante ni claves. `NEXT_PUBLIC_*` es visible para
el navegador; solo contiene configuración pública, nunca tokens.

La conexión consultada de Vercel devolvió `teams: []` y ningún proyecto YerbaCapital.
Hace falta habilitar la cuenta/equipo correcto antes de crear/publicar el proyecto.
No se creó una URL de despliegue ni se declara publicado.

Además, el servicio de evidencia/piloto y el índice siguen siendo procesos locales
con almacenamiento persistente local y gateways restringidos a loopback. Publicar
solo Next no publica esos procesos: una función serverless no puede llamar al
127.0.0.1 de la computadora del equipo. Para publicarlos hace falta un destino de
servicio/almacenamiento, autenticación y origen HTTPS acordados, o restringir un
preview explícitamente a consultas on-chain. No se relajaron controles para el deploy.

## Aceptación humana pendiente

1. Abrir en un perfil de navegador sin sesión; consultar lote e historia sin billetera.
2. Descargar QR, decodificarlo y abrirlo en otro dispositivo después del despliegue.
3. Registrar un lote sintético con carpeta de comprobantes usando la cuenta borrower.
4. Inspector prepara ingreso; custodio cofirma; volver a inspector para enviar.
5. Emitir, valuar y pedir un préstamo con los roles de prueba autorizados.
6. Prestamista revisa solicitud disponible y firma fondeo con Freighter en Testnet.
7. Inspeccionar; autorizar pago acotado; registrar pago parcial y total; comprobar enlaces.
8. Probar rechazo de firma y confirmación pendiente sin reenviar automáticamente.
9. Validar visualmente con otro integrante antes de marcar completado en Trello.

### Handoff — descubrimiento
- Persona: Oracle Engineer
- Changed: svc/src/indexer/catalog.ts, svc/src/http/server.ts, svc/test/catalog.test.ts
- ABI change: no
- Next owner: App Engineer — consumir identificadores y conservar la advertencia de cobertura
- Open questions: destino público del servicio persistente

### Handoff — Webapp
- Persona: App Engineer
- Changed: consulta/QR, catálogo, carpeta documental, selección explícita de evidencia, consulta de capacidad, pruebas y configuración de build hospedado
- ABI change: no
- Tests: resultados finales de pruebas de unidades, gateways, navegador y lecturas de Testnet informados al entregar
- Evidence: QR decodificado por un lector independiente en pruebas; manifiesto y archivos rehasheados
- Next owner: equipo — autorizar acceso al proyecto de hosting y ejecutar aceptación con Freighter
- Open questions: equipo Vercel, alojamiento del servicio/índice y cambios de ABI que entregue el compañero

### Handoff — mapa para inversores
- Persona: App Engineer
- Changed: ruta `/investors`, mapa interactivo en Resumen de lender, acceso desde el frontend y pruebas de navegación
- ABI change: no
- Tests: typecheck y lint correctos; selección por teclado, filtro de provincia y paso a financiamiento en escritorio/móvil y temas claro/oscuro
- Evidence: capturas Playwright; inspección visual de ambos tamaños
- Next owner: Producto/UX — acordar publicación de ofertas y ubicaciones aproximadas consentidas fuera de cadena antes de reemplazar los ejemplos
- Open questions: fuente de disponibilidad comercial y responsable de actualizarla; ventas excluidas del MVP vigente

El mapa es esquemático y sin escala. Las localidades sirven de contexto; establecimientos,
volúmenes y tiempos son ficticios, sin asociación con IDs de lote/préstamo. No se crean
ofertas reales, precios ni transacciones de venta. Las solicitudes de financiamiento se
consultan en su sección existente; nunca se infieren del mapa. No se envían ubicaciones
privadas ni se usan mapas de terceros, claves API o servicios de geolocalización.

### Handoff — portada pública
- Persona: App Engineer
- Changed: `/` presenta la propuesta; `/dashboard` conserva el panel para entidades; `/investors` conserva mapa y vista del prestamista; pruebas operativas actualizadas a la nueva ruta
- ABI change: no
- Tests: tipos, lint y unidades; pruebas de navegación de portada, inversor y roles en escritorio/móvil, con capturas claro/oscuro
- Evidence: capturas de navegador locales; sin nuevas transacciones
- Next owner: equipo — revisar contenido de presentación antes de grabar la demo
- Open questions: ninguna para la portada; publicación y aceptación real con Freighter siguen pendientes

La portada no consulta contratos ni requiere billetera. Presenta el problema, el recorrido
de la solución, beneficios por actor y límites de la blockchain. No promete crédito,
rendimientos, existencia física garantizada ni cumplimiento normativo. Los accesos son
a la demo de Testnet; no hay alta real de inversores ni oferta comercial activa.

Animaciones de portada: entrada escalonada del título y accesos, aparición de la
ilustración/sol y secuencia de iconos, revelado al entrar al viewport cuando el navegador
lo admite y respuestas suaves de tarjetas/botones. Sin librerías ni reproducción infinita.
Con movimiento reducido se desactivan animaciones y transiciones; el contenido permanece
accesible también sin soporte de animaciones vinculadas al scroll.

### Handoff — interacción de tarjeta ilustrada (landing-story)
- Persona: App Engineer
- Changed: `app/src/features/landing/landing.css`, `app/e2e/landing.spec.ts`
- ABI change: no
- Tests: `pnpm --filter app typecheck`, `pnpm --filter app lint`, 8 casos en `landing.spec.ts` (Desktop y Mobile) con verificación de elevación/inclinación en hover, retorno suave al salir y respeto estricto de `prefers-reduced-motion`
- Evidence: verificación E2E con Playwright sobre servidor existente http://127.0.0.1:3000
- Next owner: equipo — revisión visual de interacción en la demo
- Open questions: ninguna

Interacción de `.landing-story`: elevación (`translateY(-8px)`), reorientación sutil (`rotate(-0.5deg)`), sombra profunda y respuesta armónica del sol, paisaje e icono, con retorno fluido (`cubic-bezier(.22, 1, .36, 1)`) al quitar el cursor. No colisiona con la animación de entrada inicial `landing-enter` (que actúa sobre `translate` y `opacity`). En dispositivos táctiles (`pointer: coarse`, `hover: none`) y pantallas angostas (`<= 720px`) se desactiva la inclinación para evitar estados pegados o desbordes. En modo de movimiento reducido (`prefers-reduced-motion: reduce`), las transiciones y transformaciones se anulan por completo (`transform: none !important`). Sin dependencias adicionales ni código JavaScript en la landing.

