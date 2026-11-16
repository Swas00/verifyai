const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const Case = require("../models/Case");
const { authMiddleware } = require("../middleware/authMiddleware");
const { computeHash, GENESIS_HASH } = require("../auditLog/hashChain");

const router = express.Router();
const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      const err = new Error("Only JPEG and PNG images are accepted");
      err.status = 415;
      return cb(err);
    }
    cb(null, true);
  },
});

// Declared mimetype is client-controlled; check magic bytes too.
function looksLikeImage(buf) {
  const jpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return jpeg || png;
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

router.post(
  "/screen",
  authMiddleware,
  upload.fields([{ name: "document", maxCount: 1 }, { name: "selfie", maxCount: 1 }]),
  async (req, res, next) => {
    try {
      const documentFile = req.files?.document?.[0];
      const selfieFile = req.files?.selfie?.[0];
      if (!documentFile || !selfieFile) {
        return res.status(400).json({ error: "Both `document` and `selfie` files are required" });
      }

      if (!looksLikeImage(documentFile.buffer) || !looksLikeImage(selfieFile.buffer)) {
        return res.status(415).json({ error: "Uploaded files are not valid JPEG/PNG images" });
      }

      const form = new FormData();
      form.append("document", documentFile.buffer, documentFile.originalname);
      form.append("selfie", selfieFile.buffer, selfieFile.originalname);

      const { data: analysis } = await axios.post(`${ML_SERVICE_URL}/analyze`, form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        timeout: 60000,
      });

      const lastCase = await Case.findOne().sort({ createdAt: -1, _id: -1 });
      const prevHash = lastCase ? lastCase.auditHash : GENESIS_HASH;

      const record = {
        officer: String(req.officer.id),
        docType: req.body.docType || "unknown",
        riskLevel: analysis.risk.level,
        riskScore: analysis.risk.score,
        checkResults: analysis,
      };
      const auditHash = computeHash(record, prevHash);

      const savedCase = await Case.create({
        ...record,
        auditHash,
        auditPrevHash: prevHash,
      });

      res.status(201).json({ case: savedCase, analysis });
    } catch (err) {
      if (err.response) {
        // ML service reached us but returned an error (e.g. validation) —
        // surface it instead of a generic 500.
        return res.status(502).json({ error: "ML service error", detail: err.response.data });
      }
      next(err);
    }
  }
);

module.exports = router;
