import assert from "node:assert/strict";
import test from "node:test";
import { connectFreighter } from "../src/lib/wallet/connection";

const network = "Test SDF Network ; September 2015";
function wallet() {
  return {
    isConnected: async () => ({ isConnected: true }),
    getAddress: async () => ({ address: "demo-account" }),
    requestAccess: async () => ({ address: "demo-account" }),
    getNetwork: async () => ({ network: "TESTNET", networkUrl: "https://soroban-testnet.stellar.org", networkPassphrase: network }),
  };
}

test("reuses an authorized account without another access request", async () => {
  const api = wallet();
  api.requestAccess = async () => { throw new Error("Unexpected repeated access prompt"); };
  assert.equal(await connectFreighter(api, network), "demo-account");
});

test("requests permission for an account that is not yet authorized", async () => {
  const api = wallet();
  let permitted = false;
  api.getAddress = async () => ({ address: permitted ? "new-account" : "" });
  api.requestAccess = async () => { permitted = true; return { address: "new-account" }; };
  assert.equal(await connectFreighter(api, network), "new-account");
});

test("rejects a wallet on the wrong network", async () => {
  const api = wallet();
  api.getNetwork = async () => ({ network: "PUBLIC", networkUrl: "", networkPassphrase: "wrong-network" });
  await assert.rejects(connectFreighter(api, network), /Cambiá Freighter a Stellar Testnet/);
});

test("a silent extension fails instead of leaving connection pending forever", async () => {
  const api = wallet();
  api.getAddress = () => new Promise(() => {});
  await assert.rejects(connectFreighter(api, network, 5), /Freighter no respondió/);
});

test("returns the current account after a switch during connection", async () => {
  const api = wallet();
  let reads = 0;
  api.getAddress = async () => ({ address: ++reads === 1 ? "previous-account" : "current-account" });
  assert.equal(await connectFreighter(api, network), "current-account");
});

test("does not hide a rejected access request", async () => {
  const api = wallet();
  api.getAddress = async () => ({ address: "" });
  api.requestAccess = async () => { throw new Error("User declined access"); };
  await assert.rejects(connectFreighter(api, network), /User declined access/);
});
