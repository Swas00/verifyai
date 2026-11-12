const crypto = require("crypto");

const GENESIS_HASH = "0".repeat(64);

/**
 * SHA-256 hash chain: each record's hash covers its own fields plus the
 * previous record's hash, so altering any past record breaks every hash
 * after it — tamper-evident without blockchain infra. See the plan's
 * Review Notes for why this replaces the originally planned
 * Ethereum/Hardhat/Polygon approach.
 */
function computeHash(record, prevHash) {
  const payload = JSON.stringify({ ...record, prevHash });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

module.exports = { computeHash, GENESIS_HASH };
