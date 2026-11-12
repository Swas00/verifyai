const mongoose = require("mongoose");

const officerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["officer", "admin"], default: "officer" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Officer", officerSchema);
