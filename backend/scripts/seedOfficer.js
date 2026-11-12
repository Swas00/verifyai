require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Officer = require("../models/Officer");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "verifyai";

// Dev-only seed — change this password before any non-local use.
const SEED_OFFICER = {
  name: "Admin Officer",
  email: "admin@verifyai.local",
  password: "ChangeMe123!",
  role: "admin",
};

async function main() {
  await mongoose.connect(`${MONGO_URI}/${MONGO_DB_NAME}`);

  const existing = await Officer.findOne({ email: SEED_OFFICER.email });
  if (existing) {
    console.log(`Officer ${SEED_OFFICER.email} already exists — skipping.`);
  } else {
    const passwordHash = await bcrypt.hash(SEED_OFFICER.password, 10);
    await Officer.create({
      name: SEED_OFFICER.name,
      email: SEED_OFFICER.email,
      passwordHash,
      role: SEED_OFFICER.role,
    });
    console.log(`Seeded officer ${SEED_OFFICER.email} / ${SEED_OFFICER.password} (change this password).`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
