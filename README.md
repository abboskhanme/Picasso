# Picasso ERP/CRM

Shokolad biznesi uchun boshqaruv tizimi. FastAPI (backend) + React/TypeScript (frontend) + PostgreSQL, hammasi Docker'da.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind + TanStack Query
- **Backend:** Python + FastAPI + SQLAlchemy 2.0
- **Baza:** PostgreSQL 16
- **Auth:** JWT (FastAPI ichida)
- **Konteyner:** Docker Compose (db + backend + frontend)

## Tez ishga tushirish (Docker)

Faqat Docker va Docker Compose kerak.

```bash
cp .env.example .env        # kerak bo'lsa qiymatlarni o'zgartiring
docker compose up --build
```

So'ng:

| Servis | Manzil |
|--------|--------|
| Frontend (ilova) | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API hujjat (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

**Demo kirish:** `admin@picasso.uz` / `admin123`
(birinchi ishga tushirishda baza avtomatik yaratiladi va test ma'lumotlari bilan to'ldiriladi)

## Loyiha tuzilmasi

```
Picasso/
├── docker-compose.yml
├── docker-compose.prod.yml
├── Caddyfile
├── .env.example
├── docs/                     # arxitektura va dizayn hujjatlari
├── backend/                  # FastAPI
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py           # ilova + startup (jadval yaratish + seed)
│       ├── config.py         # sozlamalar (.env)
│       ├── database.py       # SQLAlchemy ulanish
│       ├── deps.py           # JWT auth dependency
│       ├── seed.py           # boshlang'ich ma'lumot
│       ├── core/security.py  # parol hash + JWT
│       ├── models/           # ORM jadvallar
│       ├── schemas/          # Pydantic
│       ├── services/         # biznes-logika (sale_service)
│       └── routers/          # auth, products, stock, sets, sales, nasiya, finance, reports
└── frontend/                 # React + TS
    ├── Dockerfile            # build -> nginx
    ├── nginx.conf
    └── src/
        ├── lib/api.ts        # API client + auth token
        ├── types/            # TypeScript turlar
        ├── components/       # ui + layout (Shell: sidebar/bottom-nav)
        └── features/         # dashboard, sales, stock, nasiya, finance, auth
```

## Lokal ishlab chiqish (Docker'siz)

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+psycopg://picasso:picasso_secret@localhost:5432/picasso"
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

## API endpointlar (asosiy)

| Metod | Yo'l | Vazifa |
|-------|------|--------|
| POST | `/auth/login` | Tizimga kirish (token) |
| GET | `/reports/dashboard` | Bosh sahifa ma'lumotlari |
| GET/POST | `/products` | Mahsulotlar |
| POST | `/products/{id}/stock` | Stok yangilash |
| GET/POST | `/sales` | Sotuvlar (stok+kassa+nasiya bitta tranzaksiyada) |
| GET | `/stock/raw`, POST `/stock/raw/buy`,`/use` | Xom ashyo |
| GET/POST | `/sets` | To'plamlar |
| GET | `/nasiya`, POST `/nasiya/{id}/pay` | Nasiya |
| GET/POST | `/finance/cash-flows`, GET `/finance/balance` | Moliya |

## Xavfsizlik eslatmasi

Ishlab chiqarishga chiqarishdan oldin:
1. `.env` da `JWT_SECRET` ni uzun tasodifiy satrga o'zgartiring.
2. `POSTGRES_PASSWORD` ni kuchli parolga o'zgartiring.
3. `backend/app/main.py` da CORS `allow_origins` ni frontend domeniga cheklang.
4. `SEED_ON_START` ni `false` qiling (test ma'lumoti kerak emas).
