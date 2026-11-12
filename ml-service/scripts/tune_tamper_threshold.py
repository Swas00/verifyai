"""Measure ELA-mean separation between clean and synthetically tampered
samples, to pick a real TAMPER_THRESHOLD instead of a guessed one.

Tampering mimics the plan's Phase 3 synthetic-data approach (clone-stamp,
brightness shift, text replacement) at small scale, just enough to tune
Phase 1's rule-based threshold.

Usage:
    python scripts/tune_tamper_threshold.py
"""

import glob
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance

from modules.tamper import compute_ela

SOURCE_GLOB = "../training/datasets/passport-segmentation/images/*.png"
OUT_DIR = "../training/datasets/tamper-tuning"


def make_clean_baseline(image_path: str, out_dir: str) -> str:
    """Resave unmodified, at the same JPEG quality as the tampered variants.

    A PNG-vs-JPEG comparison confounds compression history with tampering
    (a never-compressed source trivially shows a different global ELA mean
    than anything already JPEG-encoded) — this keeps the comparison fair.
    """
    img = Image.open(image_path).convert("RGB")
    base = os.path.splitext(os.path.basename(image_path))[0]
    p = f"{out_dir}/{base}_clean.jpg"
    img.save(p, "JPEG", quality=95)
    return p


def make_tampered_variants(image_path: str, out_dir: str) -> list[str]:
    img = Image.open(image_path).convert("RGB")
    base = os.path.splitext(os.path.basename(image_path))[0]
    paths = []

    # Clone-stamp-like: copy a patch to another location
    clone = img.copy()
    w, h = clone.size
    patch = clone.crop((int(w * 0.1), int(h * 0.1), int(w * 0.3), int(h * 0.2)))
    clone.paste(patch, (int(w * 0.5), int(h * 0.6)))
    p = f"{out_dir}/{base}_clone.jpg"
    clone.save(p, "JPEG", quality=95)
    paths.append(p)

    # Brightness shift on a region
    bright = img.copy()
    region = bright.crop((int(w * 0.55), int(h * 0.05), w, int(h * 0.3)))
    region = ImageEnhance.Brightness(region).enhance(1.6)
    bright.paste(region, (int(w * 0.55), int(h * 0.05)))
    p = f"{out_dir}/{base}_bright.jpg"
    bright.save(p, "JPEG", quality=95)
    paths.append(p)

    # Text replacement-like: paint a solid block over text and redraw
    text_edit = img.copy()
    draw = ImageDraw.Draw(text_edit)
    draw.rectangle(
        (int(w * 0.1), int(h * 0.62), int(w * 0.45), int(h * 0.67)), fill=(230, 230, 230)
    )
    draw.text((int(w * 0.1), int(h * 0.62)), "FORGED", fill=(20, 20, 20))
    p = f"{out_dir}/{base}_text.jpg"
    text_edit.save(p, "JPEG", quality=95)
    paths.append(p)

    return paths


def main():
    random.seed(0)
    os.makedirs(OUT_DIR, exist_ok=True)

    sources = sorted(glob.glob(SOURCE_GLOB))
    if not sources:
        print(f"No source images found at {SOURCE_GLOB}")
        return

    def stats(path):
        diff = compute_ela(path)
        return float(diff.mean()), float(np.percentile(diff, 99))

    clean_mean, clean_p99 = [], []
    tampered_mean, tampered_p99 = [], []

    for src in sources:
        baseline = make_clean_baseline(src, OUT_DIR)
        m, p = stats(baseline)
        clean_mean.append(m)
        clean_p99.append(p)
        for variant in make_tampered_variants(src, OUT_DIR):
            m, p = stats(variant)
            tampered_mean.append(m)
            tampered_p99.append(p)

    def report(name, clean_arr, tampered_arr):
        clean_arr, tampered_arr = np.array(clean_arr), np.array(tampered_arr)
        print(f"\n[{name}]")
        print(f"  Clean  (n={len(clean_arr)}): mean={clean_arr.mean():.2f} "
              f"min={clean_arr.min():.2f} max={clean_arr.max():.2f}")
        print(f"  Tamper (n={len(tampered_arr)}): mean={tampered_arr.mean():.2f} "
              f"min={tampered_arr.min():.2f} max={tampered_arr.max():.2f}")
        if clean_arr.max() < tampered_arr.min():
            threshold = (clean_arr.max() + tampered_arr.min()) / 2
            print(f"  Separates cleanly. Suggested threshold = {threshold:.2f}")
            return True
        else:
            overlap_low = max(clean_arr.min(), tampered_arr.min())
            overlap_high = min(clean_arr.max(), tampered_arr.max())
            print(f"  OVERLAPS between {overlap_low:.2f} and {overlap_high:.2f} — "
                  f"not a usable discriminator as a single global threshold.")
            return False

    report("global mean (apples-to-apples JPEG vs JPEG)", clean_mean, tampered_mean)
    report("99th-percentile pixel diff (local hotspot)", clean_p99, tampered_p99)


if __name__ == "__main__":
    main()
