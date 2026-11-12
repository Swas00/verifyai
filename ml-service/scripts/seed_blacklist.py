"""Seed ~50 mocked flagged identities into the blacklist collection.

Mocked data only — no real PII. Run once per fresh MongoDB instance:
    python scripts/seed_blacklist.py
"""

import os
import random

from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGO_DB_NAME", "verifyai")

SURNAMES = [
    "SMITH", "JOHNSON", "WILLIAMS", "BROWN", "JONES", "GARCIA", "MILLER",
    "DAVIS", "RODRIGUEZ", "MARTINEZ", "HERNANDEZ", "LOPEZ", "GONZALEZ",
    "WILSON", "ANDERSON", "THOMAS", "TAYLOR", "MOORE", "JACKSON", "MARTIN",
    "LEE", "PEREZ", "THOMPSON", "WHITE", "HARRIS", "SANCHEZ", "CLARK",
    "RAMIREZ", "LEWIS", "ROBINSON", "WALKER", "YOUNG", "ALLEN", "KING",
    "WRIGHT", "SCOTT", "TORRES", "NGUYEN", "HILL", "FLORES", "GREEN",
    "ADAMS", "NELSON", "BAKER", "HALL", "RIVERA", "CAMPBELL", "MITCHELL",
    "CARTER", "ROBERTS",
]

REASONS = [
    "Reported lost/stolen document",
    "Flagged by Interpol notice (mock)",
    "Prior forged-document attempt",
    "Overstay on previous visa (mock record)",
    "Name match on watchlist (mock)",
]


def random_dob() -> str:
    year = random.randint(1960, 2003)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return f"{year % 100:02d}{month:02d}{day:02d}"


def main():
    client = MongoClient(MONGO_URI)
    collection = client[DB_NAME]["blacklist"]

    collection.delete_many({})

    entries = [
        {
            "surname": surname,
            "date_of_birth": random_dob(),
            "reason": random.choice(REASONS),
        }
        for surname in SURNAMES
    ]

    # Deterministic fixture matching the generated-passport-segmentation test
    # sample (BALDWIN, Amy, DOB 1990-03-23) — gives a known true-positive
    # path through analyze.py for manual verification, alongside SMITH's
    # random DOB above which stays a known true-negative.
    entries.append(
        {
            "surname": "BALDWIN",
            "date_of_birth": "900323",
            "reason": "Test fixture: known blacklist hit for pipeline validation",
        }
    )

    collection.insert_many(entries)
    print(f"Seeded {len(entries)} mocked blacklist entries into {DB_NAME}.blacklist")


if __name__ == "__main__":
    main()
