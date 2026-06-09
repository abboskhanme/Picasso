from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .core.security import decode_token
from . import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    sub = decode_token(token)
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token yaroqsiz")
    user = db.get(models.User, sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi")
    return user


# Rollar: "owner" — to'liq huquq; "seller" — faqat sotuv va ko'rish.
# To'liq huquqqa ega rollar (moliya, o'chirish, narx/katalog o'zgartirish uchun):
OWNER_ROLES = {"owner", "admin"}


def require_owner(user: models.User = Depends(get_current_user)) -> models.User:
    """Faqat egasi/administrator bajara oladigan amallar uchun (moliya, o'chirish,
    katalog va narx o'zgartirish). Sotuvchi (seller) bu amallarga kira olmaydi."""
    if user.role not in OWNER_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Bu amal uchun ruxsat yo'q (faqat egasi)")
    return user
