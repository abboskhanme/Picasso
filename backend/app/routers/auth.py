from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..core.security import hash_password, verify_password, create_access_token
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut)
def register(data: schemas.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(email=data.email).first():
        raise HTTPException(400, "Bu email allaqachon mavjud")
    # Ochiq ro'yxatdan o'tish — xavfsizlik uchun "seller" (cheklangan) rol beriladi.
    # "owner" rolini faqat seed yoki bazada qo'lda berish mumkin.
    user = models.User(
        email=data.email, full_name=data.full_name,
        hashed_password=hash_password(data.password), role="seller",
    )
    db.add(user); db.commit(); db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 form: username maydoniga email yoziladi
    user = db.query(models.User).filter_by(email=form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "Email yoki parol noto'g'ri")
    return schemas.Token(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=schemas.UserOut)
def update_me(data: schemas.ProfileUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Profilni yangilaydi — ism, login (email) va rasm."""
    payload = data.model_dump(exclude_unset=True)
    new_email = payload.get("email")
    if new_email and new_email != user.email:
        if db.query(models.User).filter(models.User.email == new_email, models.User.id != user.id).first():
            raise HTTPException(400, "Bu email allaqachon band")
    for k, v in payload.items():
        setattr(user, k, v)
    db.commit(); db.refresh(user)
    return user


@router.post("/me/password")
def change_password(data: schemas.PasswordChange, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Parolni o'zgartiradi — joriy parol to'g'ri kiritilishi shart."""
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(400, "Joriy parol noto'g'ri")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"ok": True}
