import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------- Auth ----------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    role: str


# ---------- Product (tayyor mahsulot) ----------
class ProductBase(BaseModel):
    name: str
    emoji: str = "🍫"
    price: int = Field(ge=0)                       # sotish narxi
    cost_price: int = Field(default=0, ge=0)       # tannarx
    description: str | None = None                 # tarkibi/tafsifi
    category: str | None = None                    # guruh
    stock: float = 0
    min_stock: float = 5
    unit: str = "dona"


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    emoji: str | None = None
    price: int | None = Field(default=None, ge=0)
    cost_price: int | None = Field(default=None, ge=0)
    description: str | None = None
    category: str | None = None
    min_stock: float | None = None
    unit: str | None = None
    is_active: bool | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    is_active: bool


class StockUpdate(BaseModel):
    mode: str = "add"        # add | set
    qty: float


# ---------- Sets ----------
class SetItemIn(BaseModel):
    product_id: uuid.UUID
    qty: float = Field(gt=0)


class SetCreate(BaseModel):
    name: str
    emoji: str = "🎁"
    price: int = Field(ge=0)
    items: list[SetItemIn]


class SetItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: uuid.UUID
    qty: float


class SetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    emoji: str
    price: int
    is_active: bool
    items: list[SetItemOut]


# ---------- Raw materials (xomashyo + qadoqlash) ----------
class RawMaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    category: str
    unit: str
    unit_price: int
    stock: float
    min_stock: float


class RawCreate(BaseModel):
    name: str
    category: str = "xomashyo"          # xomashyo | qadoqlash
    unit: str = "kg"
    unit_price: int = Field(default=0, ge=0)
    stock: float = 0
    min_stock: float = 0


class RawUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    unit: str | None = None
    unit_price: int | None = Field(default=None, ge=0)
    min_stock: float | None = None
    is_active: bool | None = None


class RawBuy(BaseModel):
    material_id: uuid.UUID | None = None
    name: str | None = None
    category: str = "xomashyo"
    unit: str = "kg"
    qty: float = Field(gt=0)
    cost: int = Field(ge=0)


class RawUse(BaseModel):
    material_id: uuid.UUID
    qty: float = Field(gt=0)
    note: str | None = None


# ---------- Sales ----------
class SaleItemIn(BaseModel):
    product_id: uuid.UUID
    qty: float = Field(gt=0)
    unit_price: int = Field(ge=0)


class SaleCreate(BaseModel):
    kind: str = "dona"               # dona | set
    set_id: uuid.UUID | None = None
    payment_method: str = "naqd"     # naqd | karta | nasiya
    items: list[SaleItemIn] = []     # dona uchun
    customer_name: str | None = None # nasiya uchun
    customer_phone: str | None = None
    note: str | None = None


class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name_snapshot: str
    emoji_snapshot: str | None
    qty: float
    unit_price: int
    line_total: int


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    kind: str
    payment_method: str
    total: int
    occurred_at: datetime
    items: list[SaleItemOut]


# ---------- Nasiya ----------
class NasiyaPay(BaseModel):
    amount: int = Field(gt=0)
    note: str | None = None


class CustomerBalanceOut(BaseModel):
    customer_id: uuid.UUID
    name: str
    phone: str | None
    total_nasiya: int
    total_paid: int
    debt: int


# ---------- Finance ----------
class CashFlowCreate(BaseModel):
    direction: str                   # in | out
    amount: int = Field(gt=0)
    category: str | None = None
    note: str | None = None


class CashFlowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    direction: str
    amount: int
    category: str | None
    note: str | None
    occurred_at: datetime
