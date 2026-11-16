require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "verifyai";

async function start() {
  await mongoose.connect(`${MONGO_URI}/${MONGO_DB_NAME}`);
  app.listen(PORT, () => console.log(`VerifyAI backend listening on :${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
