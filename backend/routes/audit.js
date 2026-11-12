const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { verifyChain } = require("../auditLog/verifyChain");

const router = express.Router();

router.get("/verify", authMiddleware, async (req, res, next) => {
  try {
    const result = await verifyChain();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
