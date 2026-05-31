# Picasso ERP/CRM — Arxitektura Hujjati

> Shokolad ishlab chiqarish biznesi uchun web app. Bir fayllik HTML prototipdan barqaror, tez va kengaytiriladigan tizimga o'tish rejasi.

---

## 1. Umumiy qaror (Stack)

| Qatlam | Texnologiya | Nega |
|--------|-------------|------|
| **Frontend** | React 18 + TypeScript + Vite | Tez build, type-safety, katta ekosistema |
| **UI / Style** | Tailwind CSS + shadcn/ui | Mavjud dizaynni token'lar bilan tez ko'chirish, responsive |
| **State / Data** | TanStack Query (React Query) + Zustand | Server ma'lumotlari uchun cache, mahalliy UI holati uchun yengil store |
| **Backend** | Python + FastAPI | Sizning tanlovingiz. Tez, async, avtomatik API hujjat (Swagger), murakkab hisobotlarga kuchli |
| **ORM** | SQLAlchemy 2.0 + Alembic | Migration boshqaruvi, type-safe so'rovlar |
| **Ma'lumotlar bazasi** | PostgreSQL (boshlanishiga Supabase) | Ishonchli, relyatsion, kengayadi |
| **Auth** | Supabase Auth (JWT) | Tayyor login/parol, keyin xodimlar uchun rollar |
| **Fayl/rasm** | Supabase Storage | Mahsulot rasmlari uchun (keyinroq) |
| **Deploy (frontend)** | Vercel yoki Netlify | Bepul boshlash, avtomatik SSL |
| **Deploy (backend)** | Railway / Render / Fly.io | Python servisni oson joylashtirish |

### Nega aynan shu kombinatsiya?

FastAPI + Supabase bu yerda eng yaxshi muvozanat. Supabase sizga **tayyor PostgreSQL + Auth** beradi, ya'ni boshidan server sozlash, parol xavfsizligi, backup bilan ovora bo'lmaysiz. FastAPI esa **biznes-logikani** (sotuvда stok kamayishi, nasiya hisobi, hisobotlar, kelajakda 1C/Telegram bot integratsiyasi) o'z qo'lingizda ushlab turadi. Bu ikkisi birga — Supabase'ni "ma'lumotlar bazasi + auth" sifatida, FastAPI'ni "miya" sifatida ishlatasiz.

---

## 2. Arxitektura sxemasi

```
┌─────────────────────────────────────────────────────────┐
│                    FOYDALANUVCHI                          │
│              (telefon yoki kompyuter brauzeri)            │
└───────────────────────────┬─────────────────────────────┘
                            │  HTTPS
                            ▼
┌─────────────────────────────────────────────────────────┐
│   FRONTEND  —  React + TypeScript + Tailwind (Vercel)    │
│   • Sahifalar: Dashboard, Sotuv, Ombor, Nasiya, Moliya   │
│   • TanStack Query → API'dan ma'lumot oladi & cache qiladi│
└─────────────┬───────────────────────────┬───────────────┘
              │ REST API (JSON)           │ Auth (login token)
              ▼                           ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  BACKEND — FastAPI        │   │  Supabase Auth            │
│  (Railway/Render)         │   │  • login / parol          │
│  • Biznes-logika          │   │  • JWT token              │
│  • Stok hisobi            │   └──────────────────────────┘
│  • Nasiya, hisobotlar     │
│  • Validatsiya            │
└─────────────┬─────────────┘
              │ SQLAlchemy
              ▼
┌─────────────────────────────────────────────────────────┐
│   POSTGRESQL  (Supabase)                                  │
│   products · product_sets · raw_materials · sales ·       │
│   nasiya · payments · cash_flows · expenses · users       │
└─────────────────────────────────────────────────────────┘
```

**Ma'lumot oqimi (misol — sotuv qilish):**
1. Foydalanuvchi "Sotuvni saqlash" tugmasini bosadi.
2. Frontend `POST /api/sales` so'rovini token bilan yuboradi.
3. FastAPI tekshiradi: mahsulot bormi, stok yetarlimi, narx to'g'rimi.
4. Bitta tranzaksiyada: sotuv yoziladi, stok kamaytiriladi, naqd bo'lsa kassaga qo'shiladi, nasiya bo'lsa qarz yoziladi.
5. Natija frontend'ga qaytadi, ekran avtomatik yangilanadi.

> **Muhim:** Mavjud HTML'da bularning hammasi brauzerда (JS) qilinardi va ma'lumot yo'qolardi. Yangi tizimда bu mantiq backend'ga ko'chadi va bazaga yoziladi — shuning uchun ishonchli.

---

## 3. Papka tuzilishi (monorepo)

Bitta `picasso/` papkasi ichida frontend va backend yonma-yon:

```
picasso/
├── frontend/                      # React + TypeScript
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── lib/
│   │   │   ├── api.ts             # API client (fetch wrapper)
│   │   │   ├── supabase.ts        # Supabase auth client
│   │   │   └── format.ts          # fmt(), so'm formatlash
│   │   ├── types/                 # TypeScript turlar (Product, Sale...)
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── ui/                # shadcn: Button, Card, Modal, Input...
│   │   │   ├── layout/            # Header, BottomNav
│   │   │   └── shared/            # StatCard, Badge, Toast, EmptyState
│   │   ├── features/             # MODUL ASOSIDA (eng muhim qoida)
│   │   │   ├── dashboard/
│   │   │   ├── sales/
│   │   │   │   ├── SalesPage.tsx
│   │   │   │   ├── AddSaleModal.tsx
│   │   │   │   ├── useSales.ts    # React Query hook
│   │   │   │   └── sales.api.ts
│   │   │   ├── stock/
│   │   │   ├── nasiya/
│   │   │   └── finance/
│   │   ├── hooks/
│   │   └── styles/
│   │       └── globals.css        # Tailwind + design token'lar
│   ├── tailwind.config.ts
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                       # Python + FastAPI
│   ├── app/
│   │   ├── main.py                # FastAPI ilovasi
│   │   ├── config.py              # sozlamalar (.env)
│   │   ├── database.py            # SQLAlchemy ulanish
│   │   ├── deps.py                # auth, get_current_user
│   │   ├── models/                # SQLAlchemy modellar (jadvallar)
│   │   │   ├── product.py
│   │   │   ├── sale.py
│   │   │   ├── nasiya.py
│   │   │   └── ...
│   │   ├── schemas/               # Pydantic (so'rov/javob shakllari)
│   │   ├── routers/               # API endpoint'lar
│   │   │   ├── products.py
│   │   │   ├── sales.py
│   │   │   ├── stock.py
│   │   │   ├── nasiya.py
│   │   │   └── finance.py
│   │   ├── services/              # BIZNES-LOGIKA shu yerda
│   │   │   ├── sale_service.py    # sotuv + stok + kassa
│   │   │   └── report_service.py
│   │   └── crud/                  # baza bilan ishlash
│   ├── alembic/                   # migration'lar
│   ├── tests/                     # pytest
│   ├── requirements.txt
│   └── .env.example
│
├── docs/                          # shu hujjatlar
└── README.md
```

**Asosiy qoida — "feature-based" (modul asosida) tuzilma:** har bir biznes bo'lim (sotuv, ombor, nasiya...) o'z papkasiga ega. Yangi bo'lim qo'shganda faqat yangi papka qo'shasiz, eski kodga tegmaysiz. Bu kengaytirishni oson qiladi.

---

## 4. Bosqichma-bosqich qurish rejasi

### Bosqich 0 — Tayyorgarlik (1-2 kun)
- GitHub repo ochish, monorepo tuzilmasini yaratish.
- Supabase loyiha ochish (bepul tarif).
- `.env` fayllar: DB ulanish, Supabase kalitlari.

### Bosqich 1 — Ma'lumotlar bazasi (2-3 kun)
- DB sxemani Supabase'ga qo'llash (`02-DATABASE-SCHEMA.sql`).
- Boshlang'ich test ma'lumotlarini kiritish (seed).
- Alembic'ni backend'ga ulash.

### Bosqich 2 — Backend asosi (3-5 kun)
- FastAPI loyihasi, DB ulanishi, auth.
- CRUD endpoint'lar: products, raw_materials, sets.
- **Eng muhim:** `sale_service` — sotuv, stok kamayishi, kassa, nasiya bir tranzaksiyada.
- Swagger'da har bir endpoint'ni qo'lda tekshirish.

### Bosqich 3 — Frontend asosi (3-5 kun)
- Vite + React + Tailwind o'rnatish, design token'larni ko'chirish.
- Layout: Header + Bottom Nav (mavjud dizayndek).
- Login sahifa (Supabase Auth).
- API client + TanStack Query.

### Bosqich 4 — Modullarni ko'chirish (1-2 hafta)
Tartibда: Ombor → Sotuv → Nasiya → Moliya → Dashboard. Har birini backend bilan ulab, real bazaga yozadigan qilish.

### Bosqich 5 — Sayqal va deploy (3-5 kun)
- Responsive tekshiruv (telefon + kompyuter).
- Xatoliklarni qayta ishlash (error handling), loading holatlari.
- Vercel + Railway'ga deploy, real domen.

### Bosqich 6 (keyin) — Kengaytirishlar
Xodimlar va rollar, ko'p filial, Telegram bot xabarnomalari, eksport (Excel/PDF hisobotlar), offline (PWA).

---

## 5. Offline rejimni tushuntirish (sizning savolingiz)

**Muammo:** do'konда internet bir lahza uzilsa, oddiy onlayn ilovada "Saqlash" tugmasi ishlamaydi — sotuvchi mijozni kutib turishi kerak bo'ladi.

**Yechim (offline-first / PWA):** ilova ma'lumotni avval qurilmaning o'z xotirasiga (IndexedDB) yozadi, ekranда darhol ko'rsatadi, internet qaytganda serverga jimgina yuboradi (sync). Foydalanuvchi uzilishni sezmaydi ham.

**Sizning holatingizda (1 nuqta, doimiy internet):** hozir buni qurish ortiqcha mehnat. Lekin biz arxitekturani shunga **tayyor** qilamiz:
- API'lar toza va alohida (offline qatlamni keyin ustiga qo'shsa bo'ladi).
- Frontend'ni PWA qilib o'rnatamiz (telefon/kompyuterga "ilova" sifatida o'rnatiladigan).
- Keyin kerak bo'lsa, faqat sync qatlamini qo'shamiz — qaytadan yozmaysiz.

**Tavsiya:** Bosqich 1-5 onlayn. Offline'ni Bosqich 6'ga qoldiramiz, biznes 2-3 nuqtaga yetganda.

---

## 6. Xavfsizlik va ishonchlilik (qisqacha)

- **Auth:** har bir API so'rovi JWT token bilan. Token'siz hech narsa o'qib/yozib bo'lmaydi.
- **Validatsiya:** Pydantic backend'da har bir kiruvchi ma'lumotni tekshiradi (narx manfiy bo'lmasin, stok yetarli bo'lsin).
- **Tranzaksiya:** sotuv kabi ko'p qadamli amallar "hammasi yoki hech narsa" tamoyilida (biri xato bo'lsa, hammasi orqaga qaytadi).
- **Backup:** Supabase avtomatik kunlik backup qiladi.
- **Pul birligi:** so'm butun son (integer) sifatida saqlanadi (tiyin/kasr xatolaridan saqlanish uchun). Mavjud koddagi `*1000` mantig'i backend'ga ko'chadi.

---

## 7. Keyingi qadam

1. `02-DATABASE-SCHEMA.sql` — bazani Supabase'da yaratish.
2. `03-DESIGN-SYSTEM.md` — dizayn token'lari va komponentlar.
3. `04-AI-PROMPTLAR.md` — Cursor/Claude Code uchun ketma-ket promptlar bilan qurishni boshlash.
