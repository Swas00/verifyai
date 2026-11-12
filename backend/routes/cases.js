const express = require("express");
const Case = require("../models/Case");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);

  const [cases, total] = await Promise.all([
    Case.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("officer", "name email"),
    Case.countDocuments(),
  ]);

  res.json({ cases, page, limit, total, pages: Math.ceil(total / limit) });
});

router.get("/:id", authMiddleware, async (req, res) => {
  const found = await Case.findById(req.params.id).populate("officer", "name email");
  if (!found) {
    return res.status(404).json({ error: "Case not found" });
  }
  res.json(found);
});

module.exports = router;
