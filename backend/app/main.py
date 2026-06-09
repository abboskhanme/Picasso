from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import Base, engine, SessionLocal
from .config import settings, DEFAULT_JWT_SECRET
from .logging_config import setup_logging, logger
from . import models  # noqa: F401  (modellarni ro'yxatga olish uchun)
from .routers import auth, products, sets, stock, sales, nasiya, finance, reports, uploads

BACKEND_DIR = Path(__file__).resolve().parents[1]   # /code (alembic.ini shu yerda)


def _check_production_safety():
    """Production'da zaif standart sozlamalar bilan ishga tushishni bloklaydi."""
    if settings.is_production and settings.JWT_SECRET == DEFAULT_JWT_SECRET:
        raise RuntimeError(
            "XAVFSIZLIK: production'da JWT_SECRET standart qiymatda. "
            "Uni o'zgartiring (openssl rand -hex 32) va qayta ishga tushiring."
        )
    if not settings.is_production and settings.JWT_SECRET == DEFAULT_JWT_SECRET:
        logger.warning("JWT_SECRET standart qiymatda — production'dan oldin albatta o'zgartiring.")


def _run_migrations():
    """Sxema migratsiyalari (Alembic). create_all joriy sxemani quradi; bu yerda
    alembic versiyasini boshqaramiz: yangi/mavjud baza head deb belgilanadi,
    keyin qo'shilgan migratsiyalar (agar bo'lsa) qo'llanadi."""
    from alembic.config import Config
    from alembic import command
    from sqlalchemy import inspect
    try:
        cfg = Config(str(BACKEND_DIR / "alembic.ini"))
        cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
        if "alembic_version" not in inspect(engine).get_table_names():
            command.stamp(cfg, "head")          # joriy sxema = head (DDL ishlamaydi)
        else:
            command.upgrade(cfg, "head")         # yangi migratsiyalarni qo'llaydi
    except Exception as e:                        # migratsiya xatosi API'ni yiqitmasin
        logger.error(f"Migratsiya o'tkazib yuborildi: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    _check_production_safety()
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    from .seed import seed, sync_catalog, purge_demo_data
    db = SessionLocal()
    try:
        if settings.SEED_ON_START:
            seed(db)
        purge_demo_data(db)  # eski namunaviy katalogni bir marta tozalaydi
        sync_catalog(db)     # katalogdagi yetishmayotgan pozitsiyalarni qo'shadi
    except Exception as e:  # seed xatosi API'ni yiqitmasin
        logger.error(f"[seed] o'tkazib yuborildi: {e}")
    finally:
        db.close()
    logger.info("Picasso API ishga tushdi (env=%s)", settings.APP_ENV)
    yield


app = FastAPI(title="Picasso ERP API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,   # prod'da CORS_ORIGINS=https://domen orqali cheklanadi
    allow_credentials=False,               # Bearer token ishlatiladi, cookie emas
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

