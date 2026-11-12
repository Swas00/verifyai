const Case = require("../models/Case");
const { computeHash, GENESIS_HASH } = require("./hashChain");

/**
 * Walks every Case in creation order and recomputes each hash, checking
 * it matches both the stored hash and the previous record's stored hash.
 * Returns the first break found, or null if the whole chain is intact.
 */
async function verifyChain() {
  const cases = await Case.find().sort({ createdAt: 1, _id: 1 }).lean();

  let expectedPrevHash = GENESIS_HASH;
  for (const [index, record] of cases.entries()) {
    if (record.auditPrevHash !== expectedPrevHash) {
      return {
        valid: false,
        brokenAt: record._id,
        position: index,
        reason: "prevHash does not match the preceding record's hash",
      };
    }

    const recomputed = computeHash(
      {
        officer: String(record.officer),
        docType: record.docType,
        riskLevel: record.riskLevel,
        riskScore: record.riskScore,
        checkResults: record.checkResults,
      },
      record.auditPrevHash
    );

    if (recomputed !== record.auditHash) {
      return {
        valid: false,
        brokenAt: record._id,
        position: index,
        reason: "stored hash does not match the recomputed hash — record was altered after being written",
      };
    }

    expectedPrevHash = record.auditHash;
  }

  return { valid: true, checked: cases.length };
}

module.exports = { verifyChain };
