#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

cargo fmt --all --check
# vault imports the registry ABI from this artifact, including in native tests.
stellar contract build --package yerbacapital-registry --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
stellar contract build --package yerbacapital-vault --locked
