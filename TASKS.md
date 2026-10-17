# Plan de entrega - YerbaCapital

Actualizado: 17/10/2026. Una marca indica trabajo con evidencia disponible, no aprobación
regulatoria ni aceptación humana. Los contratos se mantienen a cargo del compañero.
No cambiar ABI ni redeployar para corregir la Webapp.

## 1. Integración, evidencia y Webapp

- [x] Contratos Testnet y demo CLI documentados en `docs/evidence.md`, run `4d2e8e0c36bc7699`.
- [x] Portada `/`, panel por rol `/dashboard`, inversores `/investors` e historial `/lots/<id>`.
- [x] Corregir error 500 por dependencia `node:crypto` en navegador.
- [x] Carga de imagen con autorización firmada, desafío con expiración y protección contra reutilización; comprobar rol Verifier vigente en Testnet.
- [x] Limitar bytes durante la lectura; comprobar formato raster y coincidencia del hash firmado.
- [x] Persistir archivos y metadatos en el servicio local; no inventar una ubicación IPFS.
- [x] Pin opcional con proveedor: solo informar IPFS después de confirmar publicación y recuperar bytes con el mismo SHA-256.
- [ ] Validar pin real contra proveedor configurado. Requiere credencial privada `PINATA_JWT`; las pruebas aisladas no sustituyen ese chequeo.
- [x] Ficha pública: descargar y comprobar SHA-256 en navegador, sin confundir integridad con veracidad física; manejar documentos no-imagen, faltantes y alteraciones.
- [x] Simulador ARS: importes exactos, supuesto fijo ilustrativo, sin PII, códigos cobrables, hashes inventados ni confirmaciones de bloqueo/liquidación.
- [x] Accesibilidad del simulador: teclado, Escape, foco de regreso y modo oscuro.
- [x] Aceptación humana con Freighter: autenticación del upload, registro, cofirma, fondeo, repagos, recorrido de deterioro/default/reclamo y bloqueo de una operación inválida antes de firma. Los hashes y límites constan en `docs/evidence.md`.

**Fuera del MVP:** off-ramp operativo MoneyGram/SEP-24, conversión real a ARS,
sucursales verificadas, transferencias bancarias, seguro real, incorporación de
inversores y venta comercial de lotes. La simulación no completa esas integraciones.

## 2. Calidad y publicación

- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` de la revisión integrada.
- [x] Suite integrada: 42 unitarias (27 app + 15 svc), 43 navegador aprobadas/1 omitida y 20 casos Testnet aprobados. Los casos negativos de evidencia usan respuestas controladas, no prueban un pin externo real.
- [x] Configuración pública de ejemplo y variables privadas separadas. `.env*` privados permanecen ignorados; Vercel no los recibe automáticamente desde Git.
- [x] Revisión técnica y materiales guardados en Git y subidos a main tras completar controles.
- [ ] Crear/vincular proyecto de hosting con el equipo correcto.
- [ ] Publicar servicio/índice persistentes con autenticación y origen adecuados; publicar Next solo no los vuelve accesibles.
- [ ] Deploy web público y verificación en incógnito con Freighter.

**Bloqueo de acceso:** conexión Vercel consultada el 17/10/2026 devuelve equipos y
proyectos vacíos. No existe una URL de despliegue confirmada en esta revisión.
El gateway actual restringe el servicio a loopback. No se relajan controles para publicar.
El redeploy/reseeding de contratos es opcional y no se ejecuta por esta revisión Webapp.

## 3. Documentación

- [x] README con IDs activos, enlaces Stellar Expert y distinción USDC propio de prueba/Circle.
- [x] Stack documentado desde versiones fijadas, sin equiparar versión SDK con protocolo de red.
- [x] Declaración de uso de IA y datos sintéticos; sin aval atribuido al INYM.
- [x] Rutas e instrucciones locales actualizadas y guion de aceptación separado de evidencias CLI.
- [x] Guion cronometrado de 4:45 en `pitch/video-script.md`.
- [ ] Ensayo humano cronometrado del guion.

## 4. Pitch y video

- [x] Pitch de 7 diapositivas: `output/pdf/yerbacapital-pitch.pdf`, fuente reproducible `pitch/build-pitch.py`.
- [x] Exportación PDF menor a 15 MB y revisión visual de todas las páginas.
- [x] Anticipo narrado del pitch: `output/video/pitch-preview-narrado.mp4`, 1920x1080, voz sintética declarada; narración en `pitch/narration.txt`.
- [ ] Confirmar nombres públicos del equipo e incorporarlos al pitch antes de entrega.
- [ ] Grabar la demo de pantalla con firmas reales Freighter (máximo 5 minutos), sonido claro y sin secretos.
- [ ] Aprobar contenido final; subir video final a YouTube no listado o Drive y comprobar incógnito.
- [ ] Subir PDF aprobado y completar formulario oficial con datos del equipo.

El anticipo narrado muestra las diapositivas: **no es la grabación del flujo con
Freighter** y no se presenta como tal. El modelo de fee 0,75% es hipótesis comercial,
no cobro implementado ni rentabilidad prometida. No se publica un enlace ficticio.

## 5. Cierre conjunto

- [x] Repositorio público con esta revisión sincronizada.
- [ ] URL web pública verificada.
- [x] Evidencia histórica CLI e IDs en `docs/evidence.md`; volver a comprobar red tras reset.
- [x] Aceptación humana Freighter documentada en `docs/evidence.md`.
- [ ] Video final accesible sin sesión.
- [ ] Pitch aprobado y enviado.
- [ ] Confirmación real del envío al hackathon.

La hora límite y requisitos oficiales deben comprobarse en la convocatoria del equipo;
este archivo no certifica una fecha/hora de cierre ni una inscripción enviada.
