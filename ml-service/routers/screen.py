import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from analyze import InvalidDocumentError, analyze

router = APIRouter()


def _save_upload(upload: UploadFile, tmp_dir: Path) -> str:
    dest = tmp_dir / Path(upload.filename or "upload").name  # strip any path components
    with dest.open("wb") as f:
        shutil.copyfileobj(upload.file, f)
    return str(dest)


@router.post("/analyze")
def analyze_endpoint(document: UploadFile = File(...), selfie: UploadFile = File(...)):
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        doc_path = _save_upload(document, tmp_dir)
        selfie_path = _save_upload(selfie, tmp_dir)
        try:
            return analyze(doc_path, selfie_path)
        except InvalidDocumentError as e:
            raise HTTPException(status_code=422, detail=str(e))
