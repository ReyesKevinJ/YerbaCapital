# 📋 Plan de Tareas y División de Trabajo — YerbaCapital (Hackathon NEA Tech)

> **Objetivo:** Completar los entregables obligatorios para Stellar APEX y NEA Tech 2026.
> **Regla de oro:** Cada integrante se enfoca en su área sin bloquear al otro.

---

## 👤 Responsable 1: Integración Técnica, Despliegue y Web (Dev Lead)

### 1. Despliegue en Stellar Testnet y Evidencia On-Chain
- [ ] Ejecutar `./scripts/deploy.sh` contra la Testnet de Stellar.
- [ ] Copiar los Contract IDs generados (`REGISTRY_ID`, `VAULT_ID`, `USDC_ID`).
- [ ] Ejecutar `./scripts/seed-demo.sh` para simular el ciclo completo:
  - Registro de lote yerbatero.
  - Firma y verificación física con hash IPFS.
  - Solicitud y fondeo de préstamo en testnet USDC.
  - Repago y liberación de colateral.
- [ ] Guardar los hashes de las transacciones y verificar que abran en **Stellar Expert Testnet**.
- [ ] Pegar los links y Contract IDs en `docs/evidence.md`.

### 2. Subida de Imagen a IPFS (Solo Verificador)
- [ ] Configurar endpoint/servicio para subir imagen de inspección (Pinata o mock IPFS reproducible).
- [ ] Restringir en la vista del Verificador que solo este rol pueda adjuntar la foto del lote y generar el CID/hash `BytesN<32>`.
- [ ] Conectar la ficha pública del lote (`/lots/[id]`) para que renderice la imagen desde la gateway IPFS verificando su hash.

### 3. Rampa MoneyGram (SEP-24 para ARS)
- [ ] Integrar el componente de simulación/widget SEP-24 MoneyGram en el panel de la cooperativa.
- [ ] Mostrar en pantalla cómo la cooperativa transforma los USDC del crédito en Pesos Argentinos (ARS) para pagar la cosecha y jornales.

### 4. Despliegue Público de la App Web
- [ ] Desplegar la carpeta `app/` en **Vercel** o **Netlify**.
- [ ] Configurar las variables de entorno (`NEXT_PUBLIC_STELLAR_RPC_URL`, Contract IDs).
- [ ] Probar la navegación y conexión con **Freighter Wallet** en la URL pública desde una ventana de incógnito.

---

## 👤 Responsable 2: Documentación, Video Demo, Pitch y Entrega (Biz & Product Lead)

### 1. Documentación y README Oficial de GitHub
- [ ] Colocar en el encabezado de `README.md` los Contract IDs y los enlaces directos a Stellar Expert.
- [ ] Incluir la lista de tecnologías del stack Stellar usadas: *Soroban (Rust), Freighter Wallet, Stellar SDK, SEP-41 (SAC) y SEP-24 (MoneyGram)*.
- [ ] Redactar la sección obligatoria: **Declaración formal de uso de IA y datos simulados/sintéticos** (usados para aceleración de código y métricas del INYM).
- [ ] Dejar instrucciones paso a paso de cómo clonar y probar el proyecto localmente.

### 2. Grabación del Video Demo (Máximo 5 minutos - Requisito Excluyente)
- [ ] Preparar el guion cronometrado:
  - **Minuto 0:00 - 1:00:** El dolor del NEA (yerba canchada estacionada 6-12 meses inmoviliza capital) y el principio rector: *"El token no es la yerba; es un recibo de depósito verificado"*.
  - **Minuto 1:00 - 2:00:** Rol del Verificador: carga de atestación física, foto en IPFS y registro en el contrato.
  - **Minuto 2:00 - 3:30:** Préstamo en Soroban: solicitud de la cooperativa con LTV seguro, fondeo con Freighter en testnet USDC y repago.
  - **Minuto 3:30 - 4:15:** Mostrar la transacción impactada en vivo en **Stellar Expert** y la rampa MoneyGram a ARS.
  - **Minuto 4:15 - 5:00:** Arquitectura, mitigación de riesgos físicos/legales y cierre.
- [ ] Grabar pantalla y audio.
- [ ] Subir el video a YouTube en modo **"No listado"** (o Google Drive con permisos de acceso público "Cualquiera con el enlace puede ver").
- [ ] Comprobar que el video reproduzca en modo incógnito.

### 3. Pitch Deck en PDF (5 a 7 diapositivas)
- [ ] Diseñar y exportar a PDF la presentación:
  - Slide 1: Problema productivo regional en Misiones/Corrientes (capital atrapado en secaderos).
  - Slide 2: La Solución: YerbaCapital (financiamiento colateralizado con recibos verificables).
  - Slide 3: Arquitectura físico-digital (Custodio + Verificador IPFS + Soroban + Margen LTV).
  - Slide 4: Por qué Stellar (Soroban, SAC USDC, liquidación instantánea, MoneyGram ARS).
  - Slide 5: Capturas del producto funcionando y enlace a Stellar Expert.
  - Slide 6: Matriz de riesgos (seguro de depósito, haircut, qué resuelve blockchain y qué depende de la ley).
  - Slide 7: Modelo de negocio (fee de originación) y equipo.

---

## 🚀 Cierre Conjunto (Checklist Final de Entrega en Stellar APEX)

Antes de las 18:30 hs (cierre estricto a las 19:00 hs):
- [ ] Link del repositorio público de GitHub sin commits pendientes.
- [ ] URL pública de la Demo web navegable (Vercel).
- [ ] Contract IDs y enlace de Stellar Expert con transacciones testnet comprobables.
- [ ] Link del Video Demo (YouTube/Drive abierto).
- [ ] Archivo PDF del Pitch Deck subido.
- [ ] Confirmar envío en la plataforma oficial.