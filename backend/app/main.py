from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine, SessionLocal
from .config import settings
from . import models  # noqa: F401  (modellarni ro'yxatga olish uchun)
from .routers import auth, products, sets, stock, sales, nasiya, finance, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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

for r in (auth, products, sets, stock, sales, nasiya, finance, reports):
    app.include_router(r.router)


@app.get("/")
def root():
    return {"app": "Picasso ERP API", "docs": "/docs"}
