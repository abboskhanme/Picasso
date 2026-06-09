# Picasso ERP — to'liq audit va isloh rejasi

> Sana: 2026-06-05. Butun loyiha (backend, frontend, dizayn, infra/DB/docs) chuqur tekshirildi.
> Maqsad: **professional, lekin sodda va ortiqcha narsasiz** tizim. Quyida faqat reja — hech narsa o'zgartirilmagan.
> Har bir band tasdiqlangandan keyin bosqichma-bosqich bajariladi.

## Umumiy xulosa

Loyiha tuzilishi yaxshi: backend qatlamlari (models/schemas/routers/services) to'g'ri ajratilgan, frontend toza (TanStack Query, umumiy UI komponentlar), dizayn ichki jihatdan izchil. Asosiy muammolar 4 ta yo'nalishda:

1. **Xavfsizlik** — `.env` git'da, CORS ochiq, rollar tekshirilmaydi, login himoyasiz.
2. **Ma'lumot butunligi** — sotuv/ishlab chiqarishda tranzaksiya tartibi xato bo'lishi mumkin, ledger bitta joyda chetlab o'tilgan, pul/miqdor hisobida float xatolari.
3. **Frontend mustahkamligi** — 401 (token eskirsa) ushlanmaydi, xato holatlari ko'rsatilmaydi, ro'yxatlar paginatsiyasiz.
4. **Prod tayyorgarlik** — yuklangan rasmlar prodda yo'qoladi, backup yo'q, migratsiya tizimi yo'q.

---

## FAZA 0 — Kritik xavfsizlik va ma'lumot yo'qotish xavfi (eng birinchi)

| # | Muammo | Joy | Yechim |
|---|--------|-----|--------|
| 0.1 | `.env` (parol, JWT_SECRET) git'ga qo'shilgan | repo ildizi | `git rm --cached .env`, tarixdan tozalash, yangi JWT_SECRET va DB parol generatsiya qilish |
| 0.2 | Prodda yuklangan rasmlar konteyner qayta ishga tushganda o'chib ketadi | `docker-compose.prod.yml` | backend'ga `uploads` volume qo'shish |
| 0.3 | `SEED_ON_START` prod'da default `true` — real ma'lumot ustiga demo yoziladi | `docker-compose.prod.yml:32` | default `false` qilish |
| 0.4 | JWT_SECRET default `change_me_in_production` bilan ham ishlayveradi | `config.py` | prod rejimda default secret bilan ishga tushishni rad etish |
| 0.5 | CORS `allow_origins=["*"]` + credentials | `main.py:50` | `.env` dagi `ALLOWED_ORIGINS` dan o'qish |
| 0.6 | Rol tekshiruvi umuman yo'q — har qanday login qilgan user hamma narsani o'chira oladi | barcha routerlar | `require_role()` dependency: admin / sotuvchi. O'chirish, tahrirlash, moliya — faqat admin |
| 0.7 | Login'da brute-force himoyasi yo'q | `auth.py` | oddiy rate-limit (slowapi, 5/daqiqa) — faqat login endpointiga |
| 0.8 | Avtomatik backup yo'q — DB buzilsa biznes to'xtaydi | prod compose | kunlik `pg_dump` + uploads arxivi servis sifatida, 7 kunlik rotatsiya |
| 0.9 | Rasm yuklashda faqat client MIME tekshiriladi (soxtalash mumkin) | `uploads.py` | magic-bytes (PNG/JPEG imzosi) tekshiruvi + hajm limiti |

## FAZA 1 — Backend: ma'lumot to'g'riligi

| # | Muammo | Joy | Yechim |
|---|--------|-----|--------|
| 1.1 | `create_sale` va `produce` da xato yuz bersa qisman yozilgan harakatlar qolishi mumkin | `sale_service.py`, `inventory_service.py` | bitta tranzaksiya: barcha amallar muvaffaqiyatli bo'lgandagina commit, xatoda to'liq rollback (routerlarda try/except + rollback) |
| 1.2 | Harakat o'chirilganda stok **to'g'ridan-to'g'ri** o'zgartiriladi — ledger chetlab o'tiladi | `inventory_service.py` `_revert_stock` | reversal ham `apply_movement` orqali, asl harakatga bog'langan holda (ledger qoidasiga to'liq rioya) |
| 1.3 | Batch revert taxminiy moslash bilan (qty+cost bo'yicha) — noto'g'ri partiyani qaytarishi mumkin | `_revert_batch` | movement `ref_id` orqali batch'ga to'g'ridan-to'g'ri bog'lash |
| 1.4 | Pul hisobida yo'qotish: `unit_cost = int(round(cost/qty))` — 1000/3 da som yo'qoladi; miqdorlar float | `inventory_service.py:148` va boshqalar | pul — butun so'm (int), miqdor — `Decimal`; yaxlitlash faqat ko'rsatishda |
| 1.5 | Dashboard barcha sotuvlarni xotiraga yuklab Python'da filtrlaydi | `reports.py:18` | sana filtri va agregatsiyani SQL darajasiga ko'chirish |
| 1.6 | Miqdor maydonlarida manfiy son qabul qilinadi | `schemas/__init__.py` | barcha qty/amount maydonlariga `Field(gt=0)` |
| 1.7 | `RawMaterialMovement` jadvali o'lik — hech qayerda yozilmaydi | `models/__init__.py` | jadval va modelni olib tashlash |
| 1.8 | Migratsiya yo'q: startup'da `create_all` + qo'lda ALTER satrlari | `main.py` | **Alembic** joriy etish, startup DDL'ni olib tashlash |
| 1.9 | Stok-o'zgartirish logikasi 2 joyda takror | `products.py` va `stock.py` | bitta endpoint qoldirish (stock.py), ikkinchisini olib tashlash |
| 1.10 | Sehrli satrlar: `"naqd"`, `"buy"`, `"sale"`... hamma joyda | barcha routerlar | bitta `enums.py` (PaymentMethod, MoveType, Category) |
| 1.11 | `/health` endpoint yo'q | `main.py` | oddiy `GET /health` qo'shish (compose healthcheck uchun) |
| 1.12 | `print()` bilan log | `seed.py` va boshqalar | standart `logging` (fayl/stdout) — Sentry'siz, sodda |
| 1.13 | Ro'yxat endpointlarida limit har xil (200/100/cheksiz) | sales, stock, movements | yagona `limit/offset` paginatsiya parametri (max 500) |

## FAZA 2 — Frontend: mustahkamlik va tartib

| # | Muammo | Joy | Yechim |
|---|--------|-----|--------|
| 2.1 | Token eskirsa (401) — foydalanuvchi xato bilan qotib qoladi | `lib/api.ts` | 401 da token tozalash + login sahifasiga yo'naltirish (markaziy interceptor) |
| 2.2 | Global ErrorBoundary yo'q — bitta xato butun ilovani yiqitadi | `App.tsx` | sodda ErrorBoundary + «Sahifani yangilash» tugmasi |
| 2.3 | Ko'p mutationlarda `onError` yo'q — xato jimgina yutiladi | ProductForm, RawForm, SetForm va b. | barcha mutationlarga yagona xato-toast handler |
| 2.4 | Har mutation 6–8 ta query'ni invalidatsiya qiladi (ortiqcha so'rovlar bo'roni) | SalesPage, InventoryTab, FinancePage... | umumiy `useInvalidate(keys)` hook — faqat tegishli keylar |
| 2.5 | Sana/vaqt: `dtToISO` UTC ga o'girib lokal vaqtni buzishi mumkin | `ui/index.tsx` DateTimeField | bitta `lib/datetime.ts` modul — lokal↔ISO aniq konversiya, hamma joyda shu |
| 2.6 | Sotuvlar/harakatlar/nasiya ro'yxatlari paginatsiyasiz (10k yozuvda sekinlashadi) | SalesPage, MovementsTab, NasiyaPage | «Yana yuklash» tugmasi bilan sodda paginatsiya (1.13 ga tayanadi) |
| 2.7 | `<Toaster />` har sahifada alohida | StockPage, ZaxiraPage | bitta marta App.tsx ga ko'chirish |
| 2.8 | InventoryTab 428 qator, SalesPage 270 qator — bitta faylda hamma narsa | `features/stock`, `features/sales` | RawTab, ProductsTab, AddSaleModal, ProductPicker alohida fayllarga |
| 2.9 | SetsPage'da native `confirm()` — boshqa joylarda ConfirmDialog | `SetsPage.tsx:37` | yagona ConfirmDialog |
| 2.10 | Miqdor inputlarida min/step nazorati sust | ItemModals, SalesPage | `min={0}` + manfiy qiymatni bloklash |
| 2.11 | «Arxivlash» va «O'chirish» atamalari aralash | RawTab va b. | hamma joyda yagona atama (soft-delete = «Arxivlash») |
| 2.12 | Lokal tiplar tarqoq (CartLine, ItemRef) | features ichida | `types/index.ts` ga yig'ish |

## FAZA 3 — Dizayn / UX siloliklari

| # | Muammo | Joy | Yechim |
|---|--------|-----|--------|
| 3.1 | `docs/03-DESIGN-SYSTEM.md` eskirgan — koddagi dizayn (Inter, neytral SaaS) hujjatdagidan (Nunito, shokolad) butunlay farq qiladi | docs | hujjatni **amaldagi** dizaynga moslab qayta yozish (kod yaxshi — uni o'zgartirmaymiz) |
| 3.2 | Placeholder kontrasti WCAG AA dan o'tmaydi (2.8:1) | `ui/index.tsx:185` | `placeholder:text-faint` → `placeholder:text-muted` |
| 3.3 | Grid oraliqlari aralash (gap-3 / gap-4), ro'yxat paddinglari har xil (px-4 vs px-4 sm:px-5) | bir nechta sahifa | qoida: stat-grid = gap-3, detail-grid = gap-4; barcha ro'yxat qatorlari = `px-4 sm:px-5 py-3` |
| 3.4 | Ro'yxat qatorlari 5 sahifada 5 xil qo'lda yozilgan | Sales, Finance, Movements, Production | umumiy `DataRow` komponenti (icon + nom + detal + qiymat + amallar) |
| 3.5 | Modal footerlari har xil tuzilgan | barcha modallar | umumiy `ModalFooter` (info chap + tugma o'ng) |
| 3.6 | Ombor kartasida 5 ta amal tugmasi — mobilda juda zich | `InventoryTab.tsx` | 2 asosiy (Kirim/Chiqim) + qolganlari «⋯» menyuda |
| 3.7 | O'chirish tugmalarida `aria-label` yo'q; Dropdown'da `aria-expanded` yo'q | ro'yxat tugmalari, Dropdown | aria atributlarini qo'shish |
| 3.8 | Chart ranglari Dashboard ichida hardcoded | `DashboardPage.tsx:14-24` | `lib/colors.ts` ga chiqarish |
| 3.9 | «Oylik chiqim» stat kartasi pushti (p) — semantik chalkash | Dashboard | tone nomlarini hujjatlashtirish yoki chiqimga mosroq rang |

## FAZA 4 — Infra, deploy, hujjatlar

| # | Muammo | Joy | Yechim |
|---|--------|-----|--------|
| 4.1 | Backend/frontend'da healthcheck va resurs limitlari yo'q | ikkala compose | healthcheck (1.11 dagi `/health`) + memory limit |
| 4.2 | nginx'da gzip va cache headerlari yo'q | `frontend/nginx.conf` | gzip + statik fayllarga `Cache-Control: immutable`, index.html'ga `no-cache` |
| 4.3 | `.dockerignore` lar to'liq emas (`.env*`, `.git` kirmagan) | backend/frontend | kengaytirish |
| 4.4 | DB pool sozlanmagan | `database.py` | `pool_size`, `pool_recycle=3600` qo'shish |
| 4.5 | DEPLOY.md da yangilash/rollback tartibi yo'q | `DEPLOY.md` | «Yangilash tartibi» bo'limi: backup → pull → build → tekshirish → rollback yo'li |
| 4.6 | `docs/01-ARXITEKTURA.md` Supabase'ni eslatadi — eskirgan | docs | amaldagi arxitekturaga (FastAPI JWT + lokal uploads) moslash |
| 4.7 | `docs/02-DATABASE-SCHEMA.sql` modellardan orqada qolgan | docs | Alembic kiritilgach yangilash yoki «ma'lumot uchun» deb belgilash |
| 4.8 | `__pycache__` fayllari repoda | backend | git'dan olib tashlash, .gitignore'ga qo'shish |
| 4.9 | `db/` papkasi bo'sh/ishlatilmaydi | repo ildizi | olib tashlash yoki backup skriptlari uchun ishlatish |

---

## Ataylab QILINMAYDI (ortiqcha murakkablik)

Sodda saqlash uchun quyidagilar rejaga **kiritilmadi**: Sentry/OpenTelemetry/Prometheus, refresh-token sxemasi, CSRF middleware (JWT header bilan kerak emas), offline rejim/service worker, dark mode, Zod + React Hook Form migratsiyasi, optimistic updates, virus-skanerlash, mikroservislar, tablet (`md:`) uchun alohida layout. Batch/FEFO va ProductSet — ishlatilayotgan funksiyalar, qoladi.

## Bajarish tartibi va hajmi

| Faza | Mazmun | Taxminiy hajm |
|------|--------|---------------|
| 0 | Xavfsizlik + backup + RBAC | 1–2 kun |
| 1 | Backend butunlik + Alembic | 2–3 kun |
| 2 | Frontend mustahkamlik | 2–3 kun |
| 3 | Dizayn/UX siloliklari | 1–2 kun |
| 4 | Infra + hujjatlar | 1 kun |

Har faza alohida tasdiqlanib, alohida commit(lar) bilan bajariladi. Faza ichida ham xohlagan bandni olib tashlash/qo'shish mumkin.
