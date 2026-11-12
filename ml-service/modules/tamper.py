"""Tamper detection via Error Level Analysis (ELA).

Informational-only in Phase 1 — tested (2026-11-12) against synthetic
clean/tampered pairs with global mean, global 99th-percentile, AND a
block-wise local-outlier statistic, at multiple resave qualities. None
separated clean from tampered: a passport page's ordinary edges (text,
graphics, photo boundary) produce ELA signal of the same magnitude as the
synthetic edits. Naive spatial-domain ELA cannot distinguish "an edge
that's always been there" from "an edge introduced by editing" — that
needs frequency-domain double-JPEG-quantization analysis, which is real
scope, or the Phase 3 CNN (trained for exactly this). See Review Notes.

`ela_mean` is still returned (and `compute_ela`'s full map) so this call
can double as a labeled sample when building the Phase 3 training set —
it's just never trusted as a risk signal yet.
"""

import io

import numpy as np
from PIL import Image

RESAVE_QUALITY = 90


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
    """ELA mean, kept informational-only — see module docstring.

    `tampered` is always None in Phase 1: there is no threshold here that
    has been shown to discriminate, so nothing is asserted either way.
    """
    diff = compute_ela(image_path)
    ela_mean = float(diff.mean())
    return {
        "ela_mean": ela_mean,
        "tampered": None,
        "reliable": False,
    }
