"""Face detection + 1:1 matching using InsightFace's buffalo_l pipeline.

Uses InsightFace's own SCRFD detector (bundled in buffalo_l) rather than a
separate YOLOv8 model — see the plan's Review Notes for why.
"""

import cv2
import numpy as np
from insightface.app import FaceAnalysis

_app = None

MATCH_THRESHOLD = 0.6  # cosine similarity; tuned during Phase 1 testing


def _get_app() -> FaceAnalysis:
    global _app
    if _app is None:
        _app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        _app.prepare(ctx_id=-1, det_size=(640, 640))
    return _app


def _largest_face(image_path: str):
    app = _get_app()
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"could not read image: {image_path}")
    faces = app.get(img)
    if not faces:
        return None
    return max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))


def match(document_image_path: str, selfie_image_path: str) -> dict:
    """Compare the face in the document photo against the selfie.

    Returns `found` (both faces detected), and when found, `score` (cosine
    similarity 0-1) and `match` (score >= MATCH_THRESHOLD).
    """
    doc_face = _largest_face(document_image_path)
    selfie_face = _largest_face(selfie_image_path)

    if doc_face is None or selfie_face is None:
        return {
            "found": False,
            "document_face_detected": doc_face is not None,
            "selfie_face_detected": selfie_face is not None,
        }

    doc_emb = doc_face.normed_embedding
    selfie_emb = selfie_face.normed_embedding
    score = float(np.dot(doc_emb, selfie_emb))

    return {
        "found": True,
        "document_face_detected": True,
        "selfie_face_detected": True,
        "score": score,
        "match": score >= MATCH_THRESHOLD,
    }
