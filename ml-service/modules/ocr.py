"""OCR extraction: printed fields via EasyOCR, MRZ zone via passporteye."""

import re
from datetime import datetime

import easyocr
from passporteye import read_mrz

_reader = None

_LABEL_HINTS = ("/", "date", "nationality", "sex", "authority", "code",
                "type", "no.", "no:", "surname", "given", "nom", "apellidos")
_NOISE_HINTS = ("does-not-exist", ".com", "photo")
_DATE_RE = re.compile(r"\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b")


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


def _looks_like_label_or_noise(line: str) -> bool:
    lower = line.lower()
    return any(h in lower for h in _LABEL_HINTS) or any(h in lower for h in _NOISE_HINTS)


def _value_after_label(lines: list[str], label_substring: str, max_lookahead: int = 4) -> str | None:
    """First plausible value line within `max_lookahead` lines after a label match."""
    for i, line in enumerate(lines):
        if label_substring in line.lower():
            for candidate in lines[i + 1 : i + 1 + max_lookahead]:
                if candidate.strip() and not _looks_like_label_or_noise(candidate):
                    return candidate.strip()
    return None


def _date_after_label(lines: list[str], label_substring: str, max_lookahead: int = 5) -> str | None:
    """Parsed `DD Mon YYYY` value after a label, returned as MRZ-style YYMMDD."""
    for i, line in enumerate(lines):
        if label_substring in line.lower():
            for candidate in lines[i + 1 : i + 1 + max_lookahead]:
                match = _DATE_RE.search(candidate)
                if match:
                    try:
                        dt = datetime.strptime(" ".join(match.groups()), "%d %b %Y")
                    except ValueError:
                        continue
                    return dt.strftime("%y%m%d")
    return None


def extract_viz_fields(image_path: str) -> dict:
    """Best-effort read of the printed (visual inspection zone) fields.

    Tested as far more reliable than the MRZ zone on this OCR stack (see
    Review Notes) — callers needing surname/DOB for matching (e.g. the
    blacklist lookup) should prefer this over `extract_mrz`'s fields.
    Any field not confidently located comes back None; this is best-effort
    label scanning, not a layout parser, so callers must handle gaps.
    """
    lines = extract_text_fields(image_path)
    return {
        "surname": _value_after_label(lines, "surname"),
        "given_names": _value_after_label(lines, "given names"),
        "date_of_birth": _date_after_label(lines, "date of birth"),
    }


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
