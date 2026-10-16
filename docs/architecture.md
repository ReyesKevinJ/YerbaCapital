# Initial architecture

The target architecture is defined in AGENTS.md §3. This bootstrap implements only local off-chain evidence hashing. It introduces no chain API, financial calculations, role decisions, receipt ownership or signing keys.

Future registry: authoritative roles, lots, attestations and receipt ownership. Future vault: authoritative loans, collateral checks and pass-through settlement. The app will use generated bindings only. The evidence service will store private files off-chain; authorized actors will explicitly sign their hashes.

The local CLI streams exact bytes into SHA-256. It returns a lowercase 64-character hexadecimal digest. Verification accepts either hex case and reports mismatch through exit status. There is no storage, manifest format, HTTP endpoint, indexer or attestation in this slice.

See ADR-006 for the bootstrap scope. Contract and web work starts in separate persona tasks once ownership is assigned.
