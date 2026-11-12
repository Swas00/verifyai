const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Officer = require("../models/Officer");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const officer = await Officer.findOne({ email: email.toLowerCase() });
  if (!officer) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, officer.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: officer._id, role: officer.role, name: officer.name },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token, officer: { id: officer._id, name: officer.name, role: officer.role } });
});

module.exports = router;
