import uuid
from datetime import datetime, date
from sqlalchemy import (
    String, BigInteger, Numeric, Boolean, ForeignKey, DateTime, Date, func, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="owner")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    emoji: Mapped[str] = mapped_column(String, default="🍫")
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)  # mahsulot rasmi (/uploads/...)
    price: Mapped[int] = mapped_column(BigInteger, default=0)          # sotish narxi, so'm
    cost_price: Mapped[int] = mapped_column(BigInteger, default=0)     # tannarx, so'm
    description: Mapped[str | None] = mapped_column(Text, nullable=True)   # tarkibi/tafsifi
    category: Mapped[str | None] = mapped_column(String, nullable=True)    # guruh
    stock: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    min_stock: Mapped[float] = mapped_column(Numeric(12, 2), default=5)
    unit: Mapped[str] = mapped_column(String, default="dona")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProductSet(Base):
    __tablename__ = "product_sets"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    emoji: Mapped[str] = mapped_column(String, default="🎁")
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)  # to'plam rasmi (/uploads/...)
    price: Mapped[int] = mapped_column(BigInteger, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    items: Mapped[list["ProductSetItem"]] = relationship(
        back_populates="product_set", cascade="all, delete-orphan"
    )
    # To'plamga ketadigan qadoqlash materiallari (karobka, lenta, sticker...).
    # To'plam sotilganda shu ro'yxat bo'yicha qadoqlash ombordan ayriladi.
    packaging: Mapped[list["ProductSetPackaging"]] = relationship(
        back_populates="product_set", cascade="all, delete-orphan"
    )


class ProductSetItem(Base):
    __tablename__ = "product_set_items"
    set_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_sets.id", ondelete="CASCADE"), primary_key=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), primary_key=True)
    qty: Mapped[float] = mapped_column(Numeric(12, 2))
    product_set: Mapped["ProductSet"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()


class ProductSetPackaging(Base):
    """To'plam uchun qadoqlash retsepti — qaysi qadoqlashdan nechtadan ketadi."""
    __tablename__ = "product_set_packaging"
    set_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_sets.id", ondelete="CASCADE"), primary_key=True)
    material_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("raw_materials.id", ondelete="CASCADE"), primary_key=True)
    qty: Mapped[float] = mapped_column(Numeric(12, 3))
    product_set: Mapped["ProductSet"] = relationship(back_populates="packaging")
    material: Mapped["RawMaterial"] = relationship()


class RawMaterial(Base):
    __tablename__ = "raw_materials"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String, default="xomashyo")  # xomashyo | qadoqlash
    unit: Mapped[str] = mapped_column(String, default="kg")
    unit_price: Mapped[int] = mapped_column(BigInteger, default=0)
    stock: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    min_stock: Mapped[float] = mapped_column(Numeric(12, 3), default=2)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RawMaterialMovement(Base):
    __tablename__ = "raw_material_movements"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    material_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("raw_materials.id", ondelete="CASCADE"))
    move_type: Mapped[str] = mapped_column(String)  # buy / use / adjust
    qty: Mapped[float] = mapped_column(Numeric(12, 3))
    cost: Mapped[int] = mapped_column(BigInteger, default=0)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    phone: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Sale(Base):
    __tablename__ = "sales"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    kind: Mapped[str] = mapped_column(String, default="dona")  # dona / set
    set_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("product_sets.id"), nullable=True)
    payment_method: Mapped[str] = mapped_column(String, default="naqd")  # naqd/karta/nasiya
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    total: Mapped[int] = mapped_column(BigInteger)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )


class SaleItem(Base):
    __tablename__ = "sale_items"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"))
    product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    name_snapshot: Mapped[str] = mapped_column(String)
    emoji_snapshot: Mapped[str | None] = mapped_column(String, nullable=True)
    qty: Mapped[float] = mapped_column(Numeric(12, 2))
    unit_price: Mapped[int] = mapped_column(BigInteger)
    line_total: Mapped[int] = mapped_column(BigInteger)
    sale: Mapped["Sale"] = relationship(back_populates="items")


class NasiyaPayment(Base):
    __tablename__ = "nasiya_payments"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    sale_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sales.id"), nullable=True)
    amount: Mapped[int] = mapped_column(BigInteger)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CashFlow(Base):
    __tablename__ = "cash_flows"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    direction: Mapped[str] = mapped_column(String)  # in / out
    amount: Mapped[int] = mapped_column(BigInteger)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    sale_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sales.id"), nullable=True)
    # Qaysi yozuv tufayli yaratilgani (o'chirishda birga qaytarish uchun):
    # ref_type: movement (ombor kirimi) | nasiya (nasiya to'lovi)
    ref_type: Mapped[str | None] = mapped_column(String, nullable=True)
    ref_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ============================================================
#  Universal harakatlar jurnali — HAR QANDAY stok o'zgarishi shu yerga yoziladi.
#  item_type: 'product' (tayyor mahsulot) | 'raw' (xomashyo/qadoqlash)
#  move_type: buy | produce | use | sale | adjust | writeoff | return | manual
#  delta: ishorali o'zgarish (+ kirim, - chiqim)
#  balance_after: harakatdan keyingi qoldiq — istalgan vaqtdagi holatni tiklash uchun
# ============================================================
class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    item_type: Mapped[str] = mapped_column(String, index=True)      # product | raw
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    item_name: Mapped[str] = mapped_column(String)                  # tarix uchun nom snapshot
    item_category: Mapped[str | None] = mapped_column(String, nullable=True)  # xomashyo/qadoqlash/guruh
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    move_type: Mapped[str] = mapped_column(String, index=True)
    delta: Mapped[float] = mapped_column(Numeric(12, 3))            # ishorali
    balance_after: Mapped[float] = mapped_column(Numeric(12, 3))
    unit_cost: Mapped[int] = mapped_column(BigInteger, default=0)
    cost: Mapped[int] = mapped_column(BigInteger, default=0)        # umumiy summa (so'm)
    ref_type: Mapped[str | None] = mapped_column(String, nullable=True)  # sale | production | purchase | count
    ref_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)


# ============================================================
#  Retsept (BOM) — 1 dona tayyor mahsulot uchun qancha xomashyo/qadoqlash kerak
# ============================================================
class ProductRecipe(Base):
    __tablename__ = "product_recipes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    material_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("raw_materials.id", ondelete="CASCADE"))
    qty: Mapped[float] = mapped_column(Numeric(12, 3))  # 1 dona mahsulotga ketadigan miqdor
    product: Mapped["Product"] = relationship()
    material: Mapped["RawMaterial"] = relationship()


# ============================================================
#  Ishlab chiqarish partiyasi
# ============================================================
class Production(Base):
    __tablename__ = "productions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    product_name: Mapped[str] = mapped_column(String)
    qty: Mapped[float] = mapped_column(Numeric(12, 2))            # ishlab chiqarilgan miqdor
    cost_total: Mapped[int] = mapped_column(BigInteger, default=0)  # sarflangan xomashyo tannarxi
    unit_cost: Mapped[int] = mapped_column(BigInteger, default=0)   # 1 donaga tannarx
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)


# ============================================================
#  Partiya / muddat (yaroqlilik) kuzatuvi — FEFO uchun
#  buy (xomashyo) yoki produce (mahsulot) paytida muddat kiritilsa yaratiladi.
# ============================================================
class Batch(Base):
    __tablename__ = "batches"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    item_type: Mapped[str] = mapped_column(String, index=True)   # product | raw
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    item_name: Mapped[str] = mapped_column(String)
    qty_initial: Mapped[float] = mapped_column(Numeric(12, 3))
    qty_remaining: Mapped[float] = mapped_column(Numeric(12, 3))
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    production_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    unit_cost: Mapped[int] = mapped_column(BigInteger, default=0)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
