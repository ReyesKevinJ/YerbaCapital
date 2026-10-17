"""Reproducible Testnet deployment. Keys remain in ignored local CLI configuration."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
os.umask(0o077)
RPC = "https://soroban-testnet.stellar.org"
NETWORK = "Test SDF Network ; September 2015"
if os.environ.get("NETWORK_PASSPHRASE", NETWORK) != NETWORK:
    sys.exit("Only Stellar Testnet is supported")
if os.environ.get("STELLAR_RPC_URL", RPC) != RPC:
    sys.exit("Deployment requires the official Stellar Testnet RPC")
if subprocess.check_output(["git", "status", "--porcelain"]).strip():
    sys.exit("Commit the working tree before deploying (AGENTS.md section 5.8)")

STATE = ROOT / ".stellar"
CONFIG = STATE / "stellar"
CLI_ENV = {**os.environ, "XDG_CONFIG_HOME": str(STATE)}
CONFIG.mkdir(mode=0o700, parents=True, exist_ok=True)
os.chmod(CONFIG, 0o700)
artifacts = {
    name: ROOT / f"target/wasm32v1-none/release/yerbacapital_{name}.wasm"
    for name in ("registry", "vault")
}
digests = {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in artifacts.items()}
run_id = hashlib.sha256(json.dumps(digests, sort_keys=True).encode()).hexdigest()[:16]
manifest = STATE / f"deployment-{run_id}.json"
state = json.loads(manifest.read_text()) if manifest.exists() else {
    "network": NETWORK, "rpc": RPC, "run": run_id, "wasm": digests,
    "commit": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
    "addresses": {}, "contracts": {}, "transactions": [],
}
if state.get("pending"):
    sys.exit(f"Unresolved deployment step: {state['pending']}. Inspect RPC before clearing the checkpoint; do not duplicate submission.")


def save():
    manifest.write_text(json.dumps(state, indent=2) + "\n")


def rpc(method, params):
    # curl uses the platform TLS/proxy configuration, including on macOS.
    response = subprocess.run(
        ["curl", "--fail-with-body", "--silent", "--show-error", "--max-time", "30",
         "-H", "Content-Type: application/json", "--data-binary", "@-", RPC],
        input=json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}),
        text=True, capture_output=True, check=True,
    )
    result = json.loads(response.stdout)
    if "error" in result:
        raise RuntimeError(result["error"])
    return result["result"]


def cli(args, label=None):
    proc = subprocess.run(["stellar", "--config-dir", str(CONFIG), *args],
                          text=True, capture_output=True, env=CLI_ENV)
    if proc.returncode:
        # Never echo arbitrary stdout from key-management commands.
        error = re.sub(r"S[A-Z2-7]{55}", "[redacted]", proc.stderr)
        raise RuntimeError(f"stellar command failed: {args[0]}\n{error}")
    if label:
        # CLI also prints Wasm digests: accept only hashes confirmed by RPC.
        for tx in dict.fromkeys(re.findall(r"\b[0-9a-f]{64}\b", proc.stderr)):
            result = rpc("getTransaction", {"hash": tx})
            if result.get("status") == "SUCCESS":
                entry = {"step": label, "hash": tx, "ledger": result["ledger"]}
                if entry not in state["transactions"]:
                    state["transactions"].append(entry)
                    save()
                print(f"{label}: https://stellar.expert/explorer/testnet/tx/{tx}", flush=True)
    return proc.stdout.strip()


version = rpc("getVersionInfo", {})
if version["protocolVersion"] < 29:
    sys.exit("Testnet protocol must support soroban-sdk 29")
net = ["--rpc-url", RPC, "--network-passphrase", NETWORK]
for name in ("admin", "custodian", "verifier", "oracle", "coop", "fund", "usdc-issuer"):
    identity = CONFIG / "identity" / f"{name}.toml"
    if not identity.exists():
        print(f"Creating synthetic Testnet identity: {name}", flush=True)
        cli(["keys", "generate", name, "--fund", *net])
    for key in CONFIG.rglob("*.toml"):
        key.chmod(0o600)
    state["addresses"][name] = cli(["keys", "address", name])
save()

if "usdc" not in state["contracts"]:
    asset = "USDC:" + state["addresses"]["usdc-issuer"]
    identifier = None
    for prior_path in STATE.glob("deployment-*.json"):
        if prior_path == manifest:
            continue
        prior = json.loads(prior_path.read_text())
        if prior.get("addresses", {}).get("usdc-issuer") == state["addresses"]["usdc-issuer"]:
            identifier = prior.get("contracts", {}).get("usdc")
            if identifier:
                name = json.loads(cli(["contract", "invoke", "--id", identifier, "--source-account", "admin",
                                       "--send=no", *net, "--", "name"]))
                if name != asset:
                    raise RuntimeError("Existing SAC does not match the demo issuer")
                print(f"Reusing verified test USDC SAC: {identifier}", flush=True)
                break
    if not identifier:
        state["pending"] = "Deploy test USDC SAC"
        save()
        identifier = cli(["contract", "asset", "deploy", "--asset", asset,
                          "--source-account", "usdc-issuer", *net], "Deploy test USDC SAC")
    state["contracts"]["usdc"] = identifier
    state["pending"] = None
    save()
for name in ("registry", "vault"):
    if name in state["contracts"]:
        continue
    constructor = ["--admin", state["addresses"]["admin"]]
    if name == "vault":
        constructor += ["--registry", state["contracts"]["registry"],
                        "--settlement_asset", state["contracts"]["usdc"]]
    state["pending"] = f"Deploy {name}"
    save()
    # Repeating an unresolved submission must never create another random-address contract.
    salt = hashlib.sha256(f"YerbaCapital:{run_id}:{name}".encode()).hexdigest()
    identifier = cli(["contract", "deploy", "--wasm", str(artifacts[name]), "--salt", salt,
                      "--source-account", "admin", *net, "--", *constructor], f"Deploy {name}")
    if not re.fullmatch(r"C[A-Z2-7]{55}", identifier):
        raise RuntimeError("Deployment did not return a contract address; inspect local manifest")
    state["contracts"][name] = identifier
    state["pending"] = None
    save()

for name, identifier in state["contracts"].items():
    print(f"{name}: {identifier}", flush=True)
# Read-only verification of immutable wiring before any role or lot is created.
vault_config = json.loads(cli(["contract", "invoke", "--id", state["contracts"]["vault"],
                              "--source-account", "admin", "--send=no", *net, "--", "get_config"]))
assert vault_config["registry"] == state["contracts"]["registry"]
assert vault_config["settlement_asset"] == state["contracts"]["usdc"]
bound = json.loads(cli(["contract", "invoke", "--id", state["contracts"]["registry"],
                       "--source-account", "admin", "--send=no", *net, "--", "get_vault"]))
assert bound == state["contracts"]["vault"]

evidence = ROOT / "docs/evidence.md"
marker = f"## Deployment {run_id}"
text = evidence.read_text()
if marker not in text:
    lines = ["", marker, "", f"- Source commit: `{state['commit']}`.",
             "- Stellar Testnet only; self-issued test USDC, not Circle USDC.",
             "- Keys: local Stellar CLI identities in ignored `.stellar/`; synthetic data only.",
             "- Immutable registry/vault/settlement wiring verified through contract queries."]
    for name, identifier in state["contracts"].items():
        lines.append(f"- {name}: [{identifier}](https://stellar.expert/explorer/testnet/contract/{identifier}).")
    for name, digest in digests.items():
    evidence.write_text(text + "\n".join(lines) + "\n")
print(f"Verified deployment manifest: {manifest.relative_to(ROOT)}")

print("\n" + "=" * 78)
print("🚀 YERBACAPITAL — STELLAR TESTNET DEPLOYMENT SUMMARY")
print("=" * 78)
for name, identifier in state["contracts"].items():
    print(f"  {name.upper():<10}: {identifier}")
    print(f"  {'':<10}  https://stellar.expert/explorer/testnet/contract/{identifier}")
print("-" * 78)
print("CONFIRMED TRANSACTIONS ON STELLAR TESTNET:")
for tx in state["transactions"]:
    print(f"  • {tx['step']:<26}: https://stellar.expert/explorer/testnet/tx/{tx['hash']}")
print("=" * 78)

# Automatically write .env.production for seamless Vercel deployment
env_lines = [
    "# Auto-generated by scripts/deploy-testnet.py",
    'NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"',
    'NEXT_PUBLIC_STELLAR_RPC_URL="https://soroban-testnet.stellar.org"',
    'NEXT_PUBLIC_CHAIN_ENABLED="true"',
    f'NEXT_PUBLIC_REGISTRY_ID="{state["contracts"]["registry"]}"',
    f'NEXT_PUBLIC_VAULT_ID="{state["contracts"]["vault"]}"',
    f'NEXT_PUBLIC_USDC_ID="{state["contracts"]["usdc"]}"',
    f'NEXT_PUBLIC_SETTLEMENT_ASSET_ID="{state["contracts"]["usdc"]}"',
    'NEXT_PUBLIC_EXPLORER_URL="https://stellar.expert/explorer/testnet"',
    'NEXT_PUBLIC_IPFS_GATEWAY="https://ipfs.io/ipfs"',
]
env_content = "\n".join(env_lines) + "\n"
(ROOT / "app/.env.production").write_text(env_content)
(ROOT / ".env.production").write_text(env_content)
print(f"Updated app/.env.production and .env.production with deployed contracts.\n")

