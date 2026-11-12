const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
  {
    officer: { type: mongoose.Schema.Types.ObjectId, ref: "Officer", required: true },
    docType: { type: String, default: "unknown" },
    riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], required: true },
    riskScore: { type: Number, required: true },
    checkResults: { type: mongoose.Schema.Types.Mixed, required: true },
    auditHash: { type: String, required: true },
    auditPrevHash: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Case", caseSchema);
