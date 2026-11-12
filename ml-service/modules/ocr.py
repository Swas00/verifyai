"""OCR extraction: printed fields via EasyOCR, MRZ zone via passporteye."""

import easyocr
from passporteye import read_mrz

_reader = None


def _get_reader() -> easyocr.Reader:
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(["en"], gpu=False)
    return _reader


def extract_text_fields(image_path: str) -> list[str]:
    """Raw OCR lines from the document image, for field extraction."""
    reader = _get_reader()
    results = reader.readtext(image_path, detail=0)
    return results


# Below this, passporteye's own OCR is dropping and misreading characters
# often enough (tested against synthetic passport samples) that a low
# valid_score reflects OCR noise, not real tampering — see Review Notes.
# checksum_ok is None (unverifiable), not False, below this confidence so
# the risk engine never scores an unreliable read as a forgery signal.
RELIABLE_SCORE_THRESHOLD = 70


def extract_mrz(image_path: str) -> dict:
    """Read and validate the Machine Readable Zone.

    Returns a dict with the parsed fields and `checksum_ok`. If no MRZ is
    found (e.g. a national ID without one), `found` is False and every
    other field is absent — callers must check `found` before using the
    rest. `checksum_ok` is a tri-state: True/False only when the OCR read
    is confident enough to trust; None when it isn't (see
    RELIABLE_SCORE_THRESHOLD) — treat None as "unverifiable", not a pass.
    """
    mrz = read_mrz(image_path)
    if mrz is None:
        return {"found": False}

    data = mrz.to_dict()
    valid_score = data.get("valid_score", 0)
    reliable = valid_score >= RELIABLE_SCORE_THRESHOLD

    return {
        "found": True,
        "document_type": data.get("type"),
        "surname": data.get("surname"),
        "names": data.get("names"),
        "nationality": data.get("nationality"),
        "date_of_birth": data.get("date_of_birth"),
        "sex": data.get("sex"),
        "expiration_date": data.get("expiration_date"),
        "document_number": data.get("number"),
        "checksum_ok": (valid_score == 100) if reliable else None,
        "valid_score": valid_score,
        "reliable": reliable,
    }
