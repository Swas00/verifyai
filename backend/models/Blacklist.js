const mongoose = require("mongoose");

// Same MongoDB database and collection the ml-service's blacklist.py reads
// from (seeded via ml-service/scripts/seed_blacklist.py) — one shared
// source of truth, not a separate copy.
const blacklistSchema = new mongoose.Schema(
  {
    surname: { type: String, required: true, uppercase: true },
    date_of_birth: { type: String, required: true },
    reason: { type: String },
  },
  { collection: "blacklist" }
);

module.exports = mongoose.model("Blacklist", blacklistSchema);
