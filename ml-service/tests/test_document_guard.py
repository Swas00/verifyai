import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from analyze import looks_like_document

NOTHING = ({"found": False}, {"surname": None, "given_names": None, "date_of_birth": None}, {"found": False, "document_face_detected": False})


def test_blank_image_rejected():
    assert looks_like_document(*NOTHING) is False


def test_mrz_alone_accepts():
    mrz, viz, face = NOTHING
    assert looks_like_document({"found": True}, viz, face)


def test_viz_field_alone_accepts():
    mrz, viz, face = NOTHING
    assert looks_like_document(mrz, {**viz, "surname": "DOE"}, face)


def test_portrait_alone_accepts():
    mrz, viz, face = NOTHING
    assert looks_like_document(mrz, viz, {**face, "document_face_detected": True})
