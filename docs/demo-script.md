# Demo de YerbaCapital — solo Testnet

Este guion verifica capacidades, no un producto financiero real. Todos los lotes, documentos, actores y precios son sintéticos. El certificado no garantiza que exista yerba y no ejecuta una recuperación física.

## Preparación

- Usar los contratos actuales de `docs/evidence.md` y `.env.example`; vault debe responder revisión 3.
- Mantener app, servicio e indexador activos. Verificar `/api/system` y la cobertura del historial.
- Usar cuentas Freighter Testnet distintas para cooperativa, custodio y verificador; oracle separado de custodio/verificador. Las cuentas de pago requieren XLM, trustline y USDC propio de prueba del emisor documentado.
- Las identidades del seeder están en la configuración local de Stellar CLI, no dentro de Freighter. La demo de CLI no prueba por sí sola el navegador. Para la aceptación humana, preparar cuentas de Testnet en Freighter y otorgar sus roles con admin; nunca enviar claves al chat.
- Tener hashes de archivos sintéticos recuperables mediante el servicio. Cada afirmación física usa evidencia específica.

## Diez pasos de aceptación

1. **Roles.** Conectar admin, elegir «Otorgar rol» y conceder Custodian, Verifier y PriceOracle a las cuentas correspondientes. Verificar cada transacción confirmada.
2. **Ingreso.** Conectar cooperativa y registrar `YERBA_CANCHADA`, 12.000 kg, custodio, referencia opaca del depósito, inicio no futuro y evidencia. Consultar el lote: Registered / Unissued.
3. **Verificación.** Conectar verifier, preparar verificación de 12.000 kg y humedad 500 bps. Cambiar Freighter al custodio y co-firmar la misma operación; volver a verifier y enviar. Consultar Verified / Unissued y el hash del evento.
4. **Certificado y precio.** Verifier emite el certificado. Oracle publica valuación sintética de 12.000 USDC con evidencia. La consulta al vault devuelve capacidad de 6.120 con los parámetros iniciales; la app no reproduce esa fórmula.
5. **Solicitud.** Cooperativa solicita 5.000 USDC, tasa 1.200 bps, plazo 15.552.000 segundos. Consultar Requested / Encumbered; la solicitud aún no genera deuda.
6. **Fondeo.** Fund conecta y fondea una vez. Verificar LoanFunded y la transferencia del SAC directamente a cooperativa con enlace de Stellar Expert. El vault no retiene el dinero.
7. **Inspección.** Verifier registra inspección aprobada con nueva evidencia, peso actual y humedad. El historial registra autoría; la inspección no renueva automáticamente la valuación.
8. **Repagos.** Cooperativa autoriza un máximo de 1.000 USDC con vencimiento breve, luego firma un repago parcial. Consultar deuda al contrato. Opcional: retirar 1.000 kg con co-firma del custodio, si el contrato admite el remanente. Autorizar un máximo suficiente para el total, consultar y firmar repago total. Se transfiere solo la deuda vigente; verificar Repaid y Receipted sin gravamen. Revocar el permiso sobrante del SAC.
9. **Riesgo.** Repetir ingreso/verificación/certificado/valuación/solicitud/fondeo con otro lote. Verifier atesta deterioro por humedad con evidencia; una cuenta declara default y el lender reclama el certificado. Confirmar Liquidated, nuevo owner y físico Impaired. El texto debe aclarar que la recuperación física es off-chain. No se acepta otro reclamo ni repago posterior.
10. **Consulta pública.** Sin conectar billetera, consultar ambos lotes e historiales. Ver eventos, contratos, ledgers, hashes y enlaces públicos. La exposición congelada del préstamo Liquidated no representa dinero recuperado ni una nueva deuda cobrable por el protocolo.

## Casos de recuperación

- Rechazar una firma no envía la operación; los campos se conservan.
- Red o cuenta equivocada bloquean la firma. Cambiar de rol en el formulario no concede permisos.
- Un timeout después del envío conserva el hash y permite consultar; no reenviar automáticamente.
- Cancelar el repago después de aprobar USDC deja un permiso finito hasta revocación/vencimiento; mostrarlo y ofrecer revocación.
- Si falta historial o hay una discontinuidad de RPC, informar cobertura incompleta; no reconstruir eventos desde el estado actual.

## Evidencia de aceptación

Las transacciones del seeder se registran en `docs/evidence.md` como **CLI**, con datos sintéticos. Las capturas locales de navegador no sustituyen una firma de Freighter. Registrar por separado la ejecución humana, las cuentas públicas/roles usados, hashes y grabación; este documento no afirma que esa aceptación ya haya ocurrido.
