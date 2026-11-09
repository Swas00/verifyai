import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, UploadFile

from analyze import analyze

router = APIRouter()


def _save_upload(upload: UploadFile, tmp_dir: Path) -> str:
    dest = tmp_dir / upload.filename
    with dest.open("wb") as f:
        shutil.copyfileobj(upload.file, f)
    return str(dest)


@router.post("/analyze")
def analyze_endpoint(document: UploadFile = File(...), selfie: UploadFile = File(...)):
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        doc_path = _save_upload(document, tmp_dir)
        selfie_path = _save_upload(selfie, tmp_dir)
        return analyze(doc_path, selfie_path)
