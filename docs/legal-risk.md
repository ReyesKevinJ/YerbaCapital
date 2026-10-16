# Sustento comercial, encuadre legal y justificación de YerbaCapital

Persona: Docs & Pitch. Fecha de revisión de fuentes: 16 de octubre de 2026.

Estado: documento de trabajo para el jurado y preparación de un piloto. La documentación está desarrollada; la demanda comercial, la instrumentación jurídica y los proveedores del piloto todavía necesitan validación. No es un dictamen ni una oferta de inversión.

## 1. Tesis y alcance

YerbaCapital propone financiar inventario de yerba canchada (*coarse-ground dried yerba*) durante su estacionamiento (*aging*), con atestaciones de ingreso y calidad, custodia segregada y un registro compartido del financiamiento. El objetivo es probar si ese inventario puede respaldar liquidez sin exigir su venta anticipada.

**El token no es la yerba.** El certificado del protocolo representa un derecho condicionado sobre un lote declarado, verificado y custodiado. La blockchain registra autoría, orden e integridad; no garantiza existencia, calidad, ubicación, ausencia de gravámenes externos ni recuperabilidad física.

La entrega actual es exclusivamente Stellar Testnet, evidencia sintética y un activo de prueba propio llamado USDC. No es USDC real de Circle ni representa dólares rescatables. No hay fondos reales, onboarding de inversores, seguro contratado, integración bancaria ni conversión a pesos. Las evidencias técnicas están en [evidence.md](evidence.md); las reglas y límites, en [architecture.md](architecture.md) y [contract-spec.md](contract-spec.md).

Un piloto con mercadería o dinero reales constituye una etapa distinta: este documento identifica condiciones previas, pero no autoriza ejecutarla ni amplía el alcance Testnet del repositorio.

## 2. Estacionamiento y capital de trabajo

### 2.1 Qué está respaldado y qué falta medir

El [INYM, en su explicación del proceso productivo del 8 de mayo de 2023](https://inym.org.ar/noticias/produccion-sustentable/80256-de-las-chacras-a-los-mates-argentinos-asi-se-produce-la-yerba-mate.html), describe la colocación de canchada en bolsas y un estacionamiento de **nueve meses o más**, con control de temperatura y humedad. Es evidencia del tiempo del proceso, no una encuesta financiera de cooperativas.

El rango **6–24 meses** que figura en el ticket y en el contexto del proyecto se conserva como referencia de diseño a contrastar por establecimiento; no se presenta aquí como estadística actual de INYM/INTA ni como promedio sectorial. Para el pitch se usa el dato efectivamente verificado del INYM. Queda pendiente una fuente primaria con ubicación precisa que respalde ambos extremos del rango. Tampoco se infiere que todo lote deba permanecer ese tiempo desde el momento de solicitar crédito: importa el estacionamiento restante.

La relación con capital de trabajo es una **inferencia económica**: si el inventario todavía no genera cobros y ya requirió pagos, hay recursos aplicados a stock. El monto depende de costos, anticipos de compradores, crédito de proveedores, calendario de ventas y condiciones de cada cooperativa. No se verificó un porcentaje sectorial de capital inmovilizado ni de exclusión bancaria.

### 2.2 Ejemplo de negocio, con supuestos explícitos

Para un lote sintético de 12.000 kg, suponer un costo acumulado de 0,60 unidades monetarias por kg significa 7.200 unidades aplicadas al inventario. Suponer una valuación de 1 unidad por kg produce un valor nominal de 12.000. **Costo y valuación son conceptos distintos**; ninguno de estos precios es una cotización de mercado.

Con haircut base de 15 % y LTV de 60 % aplicado al valor ajustado, la capacidad ilustrativa es 12.000 × 0,85 × 0,60 = 6.120 unidades. Un préstamo de 5.000 queda por debajo de esa capacidad. La app obtiene estos valores del contrato: este ejemplo solo explica la lógica comercial y no reemplaza el cálculo financiero autoritativo.

La necesidad neta de caja se estima con egresos exigibles menos cobros disponibles, anticipos y financiación ya existente. Financiar stock no elimina ese costo ni asegura una ganancia: agrega intereses, servicios, exposición cambiaria y riesgo de ejecución. El repago debe vincularse a un flujo de caja identificable, no a una expectativa garantizada de suba del precio.

### 2.3 Validación comercial propuesta

El cliente inicial a entrevistar es una cooperativa o secadero con canchada identificable y capacidad de documentar propiedad, costos y ventas. El prestamista aporta liquidez y asume riesgo crediticio, físico, de precio y de recupero. Custodio y verificador prestan servicios separados.

Antes de afirmar viabilidad comercial, obtener:

- Entrevistas documentadas con tomador, custodio, verificador y potencial financiador; guardar datos personales y condiciones sensibles fuera del repositorio público.
- Calendario de caja, volumen elegible, estacionamiento restante y necesidad concreta de financiación.
- Comparación de costo total y tiempo de desembolso contra crédito bancario, anticipo de comprador y una solución centralizada equivalente.
- Cotizaciones de inspección, depósito, seguros, asesoramiento, operación y conversión monetaria.
- Manifestaciones de interés no vinculantes y disposición a pagar; no presentarlas como contratos ni compromisos de inversión.

No hay entrevistas, cotizaciones ni acuerdos comerciales aportados que permitan declarar estas condiciones cumplidas.

## 3. ¿Por qué blockchain frente a una base centralizada?

### 3.1 Aporte defendible

La hipótesis es que tomador, custodio, inspector y prestamista necesitan compartir el estado de un lote sin que uno de ellos pueda reescribir unilateralmente el registro financiero. Stellar/Soroban permite verificar firmas, transiciones y transferencias del activo de liquidación; el préstamo y su gravamen se coordinan bajo reglas públicas. Un tercero puede contrastar una evidencia disponible con su hash y revisar quién atestó cada hecho.

Esto puede reducir conciliaciones entre registros de actores distintos. La mejora en costo, tiempo o disputas todavía debe medirse. La trazabilidad de los datos no acredita que la declaración original sea verdadera. El bloqueo impide otro préstamo sobre el mismo certificado dentro de este protocolo; no detecta automáticamente el doble prendado de la mercadería en otro sistema.

### 3.2 Alternativa centralizada y criterio de elección

Una base centralizada con firmas de actores, bitácora auditable, permisos y respaldos también puede registrar lotes y préstamos. Ofrece operación más simple, recuperación de cuentas y mayor control de confidencialidad. Una bitácora firmada puede hacer detectables modificaciones; no corresponde afirmar que cualquier base centralizada sea necesariamente manipulable sin rastro.

Blockchain agrega dependencia de red, billeteras, claves, costos de transacción y exposición pública de metadatos. Tampoco elimina al administrador de roles, al custodio, al oráculo ni al proveedor de conversión. La identidad jurídica de quien firma requiere una vinculación off-chain que una dirección por sí sola no resuelve.

La elección se defiende cuando varios actores independientes valoran verificar reglas y transferencias sin depender del servidor de uno de ellos. Si todos aceptan un único operador y no necesitan liquidación compartida verificable, una base centralizada puede ser suficiente y más económica. El piloto debe comparar ambas opciones con el mismo flujo y los mismos controles físicos.

### 3.3 Formulación para el jurado

“Usamos blockchain para coordinar permisos, gravámenes y pagos verificables entre organizaciones. La mercadería permanece bajo custodia y depende de inspecciones y contratos. El registro no convierte por sí solo un certificado en título ejecutivo ni garantiza recuperar la yerba.”

Se reemplaza la expresión del ticket “inmutabilidad del título ejecutivo” por **integridad verificable del registro y de las atestaciones**. La fuerza ejecutiva corresponde al instrumento jurídico y sus requisitos. “Pass-through sin pool de fondos” describe el diseño financiero; “custodia no custodial” no describe correctamente la mercadería. “Financiación directa entre participantes” tampoco significa ausencia de intermediarios legales o de obligaciones regulatorias.

## 4. Viabilidad jurídica: ruta a estudiar, no habilitación obtenida

La [Ley 9.643, texto actualizado](https://www.argentina.gob.ar/normativa/nacional/norma-37048/actualizacion), regula certificados de depósito y warrants: contempla identificación del producto y partes, documentación electrónica, seguros y condiciones sobre gravámenes. También establece procedimientos para incumplimiento. El [Decreto 640/2024](https://www.argentina.gob.ar/normativa/nacional/decreto-640-2024-401750/texto) contempla emisión electrónica y soportes tecnológicos, incluidas bases centralizadas, distribuidas y tokenización; distingue emisores que optan por inscribirse y quienes no lo hacen.

**Inferencia para el proyecto:** existe una ruta normativa a evaluar para instrumentos electrónicos sobre mercadería depositada. Esa apertura tecnológica no prueba que el certificado actual de YerbaCapital satisfaga el régimen. El MVP tiene un registro por lote y no implementa por sí mismo el esquema jurídico completo de certificado de depósito y warrant.

El equipo debe encargar un informe jurídico fechado que defina:

- Instrumento elegido, emisor, titularidad, representación del crédito y del derecho sobre el lote; relación entre documentos y registro on-chain.
- Identificación de las partes y suficiencia de las firmas; una firma de billetera no se equipara automáticamente a firma digital certificada.
- Oponibilidad, prioridad frente a otros acreedores y tratamiento de insolvencia, embargo y doble gravamen.
- Formalidades, registros, habilitaciones del depósito y obligaciones del emisor que resulten aplicables; no presumir inscripción obligatoria universal ni suficiencia de un permiso municipal.
- Procedimiento de ejecución, notificaciones, plazos, gastos, destino del producido y devolución de excedentes.
- Tratamiento de discrepancias entre el estado contractual y una orden judicial o un documento jurídico prevalente.

El default on-chain cambia el estado del préstamo y puede transferir el certificado al prestamista según las reglas de la demo. **No equivale a ejecución física ni a apropiación automática de la mercadería.** La actual adjudicación técnica también necesita evaluar su compatibilidad con el instrumento jurídico elegido antes de un piloto real.

## 5. Custodia, seguro y evidencia física

Los siguientes puntos son condiciones propuestas para contratar un piloto, no documentos ya firmados ni coberturas existentes:

1. **Depósito y responsabilidades:** identificar depositante, depositario, ubicación privada, duración, tarifas, custodia diligente, acceso de inspección, responsabilidad por faltantes y mecanismo de disputa.
2. **Segregación:** definir bolsas o unidad de acopio, etiquetas, inventario y conciliación de masas; impedir mezcla o sustitución no autorizada y documentar mermas.
3. **Exclusividad y gravámenes:** verificar títulos y antecedentes disponibles, declaración del depositante y reconocimiento del custodio; exigir aviso ante embargo o reclamo. Una declaración no elimina gravámenes ocultos.
4. **Ingreso y calidad:** pesaje, humedad, muestreo y evidencia fechada; verificador y custodio cofirman el ingreso. Tomador, custodio y verificador son direcciones distintas por pares; evaluar además su independencia económica.
5. **Salidas:** instrucciones documentadas y conciliación física. Los retiros del protocolo requieren owner y custodio; con préstamo vigente, las reglas financieras deben permitirlos. La firma no hace atómica la entrega física con la transacción.
6. **Seguro:** obtener propuesta y póliza con bienes, local, suma, vigencia, beneficiarios o cesión cuando corresponda, franquicias, exclusiones y prueba de pago. No equiparar seguro de incendio con cobertura integral de stock, hurto, humedad o plagas.
7. **Incidente y ejecución:** responsables, comunicación al financiador, inspección extraordinaria, preservación de evidencia, denuncia al asegurador y procedimiento jurídico aplicable.

El [trabajo de INTA aportado, “Propuesta de Manejo Integrado de Plagas para el cultivo de yerba mate”](https://repositorio.inta.gob.ar/handle/20.500.12123/3530), es una referencia sobre **cultivo**. No debe trasladarse sin validación a riesgos de canchada almacenada, probabilidades de siniestro ni porcentajes de haircut. La descarga del PDF falló durante esta revisión; se identificó el documento en el repositorio, pero no se verificaron aquí sus recomendaciones completas.

Para el depósito falta una evaluación específica de plagas de productos almacenados, humedad, contaminación y prácticas de conservación por un profesional competente. No se proponen productos fitosanitarios ni coberturas presuntas. Cada deterioro usado por el protocolo requiere atestación autorizada y hash de evidencia; los archivos sensibles quedan off-chain con acceso controlado.

## 6. Puente monetario: USDC y ARS

En la demo, el activo de prueba se transfiere directamente entre prestamista y tomador; el vault no mantiene un pool ni escrow. Las claves siguen bajo control de cada participante y el repago utiliza autorización acotada. Eso no constituye un servicio de cambio ni asegura la disponibilidad de dólares o pesos.

Para un futuro piloto, el recorrido conceptual a validar sería: financiación en un activo admitido → proveedor de conversión → acreditación de ARS; y, para repagar, adquisición del activo admitido → pago al prestamista. Cada tramo necesita confirmar titularidad de cuentas, cotización, costos, límites, liquidez, cumplimiento y evidencia de liquidación.

[SEP-24 de Stellar](https://developers.stellar.org/docs/build/apps/wallet/sep24) estandariza la interacción de una billetera con un anchor para depósitos y retiros mediante un flujo alojado por el proveedor. **No garantiza un corredor USDC/ARS, una cotización ni una autorización regulatoria.** No se identificó ni contrató aquí un proveedor que confirme soporte efectivo para ese corredor y para estos participantes.

Antes de prometer conversión local, pedir al proveedor confirmación escrita de activos y redes soportados, ARS y medio de pago, jurisdicción, elegibilidad, KYC, tarifas, plazos, tratamiento de fallas y disponibilidad de SEP-24. Si no existe esa oferta, documentar otra ruta legal y operativa; no simularla como una integración disponible.

Una deuda denominada en USDC frente a ingresos de venta en ARS genera riesgo cambiario. El tipo de cambio y el precio local pueden moverse de forma distinta. USDC tampoco elimina riesgo del emisor, restricciones de transferencia o pérdida de paridad. No hay cobertura cambiaria en el MVP.

## 7. Perímetro regulatorio y privacidad

El [régimen vigente de CNV para PSAV, texto actualizado](https://www.argentina.gob.ar/normativa/recurso/219405/texact-TituloXIV-CapIII/htm), debe analizarse según las actividades efectivas del operador y sus proveedores. No se puede concluir que el modelo queda excluido por usar contratos pass-through o billeteras del usuario. La posible calificación del instrumento bajo el mercado de capitales es una evaluación adicional.

La [UIF explica las obligaciones de prevención aplicables a PSAV bajo la Resolución 49/2024](https://www.argentina.gob.ar/node/420332). Para el piloto, el análisis debe identificar sujetos obligados, responsables de KYC, beneficiario final, origen de fondos, monitoreo y reportes, conforme las reglas vigentes al ejecutarlo. La inscripción de un proveedor no acredita aprobación del certificado ni del producto de crédito.

También quedan por revisar actividad crediticia e intermediación, contratación transfronteriza, normas cambiarias, impuestos, facturación y protección de datos. No se afirma una prohibición o exención general. La jurisdicción, participantes y recorrido real de fondos determinan la revisión necesaria.

Identidades legales, CUIT/DNI, contratos, pólizas y ubicación exacta se mantienen off-chain. La publicidad del registro puede revelar relaciones y montos aun sin nombres; evaluar minimización y consentimiento antes de un piloto. No publicar hashes aislados de datos personales de baja entropía.

## 8. Monetización: hipótesis de fee de originación de 0,75 %

Se propone validar un cargo único de **0,75 % del capital efectivamente desembolsado**, pagado por el tomador al operador de la plataforma por originación y coordinación documental. No se cobra por una solicitud cancelada o no fondeada. Es una hipótesis del ticket, no una tarifa aceptada por clientes ni una capacidad del contrato actual.

Sobre un principal ilustrativo de 5.000 unidades, el fee sería 37,50. Con 12 % anual simple y 180 días sin pagos intermedios, el interés ilustrativo sería aproximadamente 295,89; interés más fee sumarían 333,39, antes de depósito, inspección, seguro, conversión, red e impuestos. No es una cotización, una tasa efectiva total ni una promesa de retorno.

Para comparar ofertas hay que calcular el costo financiero total sobre flujos netos y fechas reales. Si el fee se paga por separado, el desembolso del préstamo sigue siendo 5.000 y el tomador necesita además 37,50; si se retuviera, recibiría 4.962,50 manteniendo una obligación de 5.000. **El MVP no hace ninguna de esas cobranzas ni retenciones.** Una implementación futura exige definición comercial, revisión legal y especificación propia; no se modifica el pass-through actual.

El ingreso bruto hipotético por operación sería 37,50. El margen debe restar costos asumidos por la plataforma: adquisición, validación documental, soporte, infraestructura, proveedores, impuestos e incidentes. Los intereses corresponden al financiador, no se cuentan como ingreso de la plataforma. Sin cotizaciones no se puede afirmar rentabilidad; si el costo variable supera ese ingreso, el fee resulta insuficiente para ese tamaño de operación.

Quedan pendientes aceptación del precio, moneda e impuestos, facturación, modalidad de cobro, cancelaciones, reclamos y reparto de costos entre actores. No se publica promesa de rendimiento ni se abre captación real.

## 9. Condiciones para defender y preparar el piloto

El jurado puede evaluar hoy una hipótesis concreta y un flujo técnico Testnet verificable. No se afirma que exista ya un piloto comercial habilitado. La evidencia técnica no sustituye la validación de demanda ni el encuadre legal.

Antes de un piloto real se requieren, como mínimo:

- [ ] Relevar caja y estacionamiento de participantes concretos y contrastar costo total con alternativas.
- [ ] Obtener informe jurídico firmado sobre instrumento, garantías, ejecución y perímetro regulatorio.
- [ ] Acordar depósito, segregación, inspecciones, seguro y prevención de doble gravamen con responsables identificados.
- [ ] Vincular identidades y facultades de representación con firmas, conservando información sensible fuera de cadena.
- [ ] Confirmar proveedor y ruta monetaria, obligaciones de cumplimiento, impuestos y riesgo de cambio.
- [ ] Validar el fee y costos por operación con cotizaciones y usuarios.
- [ ] Definir gobernanza de incidentes, conservación de evidencia, recuperación de accesos y tratamiento de disputas.
- [ ] Autorizar por separado una eventual etapa real, con alcance y revisión propios; no reutilizar la demo como producto financiero.

## 10. Estado de las cinco tareas del ticket

- **Estadísticas y capital de trabajo:** documentado el dato verificado de INYM y un ejemplo sintético. Pendientes fuente precisa para 6–24 meses y medición financiera de campo; no marcar extracción completa de estadísticas INYM/INTA.
- **Por qué blockchain:** argumento y alternativa centralizada documentados; corregidas las afirmaciones sobre título ejecutivo, no custodia e intermediación.
- **Esquema de custodia:** condiciones y ruta jurídica documentadas. Pendientes dictamen, contratos, comprobación del depósito y póliza; no afirmar viabilidad legal acreditada.
- **Puente monetario:** recorrido y función de SEP-24 aclarados. Proveedor USDC/ARS e integración pendientes y fuera del MVP.
- **Monetización:** hipótesis de 0,75 %, base de cobro, ejemplo y costos documentados. Pendientes validación comercial e instrumentación; no hay cobro implementado.

El ticket puede pasar a revisión documental. Su aprobación no implica que las condiciones de un piloto real estén cumplidas. No se actualizó Trello ni se enviaron comunicaciones al equipo.

### Handoff

- Persona: Docs & Pitch
- Changed: docs/legal-risk.md
- ABI change: no
- Tests: revisión documental, fuentes enlazadas y git diff --check; sin cambios ejecutables
- Evidence: fuentes públicas citadas; evidencia técnica existente en docs/evidence.md; sin entrevistas ni acuerdos aportados
- Next owner: Docs & Pitch — validar hipótesis con participantes y profesional legal; trasladar únicamente afirmaciones verificadas al pitch
- Open questions: fuente primaria para extremos 6–24 meses; demanda y caja; instrumento legal; custodio y póliza; proveedor USDC/ARS; costo total y aceptación del fee
