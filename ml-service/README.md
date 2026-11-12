# VerifyAI — ML Service

Phase 1 pipeline: document OCR, MRZ checksum, face matching, ELA tamper
check (informational-only — see Known Limitations), blacklist lookup, and
a weighted, explainable risk score.

## Setup

**Use Python 3.12, not whatever `python3` points to on a newer macOS.**
At the time this was set up, the system default was 3.15, which several
ML packages (torch, insightface) don't yet have wheels for. Confirmed
working on 3.12.15.

```bash
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**System dependencies** (not pip-installable):

- **Tesseract OCR** — `passporteye` shells out to the `tesseract` binary;
  it is not a Python dependency and `pip install passporteye` will not
  warn you it's missing until runtime.
  ```bash
  brew install tesseract
  ```
- **MongoDB** — required for the blacklist lookup.
  ```bash
  brew tap mongodb/brew && brew install mongodb-community
  mkdir -p .mongodb-data
  mongod --dbpath .mongodb-data --logpath .mongodb-data/mongod.log
  ```
  (`brew services start mongodb-community` doesn't work for this formula
  on this setup — it has no plist. Run `mongod` directly, backgrounded.)

**Seed the mocked blacklist** (once, against a fresh MongoDB):
```bash
python scripts/seed_blacklist.py
```

**Dev/dataset tooling** (not needed to run the service):
```bash
pip install -r requirements-dev.txt
```

## Running

CLI (the Phase 1 deliverable):
```bash
python analyze.py --doc path/to/document.jpg --selfie path/to/selfie.jpg
```

API:
```bash
uvicorn main:app --reload
# POST /analyze with multipart fields `document` and `selfie`
```

## Testing

```bash
python -m pytest tests/
```

Covers the risk-score aggregator (the most audit-critical module — it's
the explainable layer a reviewer actually reads). Pipeline-level testing
(does `analyze()` behave sensibly on real images) was done manually
against the `trainingdatapro/generated-passports-segmentation` and
`trainingdatapro/ocr-machine-readable-zone-mrz-detection` Kaggle datasets
(synthetic, not real PII) — not automated yet; see Known Limitations.

## Known limitations (Phase 1)

- **ELA tamper detection does not work as a scalar rule.** Tested global
  mean, global 99th-percentile, and a block-wise local-outlier statistic
  against synthetic clean/tampered pairs at multiple JPEG resave
  qualities — none separate clean from tampered. A document's ordinary
  edges (text, graphics, photo boundary) produce ELA signal of the same
  magnitude as synthetic edits. `tamper.analyze()` always returns
  `tampered: None` (never scored) for this reason; `ela_mean` is still
  recorded for Phase 3's CNN training set. Real separation needs
  frequency-domain double-JPEG-quantization analysis or a trained model
  — not a threshold tuning problem.
- **MRZ OCR is unreliable on this stack.** `passporteye` drops/misreads
  MRZ characters often enough (valid_score 2-4/100 on test samples) that
  `checksum_ok` is a tri-state (`True`/`False`/`None`-unverifiable),
  gated on `valid_score >= 70`, so a low-confidence read is never scored
  as a forgery signal. Printed-field OCR (EasyOCR on the visual
  inspection zone) is more reliable and is what blacklist lookup and
  display fields use instead.
- **Blacklist matching is exact** (surname + DOB, uppercase). No fuzzy
  matching — a one-character spelling difference misses a real hit. This
  is a known simplification, not a security claim.
- No document-type validation — a non-document image doesn't error, it
  just produces a low-confidence LOW-risk report with every check
  reporting "not found."

See the plan's Review Notes section for dated findings and the
reasoning behind each decision above.
