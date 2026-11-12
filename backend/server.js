require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const screeningRoutes = require("./routes/screening");
const casesRoutes = require("./routes/cases");
const auditRoutes = require("./routes/audit");
const errorHandler = require("./middleware/errorHandler");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/cases", casesRoutes);
app.use("/api/audit", auditRoutes);

app.use(errorHandler);

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

module.exports = app;
