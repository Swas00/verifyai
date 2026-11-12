"""Unit tests for the risk-score aggregator.

Flagged as a gap in the plan's Review Notes — this is the most
audit-critical code in the pipeline (it's the explainable layer a
reviewer or evaluator will actually read), so its weighting logic is
tested directly rather than only exercised end-to-end.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from modules import risk_score

NOT_FOUND = {"found": False}


def clean_mrz(**overrides):
    # MRZ two-digit years: 00-68 -> 20xx, 69-99 -> 19xx (see datetime's
    # %y). "301231" is 2030-12-31 — comfortably in the future.
    base = {"found": True, "checksum_ok": True, "expiration_date": "301231"}
    base.update(overrides)
    return base


def clean_face(**overrides):
    base = {"found": True, "match": True, "score": 0.9}
    base.update(overrides)
    return base


def clean_tamper(**overrides):
    base = {"ela_mean": 1.2, "tampered": None, "reliable": False}
    base.update(overrides)
    return base


def clean_blacklist(**overrides):
    base = {"checked": True, "hit": False, "reason": None}
    base.update(overrides)
    return base


def test_all_clean_is_low_risk():
    result = risk_score.aggregate(clean_mrz(), clean_face(), clean_tamper(), clean_blacklist())
    assert result["score"] == 0
    assert result["level"] == "LOW"


def test_blacklist_hit_alone_is_medium():
    bl = clean_blacklist(hit=True, reason="Watchlist match")
    result = risk_score.aggregate(clean_mrz(), clean_face(), clean_tamper(), bl)
    assert result["score"] == 50
    assert result["level"] == "MEDIUM"
    assert any("Watchlist match" in r for r in result["reasons"])


def test_mrz_checksum_failure_is_scored():
    mrz = clean_mrz(checksum_ok=False)
    result = risk_score.aggregate(mrz, clean_face(), clean_tamper(), clean_blacklist())
    assert result["score"] == 40
    assert "MRZ checksum failed" in result["reasons"]


def test_mrz_unverifiable_is_not_scored():
    mrz = clean_mrz(checksum_ok=None)
    result = risk_score.aggregate(mrz, clean_face(), clean_tamper(), clean_blacklist())
    assert result["score"] == 0
    assert any("not scored" in r for r in result["reasons"])


def test_mrz_not_found_contributes_nothing():
    result = risk_score.aggregate(NOT_FOUND, clean_face(), clean_tamper(), clean_blacklist())
    assert result["score"] == 0


def test_face_mismatch_is_scored():
    face = clean_face(match=False, score=0.3)
    result = risk_score.aggregate(clean_mrz(), face, clean_tamper(), clean_blacklist())
    assert result["score"] == 30
    assert "0.30" in result["reasons"][0]


def test_face_not_found_contributes_nothing_but_is_explained():
    face = {"found": False, "document_face_detected": False, "selfie_face_detected": True}
    result = risk_score.aggregate(clean_mrz(), face, clean_tamper(), clean_blacklist())
    assert result["score"] == 0
    assert any("unverifiable" in r and "document" in r for r in result["reasons"])


def test_tamper_is_informational_only_in_phase_1():
    # tampered is always None from modules.tamper — explicitly re-asserted
    # here since a future accidental revert (tampered=True hardcoded) would
    # silently reintroduce a risk signal with no demonstrated accuracy.
    tamper = clean_tamper(tampered=True)
    result = risk_score.aggregate(clean_mrz(), clean_face(), tamper, clean_blacklist())
    assert result["score"] == 20


def test_tamper_none_is_not_scored():
    result = risk_score.aggregate(clean_mrz(), clean_face(), clean_tamper(), clean_blacklist())
    assert not any("ELA tamper flag" in r for r in result["reasons"])


def test_expired_document_is_scored():
    mrz = clean_mrz(expiration_date="200101")  # 2020-01-01, in the past
    result = risk_score.aggregate(mrz, clean_face(), clean_tamper(), clean_blacklist())
    assert result["score"] == 10
    assert "Document expired" in result["reasons"]


def test_malformed_expiry_date_does_not_crash():
    mrz = clean_mrz(expiration_date="not-a-date")
    result = risk_score.aggregate(mrz, clean_face(), clean_tamper(), clean_blacklist())
    assert result["score"] == 0


def test_missing_expiry_date_does_not_crash():
    mrz = clean_mrz(expiration_date=None)
    result = risk_score.aggregate(mrz, clean_face(), clean_tamper(), clean_blacklist())
    assert result["score"] == 0


def test_everything_bad_is_high_and_additive():
    mrz = clean_mrz(checksum_ok=False, expiration_date="200101")
    face = clean_face(match=False, score=0.1)
    bl = clean_blacklist(hit=True, reason="Known fraud")
    result = risk_score.aggregate(mrz, face, clean_tamper(), bl)
    # 40 (MRZ) + 30 (face) + 50 (blacklist) + 10 (expiry) = 130
    assert result["score"] == 130
    assert result["level"] == "HIGH"
    # the 5th reason is the always-present tamper-informational note
    assert len(result["reasons"]) == 5


def test_threshold_boundaries():
    # exactly at MEDIUM_THRESHOLD (30) via face mismatch alone
    face = clean_face(match=False, score=0.5)
    result = risk_score.aggregate(clean_mrz(), face, clean_tamper(), clean_blacklist())
    assert result["score"] == 30
    assert result["level"] == "MEDIUM"

    # exactly at HIGH_THRESHOLD (60): blacklist (50) + expiry (10)
    mrz = clean_mrz(expiration_date="200101")
    bl = clean_blacklist(hit=True, reason="x")
    result = risk_score.aggregate(mrz, clean_face(), clean_tamper(), bl)
    assert result["score"] == 60
    assert result["level"] == "HIGH"
