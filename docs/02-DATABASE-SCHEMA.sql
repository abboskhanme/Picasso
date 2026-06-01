-- ============================================================
--  PICASSO ERP/CRM — PostgreSQL / Supabase sxema
--  Shokolad biznesi uchun. Mavjud HTML prototip modeliga asoslangan,
--  lekin normallashtirilgan (relyatsion) va kengaytirishga tayyor.
--
--  Pul birligi: BUTUN SON (integer), to'liq so'mda saqlanadi.
--  (HTML'dagi "*1000" — bu faqat kiritish qulayligi, bazaga to'liq summa yoziladi.)
--
--  Supabase SQL Editor'ga shu faylni to'liq joylashtirib ishga tushiring.
-- ============================================================

-- ---------- Kengaytmalar ----------
create extension if not exists "pgcrypto";   -- gen_random_uuid() uchun

-- ---------- ENUM turlar ----------
do $$ begin
  create type unit_type      as enum ('dona','gramm','kg','litr','paket','quti','metr');
exception when duplicate_object then null; end $$;

-- Agar enum allaqachon mavjud bo'lsa, 'metr' qiymatini qo'shamiz (qadoqlash uchun)
do $$ begin
  alter type unit_type add value if not exists 'metr';
exception when others then null; end $$;

do $$ begin
  create type payment_method as enum ('naqd','karta','nasiya');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sale_kind      as enum ('dona','set');     -- yakka mahsulot yoki to'plam
exception when duplicate_object then null; end $$;

do $$ begin
  create type cash_direction as enum ('in','out');        -- kirim / chiqim
exception when duplicate_object then null; end $$;

do $$ begin
  create type raw_move_type  as enum ('buy','use','adjust'); -- xom ashyo: olish/sarflash/tuzatish
exception when duplicate_object then null; end $$;

-- ---------- updated_at avtomatik yangilash uchun trigger funksiyasi ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
--  1. PROFILES — foydalanuvchilar (Supabase auth.users bilan bog'lanadi)
--     Hozir 1 kishi, lekin kelajakda xodimlar/rollar uchun tayyor.
-- ============================================================
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'owner',  -- owner | seller | warehouse (kelajak)
  created_at  timestamptz not null default now()
);

-- ============================================================
--  2. PRODUCTS — tayyor mahsulotlar
-- ============================================================
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  emoji       text default '🍫',
  price       bigint not null default 0 check (price >= 0),  -- sotish narxi, so'm
  cost_price  bigint not null default 0 check (cost_price >= 0), -- tannarx, so'm
  description text,                                          -- tarkibi/tafsifi (masalan: "Oq shokolad + bodom")
  category    text,                                          -- guruh (masalan: "Oq shokolad","Sutli","Truffel")
  stock       numeric(12,2) not null default 0,              -- joriy qoldiq
  min_stock   numeric(12,2) not null default 5,              -- ogohlantirish chegarasi
  unit        unit_type not null default 'dona',
  is_active   boolean not null default true,                 -- o'chirish o'rniga arxivlash
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Mavjud bazaga ustunlar qo'shish (idempotent)
alter table products add column if not exists cost_price bigint not null default 0;
alter table products add column if not exists description text;
alter table products add column if not exists category   text;
create index if not exists idx_products_active on products(is_active);
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

-- ============================================================
--  3. PRODUCT_SETS — to'plamlar (masalan "Valentina seti")
--     va ularning tarkibi (set_items)
-- ============================================================
create table if not exists product_sets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  emoji       text default '🎁',
  price       bigint not null default 0 check (price >= 0),  -- to'plam sotish narxi
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_sets_updated before update on product_sets
  for each row execute function set_updated_at();

create table if not exists product_set_items (
  set_id      uuid not null references product_sets(id) on delete cascade,
  product_id  uuid not null references products(id) on delete restrict,
  qty         numeric(12,2) not null check (qty > 0),
  primary key (set_id, product_id)
);

-- ============================================================
--  4. RAW_MATERIALS — xom ashyo (kakao, qand, moy...)
--     va harakatlar tarixi (movements)
-- ============================================================
create table if not exists raw_materials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default 'xomashyo',          -- 'xomashyo' | 'qadoqlash'
  unit        unit_type not null default 'kg',
  unit_price  bigint default 0 check (unit_price >= 0),  -- standart birlik narxi (ixtiyoriy)
  stock       numeric(12,3) not null default 0,
  min_stock   numeric(12,3) not null default 2,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Mavjud bazaga ustun qo'shish (idempotent)
alter table raw_materials add column if not exists category text not null default 'xomashyo';
create index if not exists idx_raw_category on raw_materials(category, is_active);
create trigger trg_raw_updated before update on raw_materials
  for each row execute function set_updated_at();

create table if not exists raw_material_movements (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references raw_materials(id) on delete cascade,
  move_type    raw_move_type not null,            -- buy / use / adjust
  qty          numeric(12,3) not null,            -- buy=+, use=- (mutlaq qiymat saqlang, belgi move_type'dan)
  cost         bigint default 0 check (cost >= 0),-- sotib olishda umumiy narx
  note         text,                              -- "Sut shokoladi uchun sarflandi" kabi
  occurred_at  timestamptz not null default now(),
  created_by   uuid references profiles(id)
);
create index if not exists idx_raw_mov_material on raw_material_movements(material_id, occurred_at desc);

-- ============================================================
--  5. CUSTOMERS — mijozlar (asosan nasiya uchun)
-- ============================================================
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (phone)
);
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();

-- ============================================================
--  6. SALES — sotuvlar (sarlavha) + sale_items (tarkib)
--     Bir sotuvда bir nechta mahsulot bo'lishi mumkin (kengaytirishga tayyor).
--     To'plam sotilganда: kind='set', set_id to'ldiriladi, sale_items'ga
--     to'plam tarkibidagi mahsulotlar yoziladi (stok hisobi uchun).
-- ============================================================
create table if not exists sales (
  id             uuid primary key default gen_random_uuid(),
  kind           sale_kind not null default 'dona',
  set_id         uuid references product_sets(id),       -- agar to'plam bo'lsa
  payment_method payment_method not null default 'naqd',
  customer_id    uuid references customers(id),          -- nasiya bo'lsa to'ldiriladi
  total          bigint not null check (total >= 0),     -- jami summa, so'm
  note           text,
  occurred_at    timestamptz not null default now(),
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create index if not exists idx_sales_date     on sales(occurred_at desc);
create index if not exists idx_sales_payment  on sales(payment_method);
create index if not exists idx_sales_customer on sales(customer_id);

create table if not exists sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references sales(id) on delete cascade,
  product_id  uuid references products(id),       -- yakka mahsulot
  name_snapshot text not null,                    -- sotuv paytidagi nom (tarix uchun)
  emoji_snapshot text,
  qty         numeric(12,2) not null check (qty > 0),
  unit_price  bigint not null check (unit_price >= 0),
  line_total  bigint not null check (line_total >= 0)
);
create index if not exists idx_sale_items_sale on sale_items(sale_id);
create index if not exists idx_sale_items_prod on sale_items(product_id);

-- ============================================================
--  7. NASIYA_PAYMENTS — nasiya qarz to'lovlari
--     Qarz qoldig'i = (nasiya sotuvlar summasi) - (to'lovlar summasi).
--     Buni VIEW orqali hisoblaymiz (pastda), alohida "debt" ustuni saqlamaymiz —
--     shunda nomuvofiqlik (rassinxron) bo'lmaydi.
-- ============================================================
create table if not exists nasiya_payments (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  sale_id     uuid references sales(id),           -- ixtiyoriy: qaysi sotuvga
  amount      bigint not null check (amount > 0),
  note        text,
  occurred_at timestamptz not null default now(),
  created_by  uuid references profiles(id)
);
create index if not exists idx_nasiya_pay_customer on nasiya_payments(customer_id, occurred_at desc);

-- ============================================================
--  8. CASH_FLOWS — pul oqimi (yagona manba)
--     Kirim: sotuv (naqd/karta), investitsiya, nasiya to'lovi.
--     Chiqim: xarajatlar, xom ashyo.
--     "Xarajat" = direction='out' bo'lgan cash_flow (alohida jadval shart emas).
-- ============================================================
create table if not exists cash_flows (
  id           uuid primary key default gen_random_uuid(),
  direction    cash_direction not null,            -- in / out
  amount       bigint not null check (amount > 0),
  category     text,                               -- 'Sotuv','Ijara','Maosh','Xom ashyo','Investitsiya'...
  note         text,
  -- bog'lovchi havolalar (qaysi hodisadan kelib chiqqan):
  sale_id      uuid references sales(id),
  nasiya_payment_id uuid references nasiya_payments(id),
  raw_movement_id   uuid references raw_material_movements(id),
  occurred_at  timestamptz not null default now(),
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_cash_date on cash_flows(occurred_at desc);
create index if not exists idx_cash_dir  on cash_flows(direction);

-- ============================================================
--  VIEW'lar — hisobotlarni soddalashtirish uchun
-- ============================================================

-- Har bir mijozning joriy qarzi
create or replace view customer_balances as
select
  c.id                              as customer_id,
  c.name,
  c.phone,
  coalesce(s.total_nasiya, 0)       as total_nasiya,   -- nasiyaga olingan
  coalesce(p.total_paid, 0)         as total_paid,     -- to'langan
  coalesce(s.total_nasiya, 0) - coalesce(p.total_paid, 0) as debt
from customers c
left join (
  select customer_id, sum(total) as total_nasiya
  from sales
  where payment_method = 'nasiya' and customer_id is not null
  group by customer_id
) s on s.customer_id = c.id
left join (
  select customer_id, sum(amount) as total_paid
  from nasiya_payments
  group by customer_id
) p on p.customer_id = c.id;

-- Kassa qoldig'i (umumiy balans)
create or replace view cash_balance as
select
  coalesce(sum(amount) filter (where direction='in'), 0)
  - coalesce(sum(amount) filter (where direction='out'), 0) as balance
from cash_flows;

-- Kam qolgan mahsulotlar (ogohlantirish uchun)
create or replace view low_stock_products as
select * from products
where is_active and stock <= min_stock;

-- ============================================================
--  RLS (Row Level Security) — Supabase xavfsizligi
--  Hozir: har qanday tizimga kirgan foydalanuvchi to'liq ruxsatga ega.
--  Kelajakda rollar bo'yicha cheklash shu yerda qo'shiladi.
-- ============================================================
alter table profiles               enable row level security;
alter table products               enable row level security;
alter table product_sets           enable row level security;
alter table product_set_items      enable row level security;
alter table raw_materials          enable row level security;
alter table raw_material_movements enable row level security;
alter table customers              enable row level security;
alter table sales                  enable row level security;
alter table sale_items             enable row level security;
alter table nasiya_payments        enable row level security;
alter table cash_flows             enable row level security;

-- Universal "tizimga kirgan bo'lsa ruxsat" siyosati (hozircha)
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','products','product_sets','product_set_items',
    'raw_materials','raw_material_movements','customers',
    'sales','sale_items','nasiya_payments','cash_flows'
  ] loop
    execute format(
      'create policy "authenticated_all" on %I for all to authenticated using (true) with check (true);', t
    );
  end loop;
exception when duplicate_object then null;
end $$;

-- ============================================================
--  SEED — boshlang'ich test ma'lumotlari (HTML prototipdan)
--  Ishlab chiqarishga o'tishdan oldin o'chirib tashlang.
-- ============================================================
insert into products (name, emoji, price, cost_price, description, category, stock, min_stock, unit) values
  ('Sut shokoladi',        '🍫', 15000,  9000, 'Sutli shokolad, sof',                'Sutli',     50, 10, 'dona'),
  ('Qora shokolad',        '🍬', 18000, 11000, 'Achchiq qora shokolad 70%',          'Qora',       8, 10, 'dona'),
  ('Oq shokolad bodomli',  '🤍', 22000, 13000, 'Oq shokolad + bodom',                'Oq shokolad',20,  5, 'dona'),
  ('Oq shokolad yong''oqli','🥜', 23000, 13500, 'Oq shokolad + yong''oq',            'Oq shokolad',18,  5, 'dona'),
  ('Lavender truffel',     '🟣', 25000, 15000, 'Lavanda ta''mli truffel',            'Truffel',   30,  5, 'dona'),
  ('Shirin savol',         '🎁', 35000, 20000, 'Aralash shokolad to''plami',         'To''plam',  15,  5, 'quti')
on conflict do nothing;

-- Xomashyo
insert into raw_materials (name, category, unit, unit_price, stock, min_stock) values
  ('Kakao kukuni', 'xomashyo', 'kg', 36000, 4.5, 2),
  ('Qand',         'xomashyo', 'kg',  9000, 8,   2),
  ('Kakao moyi',   'xomashyo', 'kg', 83000, 2,   1),
  ('Bodom',        'xomashyo', 'kg', 95000, 3,   1),
  ('Yong''oq',     'xomashyo', 'kg', 78000, 2.5, 1)
on conflict do nothing;

-- Qadoqlash mahsulotlari
insert into raw_materials (name, category, unit, unit_price, stock, min_stock) values
  ('Sovg''a qutisi',   'qadoqlash', 'dona', 3000, 120, 30),
  ('Lenta (tasma)',    'qadoqlash', 'metr',  500, 200, 50),
  ('Shtrix-kod varog''i','qadoqlash','dona',  150, 300, 50),
  ('Stiker (yorliq)',  'qadoqlash', 'dona',  200, 250, 50)
on conflict do nothing;

-- Boshlang'ich kapital
insert into cash_flows (direction, amount, category, note)
values ('in', 2000000, 'Investitsiya', 'Boshlang''ich kapital');

-- ============================================================
--  KENGAYTMA (2026): Ombor moduli — ishlab chiqarish, retsept,
--  universal harakatlar jurnali, partiyalar.
--  Eslatma: backend ishga tushganda bu jadvallarni SQLAlchemy avtomatik
--  yaratadi (create_all). Bu blok hujjat va Supabase'da qo'lda yaratish uchun.
-- ============================================================

-- 9. INVENTORY_MOVEMENTS — universal harakatlar jurnali (audit log)
--     Har qanday stok o'zgarishi (kirim/chiqim/ishlab chiqarish/sotuv/tuzatish/brak)
--     shu yerga balance_after bilan yoziladi. Istalgan davr tarixini tiklash uchun.
create table if not exists inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  item_type     text not null,                 -- product | raw
  item_id       uuid not null,
  item_name     text not null,                 -- nom snapshot (tarix uchun)
  item_category text,
  unit          text,
  move_type     text not null,                 -- buy|produce|use|sale|adjust|writeoff|return|manual
  delta         numeric(12,3) not null,        -- ishorali (+ kirim, - chiqim)
  balance_after numeric(12,3) not null,        -- harakatdan keyingi qoldiq
  unit_cost     bigint not null default 0,
  cost          bigint not null default 0,
  ref_type      text,                          -- sale|production|purchase|count
  ref_id        uuid,
  note          text,
  occurred_at   timestamptz not null default now(),
  created_by    uuid references profiles(id)
);
create index if not exists idx_invmov_item on inventory_movements(item_type, item_id, occurred_at desc);
create index if not exists idx_invmov_date on inventory_movements(occurred_at desc);
create index if not exists idx_invmov_type on inventory_movements(move_type);

-- 11. PRODUCT_RECIPES — retsept (BOM): 1 dona mahsulotga ketadigan xomashyo
create table if not exists product_recipes (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  material_id uuid not null references raw_materials(id) on delete cascade,
  qty         numeric(12,3) not null check (qty > 0)
);
create index if not exists idx_recipe_product on product_recipes(product_id);

-- 12. PRODUCTIONS — ishlab chiqarish partiyalari
create table if not exists productions (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id),
  product_name text not null,
  qty          numeric(12,2) not null,
  cost_total   bigint not null default 0,      -- sarflangan xomashyo tannarxi
  unit_cost    bigint not null default 0,      -- 1 donaga tannarx
  note         text,
  occurred_at  timestamptz not null default now(),
  created_by   uuid references profiles(id)
);
create index if not exists idx_productions_date on productions(occurred_at desc);

-- 13. BATCHES — partiya / yaroqlilik muddati (FEFO)
create table if not exists batches (
  id              uuid primary key default gen_random_uuid(),
  item_type       text not null,               -- product | raw
  item_id         uuid not null,
  item_name       text not null,
  qty_initial     numeric(12,3) not null,
  qty_remaining   numeric(12,3) not null,
  unit            text,
  production_date date,
  expiry_date     date,
  unit_cost       bigint not null default 0,
  note            text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_batches_item   on batches(item_type, item_id);
create index if not exists idx_batches_expiry on batches(expiry_date);

-- RLS (yangi jadvallar uchun) — backend to'g'ridan-to'g'ri ulanadi, lekin izchillik uchun
do $$
declare t text;
begin
  foreach t in array array['inventory_movements','product_recipes','productions','batches'] loop
    execute format('alter table %I enable row level security;', t);
    begin
      execute format('create policy "authenticated_all" on %I for all to authenticated using (true) with check (true);', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- ============================================================
--  TEKSHIRISH so'rovlari (ixtiyoriy)
-- ============================================================
-- select * from cash_balance;
-- select * from low_stock_products;
-- select * from customer_balances where debt > 0;
-- select * from inventory_movements order by occurred_at desc limit 50;
-- select * from batches where expiry_date <= current_date + 30 and is_active;
