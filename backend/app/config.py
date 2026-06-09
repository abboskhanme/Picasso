from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_JWT_SECRET = "change_me_in_production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://picasso:picasso_secret@localhost:5432/picasso"
    JWT_SECRET: str = DEFAULT_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 kun
    SEED_ON_START: bool = True

    # Yuklangan rasmlar saqlanadigan papka. Bo'sh bo'lsa — backend/app/uploads (dev).
    # Production'da doimiy volume yo'li beriladi (masalan /data/uploads).
    UPLOAD_DIR: str = ""

    # dev | production — production'da zaif standart sozlamalar bilan ishga tushishni bloklaydi
    APP_ENV: str = "dev"
    # CORS uchun ruxsat etilgan manbalar (vergul bilan): masalan "https://erp.example.com".
    # "*" — barcha manbalar (faqat dev uchun).
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() in ("production", "prod")


settings = Settings()
