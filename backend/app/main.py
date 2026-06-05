from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import Base, engine, SessionLocal
from .config import settings
from . import models  # noqa: F401  (modellarni ro'yxatga olish uchun)
from .routers import auth, products, sets, stock, sales, nasiya, finance, reports, uploads


def _auto_migrate():
    """create_all mavjud jadvalga ustun qo'shmaydi — yangi ustunlarni qo'lda qo'shamiz."""
    from sqlalchemy import text
    stmts = [
        "ALTER TABLE cash_flows ADD COLUMN IF NOT EXISTS ref_type VARCHAR",
        "ALTER TABLE cash_flows ADD COLUMN IF NOT EXISTS ref_id UUID",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT",
        "ALTER TABLE product_sets ADD COLUMN IF NOT EXISTS image_url TEXT",
    ]
    with engine.connect() as conn:
        for s in stmts:
            try:
                conn.execute(text(s)); conn.commit()
            except Exception:
                conn.rollback()  # SQLite yoki allaqachon mavjud — e'tiborsiz


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _auto_migrate()
    from .seed import seed, sync_catalog, purge_demo_data
    db = SessionLocal()
    try:
        if settings.SEED_ON_START:
            seed(db)
        purge_demo_data(db)  # eski namunaviy katalogni bir marta tozalaydi
        sync_catalog(db)     # katalogdagi yetishmayotgan pozitsiyalarni qo'shadi
    except Exception as e:  # seed xatosi API'ni yiqitmasin
        print(f"[seed] o'tkazib yuborildi: {e}")
    finally:
        db.close()
    yield


app = FastAPI(title="Picasso ERP API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # ishlab chiqarishda frontend domeniga cheklang
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, products, sets, stock, sales, nasiya, finance, reports, uploads):
    app.include_router(r.router)

# Yuklangan rasmlarni tarqatish: /uploads/images/<fayl>
uploads.IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads.UPLOAD_ROOT)), name="uploads")


@app.get("/")
def root():
    return {"app": "Picasso ERP API", "docs": "/docs"}

