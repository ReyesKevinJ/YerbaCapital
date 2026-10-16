# Revisión de uso: persona que trabaja con yerba

Fecha: 16 de octubre de 2026. Persona responsable: App Engineer.

## Alcance y método

Revisión heurística del dashboard, siete vistas por rol, registro/financiamiento,
verificación, comprobantes, consulta pública, expediente compartido y expediente
anterior del navegador. Se leyó la implementación y se recorrieron las rutas sin
mutaciones financieras con navegador móvil y escritorio. Las pruebas automatizadas
cubren archivos y documentación sintéticos. No se entrevistó a personas de campo;
las frases siguientes son escenarios interpretativos, no testimonios ni resultados
de una investigación con usuarios.

Supuesto de uso: una persona de una cooperativa conoce kilos, humedad, depósitos y
plazos, pero no basis points, hashes, ledger ni autorización de activos digitales.
Puede usar un celular con poca experiencia digital. No se presupone mala conexión
comprobada: queda pendiente probar conectividad lenta y cortes con participantes.

## Hallazgos y decisiones

### 1. Bloqueante: unidades técnicas al pedir un préstamo o inspeccionar

Escenario: «Mi informe dice 5 % de humedad; no sé qué significa 500».
Antes se pedían humedad/tasa en basis points, plazo en segundos e inicio como fecha
Unix. Ahora se muestran porcentajes (admiten coma o punto), días enteros y un
selector de fecha/hora local. La app convierte unidades exactamente; el contrato
conserva tasa, elegibilidad, interés y deuda autoritativos. Pruebas verifican que
5,25 % llega como 525, y 180 días como 15552000 segundos, sin redondeo silencioso.

### 2. Alto, pendiente: el código del depósito sigue siendo técnico

Escenario: «Conozco el nombre del depósito, no ese código largo».
El registro exige una referencia opaca preparada por el equipo. Se agregó ayuda
para pedirla y no poner una dirección real ni inventar un código. No se generó una
identidad de depósito arbitraria. Próximo paso: catálogo off-chain de depósitos
con selección por alias de demo y referencias verificadas, acordado con Oracle
Engineer. Hoy registrar de cero todavía requiere acompañamiento.

### 3. Alto, pendiente: la cofirma exige cambiar de cuenta manualmente

Escenario: «¿Por qué tengo que cambiar de billetera si el inspector ya firmó?».
El flujo actual de demo usa cuentas distintas en Freighter sobre el mismo navegador.
Se agregó una guía de tres pasos antes del formulario; no se ocultaron ni omitieron
firmas. Para ingreso el verificador inicia y el custodio cofirma; para retiro el
titular inicia y el custodio cofirma. La vista del custodio agrupa el trabajo conjunto,
pero no lo convierte en el iniciador autorizado por el contrato. Próximo paso: entrega
segura de solicitudes de cofirma entre participantes/dispositivos con Integration
Engineer, sin claves en el servicio. Requiere especificar y probar otro flujo; no
se simula un inbox inexistente. La aceptación humana con Freighter sigue pendiente.

### 4. Alto: vocabulario del sistema expuesto como tarea

Roles en inglés, estados como Funded y eventos como LoanFunded exigían traducción
mental. Se reemplazaron nombres principales por cooperativa, prestamista, depósito,
inspector y valuador; estados y eventos muestran español. Los identificadores
originales de eventos quedan en detalles técnicos. Se aclara que el selector de
vista no da permisos y que los lotes consultados no son una cartera propia.

### 5. Alto: guardar un archivo no indicaba qué hacer después

El comprobante ahora explica su uso, permite copiar su código y ofrece selección
manual si el navegador bloquea el portapapeles. Se mantiene la aclaración de que el
archivo todavía no está firmado ni registrado. El campo de la operación explica
dónde obtenerlo. No se cambia la evidencia preparada ni se firma automáticamente.

### 6. Medio: legibilidad y navegación en celular

La barra horizontal podía esconder tareas y los textos operativos pequeños exigían
esfuerzo. Se ajustó navegación móvil y tamaño de controles/textos junto con el tema.
Las tablas siguen teniendo desplazamiento interno y una indicación explícita.
Queda pendiente un flujo por tarjetas de lote para evitar comparar columnas en celular.
No se afirma conformidad WCAG ni validación en un equipo bajo sol de campo.

### 7. Medio: exceso de información técnica para empezar

Se agregó una guía de pasos y ayudas junto a los datos; las primeras tareas cambian
según rol. La consola conserva opciones técnicas para la demo. Falta una secuencia
asistida «elegir lote → adjuntar informe → revisar → firmar», acceso al lote por QR
y detectar los roles de la cuenta conectada. Son mejoras siguientes, no capacidades
que esta revisión dé por terminadas. No se eliminan pasos de aprobación para simplificar.

### 8. Medio: expediente documental tiene su propio acceso

El piloto usa un código de integrante distinto de Freighter y conserva límites de
revisión independiente, pendientes y versiones. Su introducción y formulario aclaran
que no se usa la clave de billetera. El expediente anterior vive en el navegador y
se identifica como anterior. Pendiente: simplificar la carga inicial del checklist
y mostrar archivos con alias amigables sin perder su hash/versionado. Una revisión
no equivale a firma legal ni habilita el piloto real.

### 9. Medio, pendiente: algunos errores todavía necesitan explicación

El mapa compartido de errores conserva términos como colateral, default y price
oracle; un fallo desconocido puede mostrar el mensaje técnico completo. No se
cambió ese módulo, que pertenece a Integration Engineer. Próximo paso: mensajes
con acción concreta («pedile al valuador que actualice el precio») y detalle técnico
expandible con código/transacción, sin ocultar fallos ni dar por confirmado un envío.

### 10. Preferencia visual: modo oscuro

Un subagente implementó claro/oscuro/según dispositivo para dashboard y piloto.
La preferencia se conserva localmente y no contiene datos financieros. La impresión
permanece clara. El tema oscuro no se presenta como solución universal para exteriores:
el usuario puede volver al claro según luz y comodidad.

## Recorrido de aceptación recomendado con una cooperativa

1. Identificar su tarea sin explicar palabras de blockchain.
2. Consultar un lote y distinguir mercadería, certificado y préstamo.
3. Preparar un ingreso con datos/códigos de prueba provistos por el equipo.
4. Guardar un comprobante, copiarlo y entender que falta la firma.
5. Escribir humedad/tasa/plazo con las unidades habituales.
6. Hacer el recorrido de cofirma con inspector y custodio acompañados.
7. Autorizar un pago máximo, pagar y saber cómo quitar el permiso si lo cancela.
8. Reconocer un error o confirmación pendiente sin reenviar automáticamente.
9. Revisar un acuerdo con otra persona y descargar el resumen.
10. Repetir en celular con claro/oscuro y luego con conexión limitada.

Registrar dónde necesita ayuda, si entiende el siguiente paso y si puede recuperar
un error. No inventar porcentajes de éxito ni considerar aprobada esta validación
por haber pasado Playwright.

### Handoff
- Persona: App Engineer
- Changed: lenguaje y ayudas de dashboard/operaciones/comprobantes; conversiones de presentación; tema; pruebas
- ABI change: no
- Tests: 14 unitarios, 21 de navegador y 6 de Testnet aprobados; un caso exclusivo móvil se omite en escritorio. Typecheck y lint aprobados. No se firman transacciones nuevas en esta revisión
- Evidence: capturas de navegador y pruebas sintéticas de escritorio/móvil
- Next owner: Integration Engineer — cofirma entre participantes y detección de roles
- Next owner: Oracle Engineer — selección amigable de depósitos/documentos
- Next owner: equipo de producto — validar recorridos con personas de cooperativas
- Open questions: dispositivos disponibles, conectividad y modo de acompañamiento del piloto

## Segunda pasada: tareas de los demás actores

Se agregaron pasos propios de prestamista, depósito, inspector, valuador y consulta
pública, además de conservar la cooperativa. Las acciones iniciales priorizan el
trabajo habitual: financiar, verificar, emitir o valuar; incumplimiento y reclamo
siguen disponibles con su explicación, sin ponerlos como siguiente tarea sugerida.
Administrador conserva su consola especializada.

Las ayudas con ícono «i» usan controles desplegables nativos: se abren con toque o
teclado y no dependen de pasar el mouse. Explican certificado/garantía, USDC de prueba,
cofirma, valuación total frente a precio por kilo, deuda vigente frente a saldo
histórico y permiso frente a pago. Las consecuencias importantes permanecen visibles
antes de firmar, aunque la ayuda esté cerrada.

Cada operación no administrativa explica qué preparar y qué registra si se confirma.
El depósito ve claramente que el inspector inicia el ingreso y el titular inicia el
retiro; el depósito cofirma. No se inventó una bandeja de solicitudes entre personas.
Financiamiento permite abrir las condiciones de cada préstamo con importe, tasa,
plazo, vencimiento y cuentas leídos de los contratos. Se separan consulta y permiso:
ningún texto ni selector reemplaza las comprobaciones on-chain.

### Handoff de la segunda pasada
- Persona: App Engineer
- Changed: context-help, role-guidance, task-guidance, dashboard, protocol-workbench, estilos y pruebas
- ABI change: no
- Tests: 14 unitarios, 23 de navegador y 8 escenarios de Testnet aprobados; un caso exclusivo móvil se omite en escritorio. Una consulta de Testnet agotó el tiempo de la suite y pasó al repetirse aislada. Typecheck, lint y build aprobados.
- Evidence: capturas de roles y controles desplegables
- Next owner: equipo — validar comprensión con participantes de depósito, inspección y financiamiento
- Open questions: se mantienen catálogo amigable de depósitos y cofirma entre dispositivos
