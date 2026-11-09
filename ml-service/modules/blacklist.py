"""Blacklist lookup — mocked flagged-identity collection in MongoDB."""

import os

from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGO_DB_NAME", "verifyai")

_client = None


def _get_collection():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client[DB_NAME]["blacklist"]


def check(surname: str, date_of_birth: str) -> dict:
    """Look up a blacklist hit by surname + date of birth.

    MRZ-derived fields only (no fuzzy name matching in Phase 1 — a
    deliberate simplification, not a security claim: a one-character
    spelling difference will miss a real hit).
    """
    collection = _get_collection()
    hit = collection.find_one(
        {"surname": surname.upper(), "date_of_birth": date_of_birth}
    )
    return {
        "checked": True,
        "hit": hit is not None,
        "reason": hit.get("reason") if hit else None,
    }
