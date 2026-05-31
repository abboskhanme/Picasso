# Picasso — AI Promptlar To'plami

> Cursor, Claude Code yoki shunga o'xshash AI yordamchiga **ketma-ket** beriladigan tayyor promptlar. Tartibni buzmang — har biri oldingisiga tayanadi. Har promptни qo'yib, natijani tekshirib, keyingisiga o'ting.

> **Maslahat:** AI'ga avval `01-ARXITEKTURA.md`, `02-DATABASE-SCHEMA.sql`, `03-DESIGN-SYSTEM.md` fayllarini kontekst sifatida bering ("shu 3 faylga amal qil"). Keyin quyidagi promptlarni bering.

---

## 0-PROMPT — Loyihani sozlash (kontekst berish)

```
Men shokolad biznesi uchun "Picasso" nomli ERP/CRM web app quryapman.
Stack: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui (frontend),
Python + FastAPI + SQLAlchemy 2.0 + Alembic (backend), PostgreSQL/Supabase (baza).
Ilova telefon va kompyuterда responsive ishlashi kerak. Til: o'zbek.

Sen menга bosqichma-bosqich yordam berasan. Hozir loyiha tuzilmasini yaratamiz.
Quyidagi monorepo tuzilmasini yarat:

picasso/
  frontend/   (Vite + React + TS + Tailwind + shadcn/ui)
  backend/    (FastAPI + SQLAlchemy + Alembic)
  docs/
  README.md

Frontend'ni Vite bilan boshla, Tailwind va shadcn/ui'ni sozla.
Backend'da FastAPI loyihasini "app/" struktura bilan yarat:
app/main.py, config.py, database.py, deps.py, models/, schemas/, routers/, services/, crud/.
requirements.txt va .env.example fayllarni ham qo'sh.
Hozir faqat skelet — keyingi promptlarда to'ldiramiz.
```

---

## 1-PROMPT — Tailwind design token'lari

```
Frontend'da tailwind.config.ts faylini quyidagi design token'lar bilan sozla
(03-DESIGN-SYSTEM.md dan olingan):

ranglar: chocolate-900 #3d1e0c, chocolate-700 #6b3318, caramel #c47820,
gold #e8a020, cream #fff9f2, card #fffcf8, brdr (border) #f0d4b8,
ink (text) #2a1508, muted #8a6040, ok #267a50, danger #b83020.
shriftlar: sans = Nunito, brand = Pacifico.
borderRadius: card 18px, btn 13px.
boxShadow: card '0 2px 10px rgba(61,30,12,0.10)', btn '0 3px 10px rgba(107,51,24,0.28)'.

globals.css'ga Google Fonts (Nunito 400-900, Pacifico) import qil,
body foni cream, shrift Nunito qil. Sahifa overflow-x: hidden bo'lsin.
```

---

## 2-PROMPT — Asosiy UI komponentlari

```
03-DESIGN-SYSTEM.md asosida quyidagi qayta ishlatiluvchi komponentlarni yarat
(frontend/src/components/ ichida, shadcn/ui asosida):

1. Button — variantlar: primary (shokolad gradient), secondary (krem+chegara),
   ok (yashil), danger (qizil). O'lchamlar: default, sm, full. :active da scale(0.95).
2. Card — radius 18px, 1.5px chegara, yumshoq soya, padding 14px.
3. StatCard — gradient fon (g/o/p/v/b variantlari), katta qiymat + label.
4. Badge — rangli, dumaloq. Variantlar: yashil, qizil, sariq, ko'k, siyohrang.
5. Input, Select, Label, Hint — focus'da chegara karamel.
6. Modal — telefonда pastdan chiquvchi bottom sheet, kompyuterда (lg+) markaziy dialog.
7. Toast — pastда markazда, shokolad fon, 2.4s.
8. EmptyState — emoji + matn.
9. BottomNav (mobil) va Sidebar (lg+) — bir xil 5 bo'lim: Bosh sahifa, Sotuv,
   Ombor, Nasiya, Moliya.

Hammasi TypeScript, props type'lari bilan. Responsive bo'lsin.
```

---

## 3-PROMPT — TypeScript turlari (types)

```
02-DATABASE-SCHEMA.sql asosida frontend/src/types/index.ts da TypeScript
interface'larini yarat: Product, ProductSet, ProductSetItem, RawMaterial,
RawMaterialMovement, Customer, Sale, SaleItem, NasiyaPayment, CashFlow,
CustomerBalance. Enum'lar: UnitType, PaymentMethod, SaleKind, CashDirection.
Pul maydonlari number (butun so'm). Baza ustun nomlariga mos (snake_case → camelCase
mapping'ni izohда ko'rsat).
```

---

## 4-PROMPT — Backend: baza ulanishi va modellar

```
backend'da:
1. database.py — SQLAlchemy 2.0 async engine, PostgreSQL ulanishi (.env dan DATABASE_URL).
2. config.py — pydantic-settings bilan sozlamalar (DB url, Supabase JWT secret).
3. app/models/ — 02-DATABASE-SCHEMA.sql dagi har bir jadval uchun SQLAlchemy model:
   Product, ProductSet, ProductSetItem, RawMaterial, RawMaterialMovement,
   Customer, Sale, SaleItem, NasiyaPayment, CashFlow.
   Enum'larni ishlat, munosabatlarni (relationship) to'g'ri bog'la.
4. Alembic'ni sozla va birinchi migration yarat.

Eslatma: baza Supabase'da allaqachon yaratilган (SQL qo'llandi), shuning uchun
modellar mavjud jadvallarga MOS bo'lishi shart. Migration'ni "stamp" bilan
boshqar yoki autogenerate'ni mavjud sxema bilan solishtir.
```

---

## 5-PROMPT — Backend: auth (Supabase JWT)

```
backend/app/deps.py da Supabase JWT autentifikatsiyasini qo'sh:
- get_current_user dependency — Authorization: Bearer <token> ni tekshiradi,
  Supabase JWT secret bilan validatsiya qiladi, user_id qaytaradi.
- Token yo'q/yaroqsiz bo'lsa 401 qaytar.
Barcha himoyalangan endpoint'lar shu dependency'ni ishlatadi.
```

---

## 6-PROMPT — Backend: mahsulot va xom ashyo CRUD

```
FastAPI router'lari va Pydantic schema'larini yarat:
1. routers/products.py — GET (ro'yxat + bitta), POST, PATCH, DELETE (is_active=false).
2. routers/stock.py — xom ashyo: ro'yxat, sotib olish (buy), sarflash (use).
   Sotib olishда: raw_material_movements'ga yozuv, stock += qty, va cash_flows'ga
   chiqim (out) yoziladi — bularning hammasi BITTA tranzaksiyada.
   Sarflashда: stock -= qty (yetarli ekanini tekshir).
3. routers/sets.py — to'plamlar CRUD (set_items bilan).

Har bir POST/PATCH'да Pydantic validatsiya: narx >= 0, stok manfiy bo'lmasin.
services/ ichida biznes-logikani ajrat, router faqat chaqirsin.
```

---

## 7-PROMPT — Backend: sotuv logikasi (eng muhim)

```
services/sale_service.py va routers/sales.py yarat. Sotuv yaratish (POST /api/sales)
quyidagini BITTA DB tranzaksiyasida bajarsin:

Yakka mahsulot (kind='dona'):
- stok yetarliligini tekshir (yetmasa 400 xato),
- sales + sale_items yozuvlari,
- products.stock -= qty,
- agar naqd/karta: cash_flows'ga kirim (in) + sotuvga bog'la,
- agar nasiya: customer'ni telefon bo'yicha top yoki yarat, cash_flows'ga yozMA
  (qarz keyin to'langanда yoziladi).

To'plam (kind='set'):
- set_items dagi har bir mahsulot stokini kamaytir,
- to'plam narxini total qil, qolgan mantiq yuqoridagidek.

Validatsiya, xatoliklar, va aniq javob (yaratilган sotuv) qaytar.
Bu logikani pytest bilan testlash uchun test ham yoz.
```

---

## 8-PROMPT — Backend: nasiya va moliya

```
1. routers/nasiya.py:
   - GET /api/nasiya — customer_balances view'dan qarzi bor mijozlar,
   - POST /api/nasiya/{customer_id}/pay — to'lov: nasiya_payments'ga yozuv +
     cash_flows'ga kirim (in). Summa qarzdan ko'p bo'lmasin (tekshir).
   - GET /api/customers/{id} — mijoz tarixi (sotuvlar + to'lovlar).
2. routers/finance.py:
   - GET /api/finance/cash-flows — filtr bilan (today/week/month/all),
   - POST /api/finance/cash-flows — qo'lда kirim/chiqim qo'shish,
   - GET /api/finance/balance — kassa qoldig'i (cash_balance view).
3. routers/reports.py:
   - GET /api/reports/dashboard — bugungi sotuv, oylik kirim/chiqim,
     nasiya jami, top mahsulotlar, haftalik sotuv, kam qolgan mahsulotlar.
```

---

## 9-PROMPT — Frontend: API client va React Query

```
frontend/src/lib/api.ts — fetch wrapper: base URL .env dan, har so'rovga
Supabase token qo'shadi, xatoliklarni qayta ishlaydi.
frontend/src/lib/supabase.ts — Supabase auth client (login, logout, session).
TanStack Query (React Query) ni App'ga ulab, QueryClientProvider qo'sh.
Login sahifasini yarat (email + parol, Supabase Auth).
Token bo'lmasa login'ga yo'naltiradigan himoyalangan route qil.
```

---

## 10-PROMPT — Frontend: modullarni qurish (har biriga alohida)

Quyidagilarni **birma-bir** bering (hammasini birga emas):

**10a — Ombor (Stock):**
```
features/stock/ ichida Ombor sahifasini qur. 3 tab: Mahsulotlar, To'plamlar,
Xom ashyo. Mavjud prototip (picasso HTML) ko'rinishiga mos: karta ro'yxati,
stok badge'lari (Yetarli/Kam/Tamom), "+ Yangi" tugma, tahrirlash modali.
useStock.ts hook'i React Query bilan /api/products va /api/stock'ga ulansin.
Telefonда 1 ustun, kompyuterда jadval/2 ustun.
```

**10b — Sotuv (Sales):**
```
features/sales/ — AddSaleModal (Dona/To'plam toggle, mahsulot tanlash, miqdor,
narx, to'lov turi chip'lari Naqd/Karta/Nasiya, nasiyaда mijoz ma'lumotlari),
jami summa avtomatik hisoblansin. Tarix va Hisobot tab'lari, sana filtri
(Barchasi/Bugun/Hafta/Oy). /api/sales'ga ulansin.
```

**10c — Nasiya:**
```
features/nasiya/ — ochiq va yopilган nasiyalar ro'yxati, har mijoz uchun qarz,
telefon, tarix. "Qarzni yopish" modali. /api/nasiya'ga ulansin.
```

**10d — Moliya (Finance):**
```
features/finance/ — Umumiy va Xarajat tab'lari, sana filtri, kassa qoldig'i,
kirim/chiqim qo'shish formasi, pul oqimi tarixi. /api/finance'ga ulansin.
```

**10e — Dashboard:**
```
features/dashboard/ — bugungi holat (statistika kartalari), moliyaviy holat,
kam qolgan mahsulotlar ogohlantirishi, haftalik sotuv bar grafigi,
top mahsulotlar, so'nggi operatsiyalar. /api/reports/dashboard'dan ma'lumot.
```

---

## 11-PROMPT — Sayqal: holatlar va xatoliklar

```
Butun ilovani ko'rib chiq va qo'sh:
- har so'rovда loading holati (skeleton yoki spinner),
- xatolik holati (toast bilan o'zbekcha xabar),
- bo'sh ro'yxatlarда EmptyState,
- form validatsiyasi (bo'sh maydon, manfiy son),
- muvaffaqiyatли amalда toast ("Sotuv saqlandi!").
Telefon (375px) va kompyuter (1280px)да har sahifani tekshir.
```

---

## 12-PROMPT — Deploy

```
1. Frontend'ni Vercel'ga deploy qilish uchun sozla (env: API URL, Supabase kalitlari).
2. Backend'ni Railway/Render'ga deploy qilish uchun: Dockerfile yoki
   start buyrug'i, .env o'zgaruvchilari ro'yxati.
3. CORS'ni backend'da frontend domeniga ruxsat ber.
4. README.md'ga lokal ishga tushirish va deploy yo'riqnomasini yoz.
```

---

## Qo'shimcha maslahatlar

- **Bittadan boring.** Har promptdан keyin natijani brauzerда/Swagger'да ko'ring, ishlasa keyingisiga o'ting.
- **Xato bo'lsa**, AI'ga to'liq xato matnini va tegishli faylni bering.
- **Kontekstни yangilang:** uzoq suhbatда AI design system'ni unutishi mumkin — kerakli faylni qayta eslating.
- **Git:** har ishlaydigan bosqichdан keyin commit qiling ("Ombor moduli ishladi").
- **Sekin lekin ishonchli:** prototipdagi har bir tugma backend'ga ulanган va bazaga yozadigan bo'lганини tekshiring — asosiy farq shu.
