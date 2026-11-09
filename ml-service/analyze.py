"""Single entry point wiring every Phase 1 check together.

CLI usage (the plan's Phase 1 deliverable):
    python analyze.py --doc passport.jpg --selfie photo.jpg
"""

import argparse
import json

from modules import blacklist, face_match, ocr, risk_score, tamper


def analyze(image_path: str, selfie_path: str) -> dict:
    mrz = ocr.extract_mrz(image_path)
    face = face_match.match(image_path, selfie_path)
    tamper_result = tamper.analyze(image_path)

    if mrz.get("found"):
        bl = blacklist.check(mrz.get("surname", ""), mrz.get("date_of_birth", ""))
    else:
        bl = {"checked": False, "hit": False, "reason": None}

    risk = risk_score.aggregate(mrz, face, tamper_result, bl)

    return {
        "mrz": mrz,
        "face_match": face,
        "tamper": tamper_result,
        "blacklist": bl,
        "risk": risk,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--doc", required=True, help="path to the document image")
    parser.add_argument("--selfie", required=True, help="path to the selfie image")
    args = parser.parse_args()

    result = analyze(args.doc, args.selfie)
    print(json.dumps(result, indent=2, default=str))
