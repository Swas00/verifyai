const test = require("node:test");
const assert = require("node:assert");
const { computeHash, GENESIS_HASH } = require("../auditLog/hashChain");

const rec = { officer: "a", docType: "passport", riskLevel: "LOW", riskScore: 5, checkResults: { x: 1 } };

test("hash is deterministic, 64 hex chars", () => {
  const h = computeHash(rec, GENESIS_HASH);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.strictEqual(h, computeHash({ ...rec }, GENESIS_HASH));
});

test("changing any field changes the hash", () => {
  const base = computeHash(rec, GENESIS_HASH);
  assert.notStrictEqual(base, computeHash({ ...rec, riskScore: 6 }, GENESIS_HASH));
  assert.notStrictEqual(base, computeHash({ ...rec, riskLevel: "HIGH" }, GENESIS_HASH));
  assert.notStrictEqual(base, computeHash({ ...rec, checkResults: { x: 2 } }, GENESIS_HASH));
});

test("previous hash is bound into the hash", () => {
  assert.notStrictEqual(computeHash(rec, GENESIS_HASH), computeHash(rec, "1".repeat(64)));
});
