# ============================================================
#  Rasm yuklash — mahsulot/to'plam kartochkalari uchun.
#  Fayllar app/uploads/images/ ichida saqlanadi (docker volume orqali doimiy),
#  StaticFiles orqali /uploads/... manzilida tarqatiladi (main.py).
# ============================================================
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from ..deps import get_current_user
from ..config import settings

router = APIRouter(prefix="/uploads", tags=["uploads"], dependencies=[Depends(get_current_user)])

# Doimiy volume yo'li (UPLOAD_DIR) yoki dev uchun backend/app/uploads
UPLOAD_ROOT = Path(settings.UPLOAD_DIR) if settings.UPLOAD_DIR else Path(__file__).resolve().parents[1] / "uploads"
IMAGES_DIR = UPLOAD_ROOT / "images"

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    ext = ALLOWED_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(400, "Faqat JPG, PNG, WEBP yoki GIF rasm yuklash mumkin")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "Rasm hajmi 5 MB dan oshmasligi kerak")
    if not data:
        raise HTTPException(400, "Bo'sh fayl yuborildi")
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    (IMAGES_DIR / name).write_bytes(data)
    return {"url": f"/uploads/images/{name}"}
