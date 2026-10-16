#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Generate from the exact deployed Wasm; runtime IDs are configuration, not ABI.
if [[ "${1:-}" == --check ]]; then
  temporary="$(mktemp -d)"
  trap 'rm -rf "$temporary"' EXIT
  destination="$temporary"
else
  destination=packages
fi
python3 scripts/prepare-sac-spec.py
for name in registry vault settlement; do
  wasm="target/wasm32v1-none/release/yerbacapital_${name}.wasm"
  if [[ "$name" == settlement ]]; then wasm=target/test-usdc-sac-interface.wasm; fi
  stellar contract bindings typescript \
    --wasm "$wasm" \
    --output-dir "${destination}/${name}-client" --overwrite
  if [[ "${1:-}" == --check ]]; then
    diff -ru --exclude=node_modules --exclude=dist \
      "packages/${name}-client" "${destination}/${name}-client"
  fi
done
