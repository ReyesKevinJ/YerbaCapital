"""Synthetic CLI acceptance flow. Not a substitute for Freighter acceptance."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
os.umask(0o077)
RPC = "https://soroban-testnet.stellar.org"
NETWORK = "Test SDF Network ; September 2015"
if os.environ.get("NETWORK_PASSPHRASE", NETWORK) != NETWORK:
    sys.exit("Testnet only")
manifests = list((ROOT / ".stellar").glob("deployment-*.json"))
deployment = json.loads(max(manifests, key=lambda p: p.stat().st_mtime).read_text())
assert deployment["network"] == NETWORK and deployment["rpc"] == RPC
addresses, contracts = deployment["addresses"], deployment["contracts"]
checkpoint = ROOT / ".stellar" / f"seed-{deployment['run']}.json"
state = json.loads(checkpoint.read_text()) if checkpoint.exists() else {
    "steps": {}, "transactions": [], "pending": None,
}
if state["pending"]:
    sys.exit(f"Unresolved prior submission: {state['pending']}. Inspect RPC before retrying; do not duplicate it.")


def save():
    checkpoint.write_text(json.dumps(state, indent=2) + "\n")


def run(args, label=None, command=None, extra_env=None):
    if label and label in state["steps"]:
        return state["steps"][label]
    if label:
        state["pending"] = label
        save()
    result = subprocess.run(command or ["stellar", "--config-dir", str(ROOT / ".stellar" / "stellar"), *args],
                            text=True, capture_output=True, env={**os.environ, "XDG_CONFIG_HOME": str(ROOT / ".stellar"), **(extra_env or {})})
    if result.returncode:
        sys.exit(re.sub(r"S[A-Z2-7]{55}", "[redacted]", result.stderr))
    if label:
        hashes = list(dict.fromkeys(re.findall(r"\b[0-9a-f]{64}\b", result.stderr)))
        confirmed = []
        for digest in hashes:
            query = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "getTransaction", "params": {"hash": digest}})
            response = subprocess.check_output(["curl", "-fsS", "-H", "Content-Type: application/json",
                                                "--data-binary", query, RPC], text=True)
            if json.loads(response).get("result", {}).get("status") == "SUCCESS":
                confirmed.append(digest)
        if not confirmed:
            sys.exit(f"No confirmed transaction for {label}; checkpoint left pending for inspection")
        for digest in confirmed:
            state["transactions"].append({"step": label, "hash": digest})
            print(f"{label}: https://stellar.expert/explorer/testnet/tx/{digest}", flush=True)
        state["steps"][label] = result.stdout.strip()
        state["pending"] = None
        save()
    return result.stdout.strip()


net = ["--rpc-url", RPC, "--network-passphrase", NETWORK]


def invoke(component, actor, method, args=None, label=None, cosign=None):
    if cosign:
        keys = {}
        for name, variable in ((actor, "DEMO_SOURCE_SECRET"), (cosign, "DEMO_CUSTODIAN_SECRET")):
            keys[variable] = subprocess.check_output(["stellar", "--config-dir", str(ROOT / ".stellar" / "stellar"),
                                                      "keys", "secret", name], text=True, stderr=subprocess.DEVNULL).strip()
        keys["NETWORK_PASSPHRASE"] = NETWORK
        return json.loads(run([], label, ["node", "scripts/cosign-demo.mjs", method, contracts[component], json.dumps(args)], keys))
    command = ["contract", "invoke", "--id", contracts[component], "--source-account", actor, *net]
    command += ["--send=yes"] if label else ["--send=no"]
    command += ["--", method]
    for key, value in (args or {}).items():
        command += ["--" + key, str(value)]
    result = run(command, label)
    return json.loads(result) if result else None


def approve_repayment(label, cap):
    request = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "getHealth"})
    health = json.loads(subprocess.check_output(["curl", "-fsS", "-H", "Content-Type: application/json",
                        "--data-binary", request, RPC], text=True))["result"]
    invoke("usdc", "coop", "approve", {"from": addresses["coop"], "spender": contracts["vault"],
           "amount": cap, "live_until_ledger": health["latestLedger"] + 100}, label)


def evidence(stage, lot):
    content = json.dumps({"synthetic": True, "run": deployment["run"], "lot": lot,
                          "claim": stage, "warning": "Demo only; no physical goods verified"},
                         sort_keys=True, separators=(",", ":")).encode()
    digest = hashlib.sha256(content).hexdigest()
    directory = ROOT / ".evidence"
    directory.mkdir(mode=0o700, exist_ok=True)
    path = directory / digest
    if path.exists():
        assert path.read_bytes() == content
    else:
        with path.open("xb") as out:
            out.write(content)
    return digest


asset = "USDC:" + addresses["usdc-issuer"]
for actor in ("coop", "fund"):
    run(["tx", "new", "change-trust", "--source-account", actor, "--line", asset,
         "--limit", "10000000000000", *net], f"Trustline {actor}")
    run(["tx", "new", "payment", "--source-account", "usdc-issuer", "--destination", addresses[actor],
         "--asset", asset, "--amount", "1000000000000", *net], f"Mint test USDC to {actor}")
for actor, role in (("custodian", "Custodian"), ("verifier", "Verifier"), ("oracle", "PriceOracle")):
    invoke("registry", "admin", "grant_role", {"admin": addresses["admin"],
           "address": addresses[actor], "role": json.dumps(role)}, f"Grant {role}")

for branch in ("happy", "risk"):
    lot = invoke("registry", "coop", "register_lot", {
        "owner": addresses["coop"], "custodian": addresses["custodian"], "commodity": "YERBA_CANCHADA",
        "net_kg": 12000, "warehouse_id": evidence("Warehouse tag", branch),
        "aging_method": json.dumps("Natural"), "aging_started_at": int(time.time()) - 86400,
        "evidence": evidence("Declaration", branch),
    }, f"{branch}: register lot")
    invoke("registry", "verifier", "verify_lot", {"verifier": addresses["verifier"], "lot_id": lot,
           "net_kg": 12000, "moisture_bps": 500, "evidence": evidence("Deposit verified", branch)},
           f"{branch}: verify with custodian", "custodian")
    invoke("registry", "verifier", "issue_receipt", {"verifier": addresses["verifier"], "lot_id": lot},
           f"{branch}: issue receipt")
    invoke("registry", "oracle", "post_valuation", {"oracle": addresses["oracle"], "lot_id": lot,
           "valuation": 120000000000, "evidence": evidence("Synthetic valuation", branch)},
           f"{branch}: value collateral")
    maximum = invoke("vault", "coop", "max_principal", {"lot_id": lot})
    assert int(maximum) == 61200000000
    loan = invoke("vault", "coop", "request_loan", {"borrower": addresses["coop"], "lot_id": lot,
                  "principal": 50000000000, "rate_bps": 1200, "duration_secs": 15552000},
                  f"{branch}: request and lock")
    invoke("vault", "fund", "fund", {"lender": addresses["fund"], "loan_id": loan}, f"{branch}: fund")
    if branch == "happy":
        invoke("registry", "verifier", "record_inspection", {"verifier": addresses["verifier"],
               "lot_id": lot, "net_kg": 12000, "moisture_bps": 500, "kind": json.dumps("Passed"),
               "evidence": evidence("Inspection passed", branch)}, f"{branch}: inspect")
        approve_repayment(f"{branch}: approve partial repayment", 10000000000)
        invoke("vault", "coop", "repay", {"payer": addresses["coop"], "loan_id": loan,
               "amount": 10000000000}, f"{branch}: partial repayment")
        invoke("vault", "coop", "partial_withdraw", {"owner": addresses["coop"], "loan_id": loan,
               "kg": 1000, "evidence": evidence("Co-signed partial withdrawal", branch)},
               f"{branch}: partial withdrawal", "custodian")
        approve_repayment(f"{branch}: approve capped full repayment", 1000000000000)
        invoke("vault", "coop", "repay", {"payer": addresses["coop"], "loan_id": loan,
               "amount": 1000000000000}, f"{branch}: full repayment and unlock")
        assert invoke("vault", "coop", "debt_of", {"loan_id": loan}) == "0"
        invoke("usdc", "coop", "approve", {"from": addresses["coop"], "spender": contracts["vault"],
               "amount": 0, "live_until_ledger": 0}, f"{branch}: revoke unused allowance")
    else:
        invoke("registry", "verifier", "impair", {"verifier": addresses["verifier"], "lot_id": lot,
               "reason": json.dumps("Moisture"), "evidence": evidence("Synthetic impairment", branch)},
               f"{branch}: impair")
        invoke("vault", "fund", "mark_default", {"caller": addresses["fund"], "loan_id": loan},
               f"{branch}: default")
        invoke("vault", "fund", "claim_collateral", {"lender": addresses["fund"], "loan_id": loan},
               f"{branch}: claim receipt")
    value = invoke("registry", "coop", "get_lot", {"lot_id": lot})
    assert value["loan_id"] is None and value["receipt_status"] == "Receipted"
    assert value["physical_status"] == ("Verified" if branch == "happy" else "Impaired")
    assert value["owner"] == addresses["coop" if branch == "happy" else "fund"]
    print(f"{branch}: lot {lot}, loan {loan}, confirmed final state", flush=True)

evidence_doc = ROOT / "docs/evidence.md"
text = evidence_doc.read_text()
marker = f"## Synthetic CLI demo {deployment['run']}"
if marker not in text:
    lines = ["", marker, "", "CLI-signed, synthetic data only. Freighter/browser acceptance remains pending.",
             "Happy path includes co-signed verification, direct funding, inspection, partial repayment, co-signed withdrawal and full repayment.",
             "Risk path preserves Impaired after the lender claims the receipt. Physical recovery is off-chain."]
    for entry in state["transactions"]:
        lines.append(f"- {entry['step']}: [{entry['hash']}](https://stellar.expert/explorer/testnet/tx/{entry['hash']}) (RPC SUCCESS).")
    evidence_doc.write_text(text + "\n".join(lines) + "\n")

print("\n" + "=" * 78)
print("🌾 YERBACAPITAL — SYNTHETIC DEMO FLOW ON STELLAR TESTNET")
print("=" * 78)
print(f"Deployment Run: {deployment['run']}")
print(f"  • Registry: CBS7LFX... -> https://stellar.expert/explorer/testnet/contract/{contracts['registry']}")
print(f"  • Vault:    CAUF5CY... -> https://stellar.expert/explorer/testnet/contract/{contracts['vault']}")
print(f"  • USDC SAC: CCY7HWQ... -> https://stellar.expert/explorer/testnet/contract/{contracts['usdc']}")
print("-" * 78)
print("CONFIRMED DEMO TRANSACTIONS (STELLAR EXPERT TESTNET):")
for entry in state["transactions"]:
    print(f"  • {entry['step']:<36}: https://stellar.expert/explorer/testnet/tx/{entry['hash']}")
print("=" * 78 + "\n")

