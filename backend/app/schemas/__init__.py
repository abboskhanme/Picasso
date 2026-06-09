import uuid
from datetime import datetime, date
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
    image_url: str | None = None                   # mahsulot rasmi (/uploads/...)
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
    image_url: str | None = None
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
    occurred_at: datetime | None = None   # ixtiyoriy: kechikkan/esdan chiqqan amal sanasi


# ---------- Sets ----------
class SetItemIn(BaseModel):
    product_id: uuid.UUID
    qty: float = Field(gt=0)


class SetPackagingIn(BaseModel):
    material_id: uuid.UUID
    qty: float = Field(gt=0)


class SetCreate(BaseModel):
    name: str
    emoji: str = "🎁"
    image_url: str | None = None                   # to'plam rasmi (/uploads/...)
    price: int = Field(ge=0)
    items: list[SetItemIn]
    packaging: list[SetPackagingIn] = []           # to'plam qadoqlash retsepti


class SetUpdate(BaseModel):
    name: str
    emoji: str = "🎁"
    image_url: str | None = None
    price: int = Field(ge=0)
    items: list[SetItemIn]
    packaging: list[SetPackagingIn] = []


class SetItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: uuid.UUID
    qty: float


class SetPackagingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    material_id: uuid.UUID
    qty: float


class SetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    emoji: str
    image_url: str | None = None
    price: int
    is_active: bool
    items: list[SetItemOut]
    packaging: list[SetPackagingOut] = []


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
    expiry_date: date | None = None
    note: str | None = None
    occurred_at: datetime | None = None


class RawUse(BaseModel):
    material_id: uuid.UUID
    qty: float = Field(gt=0)
    note: str | None = None
    occurred_at: datetime | None = None


# ---------- Harakatlar jurnali ----------
class MovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    item_type: str
    item_id: uuid.UUID
    item_name: str
    item_category: str | None
    unit: str | None
    move_type: str
    delta: float
    balance_after: float
    unit_cost: int
    cost: int
    ref_type: str | None
    note: str | None
    occurred_at: datetime


# ---------- Inventarizatsiya / brak ----------
class StockCount(BaseModel):
    item_type: str                 # product | raw
    item_id: uuid.UUID
    actual_qty: float = Field(ge=0)
    note: str | None = None
    occurred_at: datetime | None = None


class WriteOff(BaseModel):
    item_type: str                 # product | raw
    item_id: uuid.UUID
    qty: float = Field(gt=0)
    note: str | None = None
    occurred_at: datetime | None = None


# ---------- Retsept (BOM) ----------
class RecipeLineIn(BaseModel):
    material_id: uuid.UUID
    qty: float = Field(gt=0)


class RecipeSet(BaseModel):
    items: list[RecipeLineIn] = []


class RecipeLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    material_id: uuid.UUID
    qty: float


class RecipeOut(BaseModel):
    product_id: uuid.UUID
    items: list[RecipeLineOut]
    cost_estimate: int             # joriy narxlarda 1 dona tannarxi


# ---------- Ishlab chiqarish ----------
class ProduceIn(BaseModel):
    product_id: uuid.UUID
    qty: float = Field(gt=0)
    expiry_date: date | None = None
    note: str | None = None
    occurred_at: datetime | None = None


class ProductionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    qty: float
    cost_total: int
    unit_cost: int
    note: str | None
    occurred_at: datetime


# ---------- Partiya / muddat ----------
class BatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    item_type: str
    item_id: uuid.UUID
    item_name: str
    qty_initial: float
    qty_remaining: float
    unit: str | None
    production_date: date | None
    expiry_date: date | None
    unit_cost: int
    is_active: bool


# ---------- Reorder (buyurtma tavsiyasi) ----------
class ReorderOut(BaseModel):
    item_type: str
    item_id: uuid.UUID
    name: str
    unit: str
    stock: float
    min_stock: float
    suggested_qty: float
    unit_price: int
    est_cost: int


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
    occurred_at: datetime | None = None


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
    occurred_at: datetime | None = None


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
    occurred_at: datetime | None = None


class CashFlowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    direction: str
    amount: int
    category: str | None
    note: str | None
    occurred_at: datetime
