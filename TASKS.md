# 📋 Plan de Tareas y División de Trabajo — YerbaCapital (Hackathon NEA Tech)

> **Objetivo:** Completar los entregables obligatorios para Stellar APEX y NEA Tech 2026.  
> **Regla de oro:** Cada integrante se enfoca en su área sin bloquear al otro.

---

## 👤 Responsable 1: Integración Técnica, Despliegue y Web (Dev Lead)

### 1. Despliegue en Stellar Testnet y Evidencia On-Chain
- [x] Ejecutar `./scripts/deploy.sh` (o `python scripts/deploy-testnet.py`) contra Stellar Testnet.
- [x] Generar y vincular los Contract IDs verificados (`REGISTRY_ID`, `VAULT_ID`, `USDC_ID`).
- [x] Ejecutar `./scripts/seed-demo.sh` (o `python scripts/seed-demo.py`) simulando el ciclo completo:
  - Registro de lote yerbatero (12.000 kg yerba canchada).
  - Firma y verificación física con atestación y hash SHA-256.
  - Solicitud de crédito y fondeo en testnet USDC vía Soroban Vault.
  - Inspección física, repago parcial, retiro parcial y repago total con liberación de colateral.
  - Flujo alternativo de riesgo (lote deteriorado / impaired reclamado por el prestamista).
- [x] Validar que las transacciones abran correctamente en **Stellar Expert Testnet**.
- [x] Documentar hashes, contratos y ledgers en `docs/evidence.md` (Run `4d2e8e0c36bc7699`).

### 2. Subida de Imagen a IPFS (Solo Verificador)
- [x] Crear servicio y endpoint seguro `/api/evidence/upload` para subir foto de inspección física.
- [x] Implementar cálculo de IPFS CIDv0 (`Qm...`) y SHA-256 (`BytesN<32>`) con soporte Pinata y fallback determinista.
- [x] Restringir la subida únicamente a billeteras que posean el rol `Verifier` registrado en el contrato Soroban.
- [x] Diseñar el componente UI para el inspector en el panel de Verificaciones del Dashboard (`verifier-inspection-upload.tsx`).
- [x] Conectar la ficha pública del lote (`/lots/[id]`) para renderizar la foto física desde el gateway IPFS con badge de verificación criptográfica.

### 3. Rampa MoneyGram (SEP-24 para ARS)
- [x] Crear el componente y drawer interactivo SEP-24 MoneyGram en `app/src/features/borrower/moneygram-ramp.tsx`.
- [x] Integrar simulador de conversión USDC a Pesos Argentinos (ARS) a tipo de cambio de referencia ($1.280 ARS/USDC con comisión de red bonificada).
- [x] Incluir selector de sucursales de cobro en efectivo en la cuenca yerbatera (*Posadas, Apóstoles, Oberá, Gob. Virasoro, L. N. Alem, San Vicente*) y opción de transferencia por CBU/CVU bancario.
- [x] Añadir acceso directo a la rampa en la barra superior y banner en la sección Financiamiento del dashboard.

### 4. Compilación, Control de Calidad y Despliegue en Vercel
- [x] Validar compilación de producción local Next.js (`pnpm --filter app build` con Turbopack exitoso en 14.5s).
- [x] Generar archivos `.env.production` y `app/.env.production` preconfigurados con los Contract IDs y RPC oficial.
- [x] Verificar que pasen todos los linters y pruebas: `cargo test` (36/36), `cargo clippy`, `pnpm -r typecheck`, `pnpm -r lint` y `pnpm test` (31/31).
- [ ] **Hacer Git commit y push**: Subir los cambios a la rama principal del repositorio en GitHub (`git add .`, `git commit -m "feat: complete IPFS, MoneyGram and Vercel production config"`, `git push origin main`).
- [ ] **Desplegar en Vercel**: Importar el repositorio en Vercel configurando `Root Directory: app` (tomará automáticamente `vercel.json` y `.env.production`).
- [ ] **Validar en vivo**: Abrir la URL pública de Vercel en una ventana de incógnito y comprobar la navegación y conexión con **Freighter Wallet** en Testnet.
- [ ] *(Opcional)* Si se requiere generar un ciclo completamente nuevo en vivo en la Testnet pública: ejecutar `python scripts/deploy-testnet.py` y `python scripts/seed-demo.py`.

---

## 👤 Responsable 2: Documentación, Video Demo, Pitch y Entrega (Biz & Product Lead)

### 1. Documentación y README Oficial de GitHub
- [ ] Colocar en el encabezado de `README.md` los Contract IDs activos y los enlaces directos a Stellar Expert:
  - **Registry**: `CBS7LFX54UPME7UU4NUZ2UKM5XL5KBMUWIYXW6SNSZKMORZJ7UAEQNN2`
  - **Vault**: `CAUF5CYPJXY2HUBY2XI67QY55A5QESGCKPOV664Q3JMDVG7URZWDH32U`
  - **USDC SAC**: `CCY7HWQXSH7PL2NZHLLOHKXY2IOGLAIQLZKF7WAHYZQNN2NAJGIDKEJM`
- [ ] Destacar la lista de tecnologías del stack Stellar implementadas:
  - *Soroban (Rust SDK 29 / Protocol 29)*
  - *Stellar Asset Contract / SEP-41 (USDC)*
  - *Freighter Wallet adapter*
  - *SEP-24 / MoneyGram Access (Off-Ramp a ARS en NEA)*
  - *Almacenamiento descentralizado de evidencia en IPFS con hash on-chain `BytesN<32>`*
- [ ] Redactar la sección obligatoria: **Declaración formal de uso de IA y datos simulados/sintéticos** (indicando uso de herramientas de asistencia de código y parámetros plausibles basados en regulaciones del INYM).
- [ ] Revisar que las instrucciones de clonado y demo local sean claras y reproducibles para el jurado.

### 2. Grabación del Video Demo (Máximo 5 minutos — Requisito Excluyente)
- [ ] Preparar y ensayar el guion cronometrado:
  - **0:00 - 1:00 (El dolor del NEA y principio rector):** Explicar cómo el estacionamiento de 6-24 meses inmoviliza millones en capital de secaderos y cooperativas. Enfatizar el principio §1.3: *"El token no es la yerba; es un recibo de depósito verificado con colateralización en Soroban"*.
  - **1:00 - 2:00 (Rol Verificador e IPFS):** Mostrar en pantalla la vista del inspector: carga de foto física de inspección, generación del CID de IPFS + hash SHA-256 on-chain, y cómo impacta en la ficha pública del lote.
  - **2:00 - 3:30 (Crédito en Soroban y Freighter):** Cooperativa solicita crédito con LTV seguro (50-60%), inversor fondea en testnet USDC firmando con Freighter, y se muestra el repago con tasa simple.
  - **3:30 - 4:15 (Trazabilidad y Rampa MoneyGram ARS):** Mostrar la transacción en vivo en **Stellar Expert**, y simular cómo la cooperativa convierte esos USDC a efectivo en sucursales MoneyGram (Posadas/Apóstoles/etc.) o CBU para liquidar tareferos.
  - **4:15 - 5:00 (Arquitectura, riesgos y cierre):** Resumir la seguridad non-custodial, separación física vs legal, y proyección del protocolo.
- [ ] Grabar pantalla en alta resolución y audio claro.
- [ ] Subir el video a YouTube en modo **"No listado"** (o Google Drive con permisos públicos "Cualquiera con el enlace puede ver").
- [ ] Comprobar que el enlace abra y reproduzca sin requerir inicio de sesión en modo incógnito.

### 3. Pitch Deck en PDF (5 a 7 diapositivas)
- [ ] Diseñar y exportar a PDF la presentación:
  - **Slide 1:** Problema regional de la yerba mate en Misiones y Corrientes (capital de trabajo inmovilizado en secaderos y noques).
  - **Slide 2:** La Solución: YerbaCapital (recibos tokenizados de depósito con gravamen programable en Soroban).
  - **Slide 3:** Arquitectura físico-digital (Custodio + Verificador con evidencia IPFS + Contratos Soroban + Margen LTV contra pérdidas).
  - **Slide 4:** Por qué Stellar (Soroban smart contracts, SAC USDC instantáneo, costo mínimo y MoneyGram Access para efectivo local).
  - **Slide 5:** Producto funcionando en vivo (capturas del dashboard, ficha pública IPFS y transacciones en Stellar Expert).
  - **Slide 6:** Matriz de mitigación de riesgos (seguro de depósito, haircut de valuación, qué resuelve blockchain y qué depende de la ley).
  - **Slide 7:** Modelo de negocio (fee de originación), impacto socio-productivo en el NEA y equipo.
- [ ] Exportar archivo en formato PDF optimizado (peso < 15 MB).

---

## 🚀 Cierre Conjunto (Checklist Final de Entrega en Stellar APEX / NEA Tech)

Antes de las 18:30 hs (cierre estricto a las 19:00 hs):
- [ ] **Repositorio GitHub**: URL pública del repositorio sin commits pendientes y con `README.md` completo.
- [ ] **App Web en Vivo**: URL pública navegable en Vercel (ej: `https://yerbacapital.vercel.app`).
- [ ] **Evidencia On-Chain**: Contract IDs y enlaces directos a Stellar Expert Testnet funcionales.
- [ ] **Video Demo**: Enlace público accesible (YouTube No listado / Drive abierto).
- [ ] **Pitch Deck**: Archivo PDF subido a la plataforma oficial.
- [ ] **Formulario Oficial**: Confirmación de envío completada en la plataforma del Hackathon.