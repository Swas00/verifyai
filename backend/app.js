const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const screeningRoutes = require("./routes/screening");
const casesRoutes = require("./routes/cases");
const auditRoutes = require("./routes/audit");
const errorHandler = require("./middleware/errorHandler");

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Brute-force protection on login: 10 attempts / 15 min / IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT) || 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts, try again later" },
});

// Screening calls the (expensive) ML pipeline: 30 / min / IP.
const screeningLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.SCREENING_RATE_LIMIT) || 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many screening requests, slow down" },
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth/login", loginLimiter);
app.use("/api/screening", screeningLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/cases", casesRoutes);
app.use("/api/audit", auditRoutes);

app.use(errorHandler);

module.exports = app;
