"""Weighted risk-score aggregator — explainable by design.

Weights match the plan's Phase 1 spec. Each contributing check is listed
in `reasons` so the score is auditable, not a black box.
"""

from datetime import date, datetime

WEIGHTS = {
    "mrz_checksum_fail": 40,
    "face_mismatch": 30,
    "tamper_flag": 20,
    "blacklist_hit": 50,
    "expiry_past": 10,
}

HIGH_THRESHOLD = 60
MEDIUM_THRESHOLD = 30


def _expiry_is_past(expiration_date: str | None) -> bool:
    if not expiration_date:
        return False
    try:
        # MRZ dates are YYMMDD
        exp = datetime.strptime(expiration_date, "%y%m%d").date()
    except ValueError:
        return False
    return exp < date.today()


def aggregate(mrz: dict, face: dict, tamper: dict, blacklist: dict) -> dict:
    score = 0
    reasons = []

    if mrz.get("found") and mrz.get("checksum_ok") is False:
        score += WEIGHTS["mrz_checksum_fail"]
        reasons.append("MRZ checksum failed")
    elif mrz.get("found") and mrz.get("checksum_ok") is None:
        reasons.append("MRZ checksum unverifiable (low OCR confidence) — not scored")

    if face.get("found") and not face.get("match", True):
        score += WEIGHTS["face_mismatch"]
        reasons.append(f"Face match score {face.get('score', 0):.2f} below threshold")
    elif not face.get("found"):
        missing = []
        if not face.get("document_face_detected", False):
            missing.append("document")
        if not face.get("selfie_face_detected", False):
            missing.append("selfie")
        reasons.append(
            f"Face match unverifiable: no face detected in {' or '.join(missing)} image — not scored"
        )

    if tamper.get("tampered") is True:
        score += WEIGHTS["tamper_flag"]
        reasons.append(f"ELA tamper flag (mean {tamper.get('ela_mean', 0):.1f})")
    elif tamper.get("tampered") is None:
        reasons.append(
            f"ELA tamper check informational only (mean {tamper.get('ela_mean', 0):.2f}) — not scored"
        )

    if blacklist.get("hit"):
        score += WEIGHTS["blacklist_hit"]
        reasons.append(f"Blacklist hit: {blacklist.get('reason', 'no reason given')}")

    if mrz.get("found") and _expiry_is_past(mrz.get("expiration_date")):
        score += WEIGHTS["expiry_past"]
        reasons.append("Document expired")

    if score >= HIGH_THRESHOLD:
        level = "HIGH"
    elif score >= MEDIUM_THRESHOLD:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {"score": score, "level": level, "reasons": reasons}
