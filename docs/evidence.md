# Evidencia de Testnet

Estado: contratos desplegados en Testnet; detalle y transacciones confirmadas abajo. La aceptación completa de la app con Freighter todavía está pendiente; conexión y firma de mensaje para carga de imagen verificadas el 17/10/2026 (detalle al final).

Los futuros despliegues deberán registrar red, contrato, ID, hash de transacción y enlace de Stellar Expert Testnet. No se deben inventar IDs ni usar resultados locales como evidencia on-chain.

## Deployment 92d499bc1a5d17c5

- Source commit: `3e0af6f38112bd24595f1144bba082e8158e0f73`.
- Stellar Testnet only; self-issued test USDC, not Circle USDC.
- Keys: local Stellar CLI identities in ignored `.stellar/`; synthetic data only.
- Immutable registry/vault/settlement wiring verified through contract queries.
- usdc: [CCY7HWQXSH7PL2NZHLLOHKXY2IOGLAIQLZKF7WAHYZQNN2NAJGIDKEJM](https://stellar.expert/explorer/testnet/contract/CCY7HWQXSH7PL2NZHLLOHKXY2IOGLAIQLZKF7WAHYZQNN2NAJGIDKEJM).
- registry: [CCRHTCAQAV6H5FJOTLYSZS2TKBWS6575HJ72V4JUSKQ2LEARSVSUGJ52](https://stellar.expert/explorer/testnet/contract/CCRHTCAQAV6H5FJOTLYSZS2TKBWS6575HJ72V4JUSKQ2LEARSVSUGJ52).
- vault: [CAJPPBICP3KATPMPZMKXYGXOFAW5T63TD5B42MYNDPSVGZM5CQTUUB74](https://stellar.expert/explorer/testnet/contract/CAJPPBICP3KATPMPZMKXYGXOFAW5T63TD5B42MYNDPSVGZM5CQTUUB74).
- registry Wasm SHA-256: `06516af3cc87422d2d515b2224dd640a79c4061208ddf897f5ce79549523de67`.
- vault Wasm SHA-256: `b91fc066e881216f92d93c03360605a121cd32211003534710c6d6223fc17504`.
- Deploy test USDC SAC: [ef4173655346b48a2c281aff801f3df74cb8b1a39b525f0e8f44f552ad3a5059](https://stellar.expert/explorer/testnet/tx/ef4173655346b48a2c281aff801f3df74cb8b1a39b525f0e8f44f552ad3a5059) (ledger 5219851, RPC SUCCESS).
- Deploy registry: [a665bb3d50f0d46055b4fade27c442ebf777663d718815be7475706dd338ab6b](https://stellar.expert/explorer/testnet/tx/a665bb3d50f0d46055b4fade27c442ebf777663d718815be7475706dd338ab6b) (ledger 5219854, RPC SUCCESS).
- Deploy registry: [4bb114874af903535636748c5d1a2b947dc6a2d89e37d0c058c96cfbd0ee9c0d](https://stellar.expert/explorer/testnet/tx/4bb114874af903535636748c5d1a2b947dc6a2d89e37d0c058c96cfbd0ee9c0d) (ledger 5219855, RPC SUCCESS).
- Deploy vault: [24ea3f7307a8876cdda49a80704856073ec97c965a44794742de78c20345bd04](https://stellar.expert/explorer/testnet/tx/24ea3f7307a8876cdda49a80704856073ec97c965a44794742de78c20345bd04) (ledger 5219857, RPC SUCCESS).
- Deploy vault: [c441f3651750230de9764882c404fc2911112029fe2a19996207210f71ec9b9c](https://stellar.expert/explorer/testnet/tx/c441f3651750230de9764882c404fc2911112029fe2a19996207210f71ec9b9c) (ledger 5219858, RPC SUCCESS).

## Deployment 4d2e8e0c36bc7699

- Source commit: `caf59f60855b8aa1fccec8ed3d67848a0099cbcb`.
- Stellar Testnet only; self-issued test USDC, not Circle USDC.
- Keys: local Stellar CLI identities in ignored `.stellar/`; synthetic data only.
- Immutable registry/vault/settlement wiring verified through contract queries.
- usdc: [CCY7HWQXSH7PL2NZHLLOHKXY2IOGLAIQLZKF7WAHYZQNN2NAJGIDKEJM](https://stellar.expert/explorer/testnet/contract/CCY7HWQXSH7PL2NZHLLOHKXY2IOGLAIQLZKF7WAHYZQNN2NAJGIDKEJM).
- registry: [CBS7LFX54UPME7UU4NUZ2UKM5XL5KBMUWIYXW6SNSZKMORZJ7UAEQNN2](https://stellar.expert/explorer/testnet/contract/CBS7LFX54UPME7UU4NUZ2UKM5XL5KBMUWIYXW6SNSZKMORZJ7UAEQNN2).
- vault: [CAUF5CYPJXY2HUBY2XI67QY55A5QESGCKPOV664Q3JMDVG7URZWDH32U](https://stellar.expert/explorer/testnet/contract/CAUF5CYPJXY2HUBY2XI67QY55A5QESGCKPOV664Q3JMDVG7URZWDH32U).
- registry Wasm SHA-256: `06516af3cc87422d2d515b2224dd640a79c4061208ddf897f5ce79549523de67`.
- vault Wasm SHA-256: `36bd65f277623d41301f54b328f2dd9982860d787d348b530e7305c50bede643`.
- Deploy registry: [3d2b3b728871d50e12ba0ae03b0a97d8348f3e85e78493ed753ef65c7cd6e995](https://stellar.expert/explorer/testnet/tx/3d2b3b728871d50e12ba0ae03b0a97d8348f3e85e78493ed753ef65c7cd6e995) (ledger 5220046, RPC SUCCESS).
- Deploy vault: [5a93f928fa00804a92a3fd0a0fcdc7e059d57f56a9f1d578e29c4b3c926c1ca9](https://stellar.expert/explorer/testnet/tx/5a93f928fa00804a92a3fd0a0fcdc7e059d57f56a9f1d578e29c4b3c926c1ca9) (ledger 5220048, RPC SUCCESS).
- Deploy vault: [c69852af8da6dc30c9bccf8b1a433404b7aeeecad81ed1734605f4d6e8e9f61c](https://stellar.expert/explorer/testnet/tx/c69852af8da6dc30c9bccf8b1a433404b7aeeecad81ed1734605f4d6e8e9f61c) (ledger 5220049, RPC SUCCESS).

## First-deployment repayment regression

The initial deployment (registry CCRHTCAQAV6H5FJOTLYSZS2TKBWS6575HJ72V4JUSKQ2LEARSVSUGJ52, vault CAJPPBICP3KATPMPZMKXYGXOFAW5T63TD5B42MYNDPSVGZM5CQTUUB74) is obsolete for the demo. Funding and partial repayment succeeded, but full repayment failed authorization as ledger-time interest changed the nested SAC transfer amount. Failed transaction: [4209bfe6165912d2ec20ee1ff0b673771585fd17cd44c509ee1cf9d36a6198dc](https://stellar.expert/explorer/testnet/tx/4209bfe6165912d2ec20ee1ff0b673771585fd17cd44c509ee1cf9d36a6198dc). Its loan was not marked repaid. ADR-011 records the correction; the 0.3 deployment uses fresh lots. No real funds or physical goods were involved.

## Synthetic CLI demo 4d2e8e0c36bc7699

CLI-signed, synthetic data only. Freighter/browser acceptance remains pending.
Happy path includes co-signed verification, direct funding, inspection, partial repayment, co-signed withdrawal and full repayment.
Risk path preserves Impaired after the lender claims the receipt. Physical recovery is off-chain.
- Trustline coop: [9c56a96d5f7d989e1ca401f910de2df508cd3c84aed6cccbfca489ef08f6d4e8](https://stellar.expert/explorer/testnet/tx/9c56a96d5f7d989e1ca401f910de2df508cd3c84aed6cccbfca489ef08f6d4e8) (RPC SUCCESS).
- Mint test USDC to coop: [9f2508aec36d7fb2113571beed8d485d624a9c11875282196edf94a9eb4130d3](https://stellar.expert/explorer/testnet/tx/9f2508aec36d7fb2113571beed8d485d624a9c11875282196edf94a9eb4130d3) (RPC SUCCESS).
- Trustline fund: [5c3fb044209cf6eebdc838bd35baf02b2036f88f52155d7b3f446021576cf00f](https://stellar.expert/explorer/testnet/tx/5c3fb044209cf6eebdc838bd35baf02b2036f88f52155d7b3f446021576cf00f) (RPC SUCCESS).
- Mint test USDC to fund: [820a620528831ba8ca9c879bf505b6324aedf0c60183ceaa68dacfa0e57aebcd](https://stellar.expert/explorer/testnet/tx/820a620528831ba8ca9c879bf505b6324aedf0c60183ceaa68dacfa0e57aebcd) (RPC SUCCESS).
- Grant Custodian: [c362ac2c29f9fd287102a2135e3e0c8c7ee5bdc718d9ba631cd789f58a4a0f4d](https://stellar.expert/explorer/testnet/tx/c362ac2c29f9fd287102a2135e3e0c8c7ee5bdc718d9ba631cd789f58a4a0f4d) (RPC SUCCESS).
- Grant Verifier: [8858bef6afa62ff69a249b665f62e8e884ded32b16b8a9eebd0e92c87d50ead9](https://stellar.expert/explorer/testnet/tx/8858bef6afa62ff69a249b665f62e8e884ded32b16b8a9eebd0e92c87d50ead9) (RPC SUCCESS).
- Grant PriceOracle: [a2d8994dcc616433fba945a22aebae8a73ff7b9301c0acc83c756dc19266ceeb](https://stellar.expert/explorer/testnet/tx/a2d8994dcc616433fba945a22aebae8a73ff7b9301c0acc83c756dc19266ceeb) (RPC SUCCESS).
- happy: register lot: [71c5280e3d5e6b10884bdcce9ceab42a946f853d523b4387e4c3ee78090475d0](https://stellar.expert/explorer/testnet/tx/71c5280e3d5e6b10884bdcce9ceab42a946f853d523b4387e4c3ee78090475d0) (RPC SUCCESS).
- happy: verify with custodian: [055429db911618b2fd9c314e74fc771ab467a0e4e18489f3be71e034eed89a49](https://stellar.expert/explorer/testnet/tx/055429db911618b2fd9c314e74fc771ab467a0e4e18489f3be71e034eed89a49) (RPC SUCCESS).
- happy: issue receipt: [9aa1bf7b118692ece317c217ba9001129492ab80693eea1fbf0dbd6907294a1b](https://stellar.expert/explorer/testnet/tx/9aa1bf7b118692ece317c217ba9001129492ab80693eea1fbf0dbd6907294a1b) (RPC SUCCESS).
- happy: value collateral: [334348f0806ef345b3ba97645cd7d4998147708720bb4f52cf51aa3179933d43](https://stellar.expert/explorer/testnet/tx/334348f0806ef345b3ba97645cd7d4998147708720bb4f52cf51aa3179933d43) (RPC SUCCESS).
- happy: request and lock: [020dc5f637f6ee534d2df84516b94584021a6247f8c1173c7af3d39096d25110](https://stellar.expert/explorer/testnet/tx/020dc5f637f6ee534d2df84516b94584021a6247f8c1173c7af3d39096d25110) (RPC SUCCESS).
- happy: fund: [290efd8f33d5c1b971515f65d40716ad83faf6900fad5b2b53329dba4e8f369f](https://stellar.expert/explorer/testnet/tx/290efd8f33d5c1b971515f65d40716ad83faf6900fad5b2b53329dba4e8f369f) (RPC SUCCESS).
- happy: inspect: [ef18d17d88b48513e02af7a74a0b8ef481082cb751121b0833c27ccfdbb813db](https://stellar.expert/explorer/testnet/tx/ef18d17d88b48513e02af7a74a0b8ef481082cb751121b0833c27ccfdbb813db) (RPC SUCCESS).
- happy: approve partial repayment: [9fd8ea818045592f9f8a4c7270407ba0f1c11d254de8b1997f9bd2ef5a0b91dc](https://stellar.expert/explorer/testnet/tx/9fd8ea818045592f9f8a4c7270407ba0f1c11d254de8b1997f9bd2ef5a0b91dc) (RPC SUCCESS).
- happy: partial repayment: [067423b923f25d7071e8c3beea3277d56e8f04763d8043fe865781e1a8be407f](https://stellar.expert/explorer/testnet/tx/067423b923f25d7071e8c3beea3277d56e8f04763d8043fe865781e1a8be407f) (RPC SUCCESS).
- happy: partial withdrawal: [0a6caeb5c33fe53016ebfc5ebbb038358d91d3dc0d673e1a8c8b25a345851987](https://stellar.expert/explorer/testnet/tx/0a6caeb5c33fe53016ebfc5ebbb038358d91d3dc0d673e1a8c8b25a345851987) (RPC SUCCESS).
- happy: approve capped full repayment: [c425d0ffd67b2f100fc82656b7e39478a9d684bbcd5936823ae32ba8d6565f5a](https://stellar.expert/explorer/testnet/tx/c425d0ffd67b2f100fc82656b7e39478a9d684bbcd5936823ae32ba8d6565f5a) (RPC SUCCESS).
- happy: full repayment and unlock: [95ea92cae510e7dfef7b12ba7b4f2e09ff93b16aeafcbf6489476189e3cb2cd1](https://stellar.expert/explorer/testnet/tx/95ea92cae510e7dfef7b12ba7b4f2e09ff93b16aeafcbf6489476189e3cb2cd1) (RPC SUCCESS).
- happy: revoke unused allowance: [01204c577d5a0e6bef8b8b7317ec4774a2394c4a27ca7d66fa0f8a735c9acae3](https://stellar.expert/explorer/testnet/tx/01204c577d5a0e6bef8b8b7317ec4774a2394c4a27ca7d66fa0f8a735c9acae3) (RPC SUCCESS).
- risk: register lot: [c6027b3c0c8b078f5cefa9975b8de02b6b65f74ec3fb80e76c571ae5bf024d80](https://stellar.expert/explorer/testnet/tx/c6027b3c0c8b078f5cefa9975b8de02b6b65f74ec3fb80e76c571ae5bf024d80) (RPC SUCCESS).
- risk: verify with custodian: [c29e7770ccbf5c539c67768684d0166cbf25993022bc27aa9179591c3db63eb2](https://stellar.expert/explorer/testnet/tx/c29e7770ccbf5c539c67768684d0166cbf25993022bc27aa9179591c3db63eb2) (RPC SUCCESS).
- risk: issue receipt: [8ac1603a64f03f7d201d96debc34847466691f4538c50f93e497ac34654838b1](https://stellar.expert/explorer/testnet/tx/8ac1603a64f03f7d201d96debc34847466691f4538c50f93e497ac34654838b1) (RPC SUCCESS).
- risk: value collateral: [e33c87226574f8f9ccc87846b9bf9df6c30738aadcbb118027dfc1c1db308491](https://stellar.expert/explorer/testnet/tx/e33c87226574f8f9ccc87846b9bf9df6c30738aadcbb118027dfc1c1db308491) (RPC SUCCESS).
- risk: request and lock: [c70746f953538af3b12388fcb3f67fcab93ba83d30dff84b6af4c04cc1f36659](https://stellar.expert/explorer/testnet/tx/c70746f953538af3b12388fcb3f67fcab93ba83d30dff84b6af4c04cc1f36659) (RPC SUCCESS).
- risk: fund: [e39d03d10484a15aba4c2f2c1539edc27a07bb70cc727c2b8cefd63e5715ff72](https://stellar.expert/explorer/testnet/tx/e39d03d10484a15aba4c2f2c1539edc27a07bb70cc727c2b8cefd63e5715ff72) (RPC SUCCESS).
- risk: impair: [0f60f7f92f57ff26f4892b36db069910b9c952c07e972e32ade08aafd422fc2c](https://stellar.expert/explorer/testnet/tx/0f60f7f92f57ff26f4892b36db069910b9c952c07e972e32ade08aafd422fc2c) (RPC SUCCESS).
- risk: default: [c184a3750ca141bd2600179031f0d0f4a2cf1da54670ad032f7c54ae0d5783a1](https://stellar.expert/explorer/testnet/tx/c184a3750ca141bd2600179031f0d0f4a2cf1da54670ad032f7c54ae0d5783a1) (RPC SUCCESS).
- risk: claim receipt: [58bb551ddfe915cb6cdc68cc4b870edb76cd7d3c81c4da9c024e5644b7ce8080](https://stellar.expert/explorer/testnet/tx/58bb551ddfe915cb6cdc68cc4b870edb76cd7d3c81c4da9c024e5644b7ce8080) (RPC SUCCESS).

## Local app verification — 2026-10-16

- Public queries read the current Testnet lot 1 as Verified / Receipted, 11.000 kg, with loan 1 Repaid and zero debt; lot 2 remains Impaired / Receipted after lender claim.
- The indexer projected both confirmed paths; public gateway history includes ledger and transaction provenance. This is a derived read model, not the authority for balances or permissions.
- Evidence downloaded through `/api/evidence/4f2381ecef2a5b3894101f48d117866e92c8052c547178976a622240c296ff76` reproduced the SHA-256 recorded in lot 1's LotVerified event.
- Desktop/mobile read-only Testnet browser tests passed; screenshots remain local in app/test-results (ignored). They verify queries and missing-wallet handling, not a real Freighter signature.
- Human Freighter signing/recording remains pending. The CLI demo and native test harness do not satisfy that acceptance item.

## Freighter y evidencia local — 2026-10-17

- Chrome con extensión Freighter oficial, red Testnet y app en `http://127.0.0.1:3000/dashboard`.
- Cuenta pública conectada: `GB4T2BPEQHTQDIJRNZD355KY4GNYEG2VK6XUIG6YENBS74IQHAYX5FRH`. Friendbot fondeó XLM de prueba; esto no acredita saldo del USDC propio de la demo.
- El admin local otorgó `Verifier` **mediante Stellar CLI**, no Freighter: [320bb706856537a43b9d86260cc3ce4a9e1e2148207c982f6784bbb04b2bc3c0](https://stellar.expert/explorer/testnet/tx/320bb706856537a43b9d86260cc3ce4a9e1e2148207c982f6784bbb04b2bc3c0). RPC consultado nuevamente: `SUCCESS`, ledger `5237403`. Consulta generada `has_role`: true.
- Desde la interfaz de Verificaciones se seleccionó una ilustración PNG explícitamente sintética y se autorizó el permiso de carga con **firma de mensaje de Freighter**. El diálogo mostró origen local, cuenta, registry, Testnet, hash y nonce. No fue una transacción on-chain ni una atestación del lote.
- La app confirmó «Imagen guardada localmente» e informó que IPFS no estaba configurado. SHA-256: `8d6d9dc240b4575e70bb7267f65604f6fa4a529d7e5e61989e98fe14cfeceed2`.
- Se recuperaron 9.436 bytes desde `/api/evidence/8d6d9dc240b4575e70bb7267f65604f6fa4a529d7e5e61989e98fe14cfeceed2`; el SHA-256 calculado coincide. Esta URL depende del servidor y almacenamiento locales; no es una publicación IPFS ni una URL externa persistente.
- `/api/system` respondió `testnet_ready`, registry/vault/evidence disponibles. Se reinició el proceso del indexador y confirmó lectura de un nuevo evento, sin modificar contratos.
- Consultas nuevas con clientes generados: lote 1 `Verified` / `Receipted`, 11.000 kg, préstamo 1 `Repaid`, deuda cero; lote 2 `Impaired` / `Receipted`, 12.000 kg, préstamo 2 `Liquidated`. Su exposición congelada es contabilidad del reclamo, no un saldo nuevamente cobrable.
- El gateway público devolvió 12 eventos para lote 1 y 11 para lote 2 en la consulta de esta sesión. Estos historiales corresponden a los recorridos CLI previos; no son nuevos recorridos Freighter.

**Pendiente:** creación de las cuentas Freighter restantes (la extensión solicitó la contraseña al crear otra dirección), preparación de trustlines y saldo USDC, ejecución completa de transacciones/cofirmas desde la web y grabación humana. La firma de mensaje anterior no satisface estos puntos. No se registran contraseñas, claves ni frases de recuperación.

### Handoff
- Persona: DevOps / Release Engineer
- Changed: docs/evidence.md
- ABI change: no
- Tests: RPC getTransaction → SUCCESS; has_role → true; descarga de evidencia → hash coincidente; api/system → testnet_ready; historiales de lotes → disponibles.
- Evidence: transacción y SHA-256 indicados arriba.
- Next owner: equipo de demo — completar cuentas y aceptación Freighter.
- Open questions: acceso humano a la contraseña de Freighter; no compartirla en el chat.

## Preparación de cuentas Freighter — 2026-10-17

- `Demo Cooperativa`: `GDRLQQ66C33UN2UKRLOWY67G65COHR543PVPSWT43PKYTWHKCGON3WKH`. Dirección creada por el usuario en Freighter; cuenta consultada en Horizon con 10.000 XLM de prueba y sin trustline USDC en esa consulta. No se registró ni exportó la clave privada.
- `Demo Custodio`: `GBJAGVBMNOVAXQXB7PADZ4FBGFY5IBYCI2Z4JLG3VAL5SSICPHXDF6N6`. Dirección creada por el usuario en Freighter y nombrada en la interfaz. Fondeo Friendbot confirmado: [211936a476360091b2a5e17280b4cda27372941eb53ff6054a54e166fbf64998](https://stellar.expert/explorer/testnet/tx/211936a476360091b2a5e17280b4cda27372941eb53ff6054a54e166fbf64998).
- Rol Custodian otorgado por admin mediante **CLI**, no firma Freighter: [cd85d4ee89bb29af084246227e1dbef6e3b0918a8871074765b7c32e8e7287fc](https://stellar.expert/explorer/testnet/tx/cd85d4ee89bb29af084246227e1dbef6e3b0918a8871074765b7c32e8e7287fc). CLI informó éxito y evento RoleGranted.
- El selector de Freighter mostró tres cuentas en esta revisión: verificador original, cooperativa y custodio. Valuador e inversor siguen pendientes de creación por el usuario; no se marca preparado el recorrido completo.

## Cuentas completas y primeras transacciones web — 2026-10-17

- `Demo Valuador`: `GBESJIFEN4V3N6OZUKLREFY75QWUY5TG4HTTEXERRWV6LGADFBBGKDRZ`. Friendbot: [2bcba75c2eacf9671db907db65eb085379dac6686b96c21aca1ec01689454cac](https://stellar.expert/explorer/testnet/tx/2bcba75c2eacf9671db907db65eb085379dac6686b96c21aca1ec01689454cac). Rol PriceOracle otorgado por admin CLI: [ede746968a2eb96fbce9003963acff6fab4c2e7d105cf80aea61be4402904e63](https://stellar.expert/explorer/testnet/tx/ede746968a2eb96fbce9003963acff6fab4c2e7d105cf80aea61be4402904e63).
- `Demo Inversor`: `GAHB2FIMVBXCLHKE5MKD4IMNY6NGTFRHVXJG5NQXA66RDOOWMIGBD64L`. Friendbot: [a2a9c888f9a7b78a838b69c84df96a3affcfc6ed400f80db3146735a84c20e33](https://stellar.expert/explorer/testnet/tx/a2a9c888f9a7b78a838b69c84df96a3affcfc6ed400f80db3146735a84c20e33).
- Trustlines del USDC propio de demo agregadas desde la interfaz Freighter para cooperativa e inversor, ambas con pantalla Success. Consulta Horizon posterior confirmó el activo y saldo de 1.000 USDC en cooperativa y 20.000 en inversor. Fondos sintéticos distribuidos por el emisor CLI: [cce106f0592b2206661802ef67cddcdb89cecb313085661e8bdf6035541dc9ab](https://stellar.expert/explorer/testnet/tx/cce106f0592b2206661802ef67cddcdb89cecb313085661e8bdf6035541dc9ab) y [0c12bfd575cb6614af8be56b9a208480c4bb17a1f96b8f2e7ee3607d20d7bbcf](https://stellar.expert/explorer/testnet/tx/0c12bfd575cb6614af8be56b9a208480c4bb17a1f96b8f2e7ee3607d20d7bbcf).
- Nueve comprobantes `.txt` del kit se cargaron mediante el gateway local de desarrollo y se contrastó cada hash. Esto prepara archivos, no firma atestaciones.
- **Registro web con Freighter**, lote 3, 12.000 kg, cooperativa y custodio nuevos: [844ab4679914a291e52f142f09d3613472e93c04ed5b78f21715a550c6ed4142](https://stellar.expert/explorer/testnet/tx/844ab4679914a291e52f142f09d3613472e93c04ed5b78f21715a550c6ed4142). App mostró Confirmada en Testnet; consulta generada confirmó Registered / Unissued y los participantes.
- **Verificación web con cofirma Freighter**, lote 3, 12.000 kg y 5 % humedad: [3f58e643651d679a4308b56681dd8c596930d9231c07a5075e4392beaf8c8869](https://stellar.expert/explorer/testnet/tx/3f58e643651d679a4308b56681dd8c596930d9231c07a5075e4392beaf8c8869). Custodio confirmó la autorización `verify_lot`; verificador original confirmó la transacción final. La app mostró Confirmada en Testnet. Evidencia: `78d9ea57b1ed82de977c1845d5f9a4ab102af60dd2473a3f66468be315d9bbc2`.

Esta sección registra ejecución mediante control de la interfaz y firmas de la extensión; no es una grabación humana ni acredita haber terminado los dos recorridos financieros.

- Emisión del certificado del lote 3, desde app con Freighter: [2b6d10d07f7739721b6b365fb8794679019ac7b36d71ea8c71cdba86c5215676](https://stellar.expert/explorer/testnet/tx/2b6d10d07f7739721b6b365fb8794679019ac7b36d71ea8c71cdba86c5215676), app Confirmada en Testnet.
- Valuación sintética del lote 3 por Demo Valuador, 12.000 USDC de prueba, desde app con Freighter: [e720638571916a2e638675fa51a2c9a5148ada718a861e7e284ae6f84fe99c1a](https://stellar.expert/explorer/testnet/tx/e720638571916a2e638675fa51a2c9a5148ada718a861e7e284ae6f84fe99c1a), app Confirmada en Testnet.

- Solicitud web con Freighter, préstamo 3 sobre lote 3: 5.000 USDC, 12 % anual y 180 días: [9e26b342b322b08b35fe6a188396692435443de9e6b8f04a642bdf4ba28a5003](https://stellar.expert/explorer/testnet/tx/9e26b342b322b08b35fe6a188396692435443de9e6b8f04a642bdf4ba28a5003). App confirmó la operación; consulta generada confirmó Requested antes del fondeo.
- Fondeo web con Freighter por Demo Inversor: [7924b9b53de0536441f2573f235157b9c83b845cebe77173b82556440740c29e](https://stellar.expert/explorer/testnet/tx/7924b9b53de0536441f2573f235157b9c83b845cebe77173b82556440740c29e). App mostró Confirmada en Testnet y préstamo Financiado. Consulta generada confirmó Funded, principal 5.000 USDC y lender/borrower correctos. Horizon confirmó cooperativa con 6.000 USDC (antes 1.000) e inversor con 15.000 (antes 20.000): transferencia directa de 5.000 USDC de prueba.
- La inspección de lote 3 quedó completada en el formulario con 12.000 kg, humedad 5 % y evidencia `08919c431260f9562d9e9c48c81e3bc089cddf2f09f2b0d9a434fe843cd3e8d1`, todavía sin enviar. El acceso automático a páginas internas de la extensión fue rechazado por la política del navegador; se pidió al usuario seleccionar la cuenta verificadora y confirmar las próximas firmas. No se intentó eludir ese rechazo con otro mecanismo.

- Inspección aprobada del lote 3 confirmada desde la web, con **confirmación humana en Freighter**: [a51ec07a73fcfd9c680f47d9c84e914c30889dab8f7d58779cceb96aecd89a30](https://stellar.expert/explorer/testnet/tx/a51ec07a73fcfd9c680f47d9c84e914c30889dab8f7d58779cceb96aecd89a30). App mostró Confirmada en Testnet. Se conservaron 12.000 kg y humedad 5 % en los datos enviados.
- Al preparar el permiso de repago, la app aún detectó la cuenta verificadora; se descartó esa preparación antes de firmar y se pidió seleccionar Demo Cooperativa. No se autorizó gasto desde el verificador.

- Simulador MoneyGram revisado desde la interfaz: 1.000 USDC → 1.280.000 ARS, destino ficticio Posadas; 5.000 USDC → 6.400.000 ARS, cuenta bancaria ficticia. Ambos resultados mostraron ausencia de transacción, orden y código de retiro. Se cerró el diálogo y se comprobó que quedó oculto. Son cálculos locales con supuesto fijo, sin cotización ni integración externa.
