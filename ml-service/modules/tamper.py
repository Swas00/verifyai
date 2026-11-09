"""Tamper detection via Error Level Analysis (ELA).

Phase 1: rule-based threshold on ELA mean. Phase 3 replaces the threshold
with a CNN trained on ELA maps (see plan, Phase 3) — this module's
`compute_ela` output is the same input that trains and feeds that model,
so the interface is deliberately stable across both phases.
"""

import io

import numpy as np
from PIL import Image

RESAVE_QUALITY = 90
TAMPER_THRESHOLD = 15.0  # ELA mean; tuned during Phase 1 testing on real samples


def compute_ela(image_path: str) -> np.ndarray:
    """Resave the image at RESAVE_QUALITY and return the absolute pixel diff."""
    original = Image.open(image_path).convert("RGB")

    buffer = io.BytesIO()
    original.save(buffer, "JPEG", quality=RESAVE_QUALITY)
    buffer.seek(0)
    resaved = Image.open(buffer)

    diff = np.abs(
        np.asarray(original, dtype=np.int16) - np.asarray(resaved, dtype=np.int16)
    )
    return diff.astype(np.uint8)


def analyze(image_path: str) -> dict:
    """Rule-based tamper flag from the ELA mean.

    `ela_mean` is kept in the output so the same call can double as a
    labeled sample when building the Phase 3 training set.
    """
    diff = compute_ela(image_path)
    ela_mean = float(diff.mean())
    return {
        "ela_mean": ela_mean,
        "tampered": ela_mean > TAMPER_THRESHOLD,
    }
