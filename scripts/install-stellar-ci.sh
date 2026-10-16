#!/usr/bin/env bash
set -euo pipefail
# CI Linux x86_64 only. SHA-256 pinned from the official release asset digest.
test "$(uname -s)" = Linux
test "$(uname -m)" = x86_64
release=28.1.0
archive="$(mktemp)"
directory="$(mktemp -d)"
trap 'rm -f "$archive"; rm -rf "$directory"' EXIT
curl --fail --location --retry 3 \
  "https://github.com/stellar/stellar-cli/releases/download/v${release}/stellar-cli-${release}-x86_64-unknown-linux-gnu.tar.gz" \
  --output "$archive"
printf '%s  %s\n' c1680deee94301d33ada7a17f98411e642a4248c727afbd2e43050d345746462 "$archive" | sha256sum --check
tar -xzf "$archive" -C "$directory"
mkdir -p "$HOME/.local/bin"
install "$directory/stellar" "$HOME/.local/bin/stellar"
echo "$HOME/.local/bin" >> "$GITHUB_PATH"
