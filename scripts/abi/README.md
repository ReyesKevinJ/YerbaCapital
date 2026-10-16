# Generated SAC interface snapshot

`test-usdc-sac.xdr-base64` was exported by Stellar CLI 28.1.0 from Testnet's builtin Stellar Asset Contract `CCY7HWQXSH7PL2NZHLLOHKXY2IOGLAIQLZKF7WAHYZQNN2NAJGIDKEJM` on 2026-10-16:

```sh
stellar contract info interface --contract-id CCY7HWQXSH7PL2NZHLLOHKXY2IOGLAIQLZKF7WAHYZQNN2NAJGIDKEJM --rpc-url https://soroban-testnet.stellar.org --network-passphrase 'Test SDF Network ; September 2015' --output xdr-base64
```

The snapshot contains the builtin SAC ABI, not an implementation or a private key. `prepare-sac-spec.py` wraps these unchanged XDR bytes in a Wasm custom section so the pinned generator can reproduce `settlement-client` offline. This interface-only file has no executable functions and is never deployed. Runtime settlement IDs come from verified deployment configuration. Refresh the exported ABI and regenerate clients when the network's SAC interface changes; never hand-edit generated types.
