# Picasso ERP — Serverga joylash (VPS + HTTPS)

Ubuntu VPS (DigitalOcean/Hetzner/Contabo/AWS va h.k.) ga Docker bilan joylash.
Frontend, backend, baza va Caddy (avtomatik HTTPS) bitta domen ostida ishlaydi.

Arxitektura:
- `https://DOMAIN/`         → frontend (React)
- `https://DOMAIN/api/...`  → backend (FastAPI)
- baza va backend portlari tashqariga ochilmaydi (faqat ichki tarmoq)

---

## 1. DNS sozlash
Domeningiz boshqaruv panelida **A-record** yarating:

    erp.example.com   →   SERVER_IP

Tarqalishini kuting (`ping erp.example.com` server IP'ni ko'rsatsa tayyor).

## 2. Serverni tayyorlash (Ubuntu)
SSH orqali kiring va Docker'ni o'rnating:

    sudo apt update && sudo apt -y upgrade
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    # qayta kiring (logout/login) yoki: newgrp docker

Firewallda 80 va 443 portlarni oching:

    sudo ufw allow OpenSSH
    sudo ufw allow 80,443/tcp
    sudo ufw --force enable

## 3. Loyihani serverga olib kelish
Git orqali (yoki `scp` bilan ko'chiring):

    git clone <SIZNING_REPO_URL> picasso
    cd picasso

## 4. Maxfiy sozlamalar (.env)
Namunadan nusxa oling va to'ldiring:

    cp .env.prod.example .env
    nano .env

Quyidagilarni o'zgartiring:
- `DOMAIN` — sizning domeningiz (masalan erp.example.com)
- `POSTGRES_PASSWORD` — kuchli parol:  `openssl rand -hex 16`
- `JWT_SECRET` — uzun tasodifiy satr:  `openssl rand -hex 32`

## 5. Ishga tushirish
Loyiha ildizida (docker-compose.prod.yml shu yerda):

    docker compose -f docker-compose.prod.yml --env-file .env up -d --build

Birinchi build 2-5 daqiqa olishi mumkin (npm install + vite build).
Caddy domeningizga avtomatik HTTPS sertifikat oladi (10-30 soniya).

Holatni tekshirish:

    docker compose -f docker-compose.prod.yml ps
    docker compose -f docker-compose.prod.yml logs -f caddy     # sertifikat logi

Brauzerda oching:  **https://erp.example.com**

Kirish (demo):  `admin@picasso.uz` / `admin123`

---

## 6. Xavfsizlik (birinchi kirishdan keyin) — MUHIM
Standart admin parolini almashtiring:

    docker compose -f docker-compose.prod.yml exec backend python -c "
    from app.database import SessionLocal
    from app import models
    from app.core.security import hash_password
    db = SessionLocal()
    u = db.query(models.User).filter_by(email='admin@picasso.uz').first()
    u.hashed_password = hash_password('YANGI_KUCHLI_PAROL')
    db.commit()
    print('Parol yangilandi')
    "

So'ng demo mahsulotlar/xomashyolar kerak bo'lmasa, ularni interfeysdan arxivlang,
`.env` da `SEED_ON_START=false` qiling va qayta ishga tushiring (8-bo'lim).

---

## 7. Yangilanish (kod o'zgargach)
Yangi kodni tortib oling va qayta build qiling:

    git pull
    docker compose -f docker-compose.prod.yml --env-file .env up -d --build

Ma'lumotlar bazasi (`pgdata` volume) saqlanib qoladi.

## 8. Foydali buyruqlar

    # Qayta ishga tushirish
    docker compose -f docker-compose.prod.yml --env-file .env restart

    # To'xtatish
    docker compose -f docker-compose.prod.yml down

    # Loglar
    docker compose -f docker-compose.prod.yml logs -f backend

    # Bazadan zaxira (backup)
    docker compose -f docker-compose.prod.yml exec db \
      pg_dump -U picasso picasso > backup_$(date +%F).sql

---

## Eslatmalar
- Caddy 80/443 portlardan foydalanadi — serverda boshqa veb-server (Apache/nginx)
  ishlamayotganiga ishonch hosil qiling.
- Frontend API manzili build paytida `https://DOMAIN/api` ga qotiriladi.
  Domen o'zgarsa, frontend qayta build qilinishi kerak (`--build`).
- Backend CORS hozir `*` — frontend va API bir domende bo'lgani uchun muammo yo'q.
  Istasangiz `backend/app/main.py` da domeningizga cheklashingiz mumkin.
