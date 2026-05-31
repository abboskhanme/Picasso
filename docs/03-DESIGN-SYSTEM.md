# Picasso — Design System

> Mavjud HTML prototipdan ajratib olingan dizayn tizimi. Maqsad: bir xil, professional, telefon va kompyuterda chiroyli ko'rinadigan interfeys. Bu hujjat to'g'ridan-to'g'ri Tailwind config va komponentlarga ko'chiriladi.

---

## 1. Brend xarakteri

Picasso — shokolad brendi. Dizayn iliq, "shirin", ozuqaviy, ishonchli bo'lishi kerak. Asosiy his: **issiq shokolad ranglari + toza krem foni**. Interaktiv, "qo'lga yoqadigan" (yumshoq burchaklar, yengil soyalar, mayda animatsiyalar).

---

## 2. Rang palitrasi (design token'lar)

Mavjud `:root` o'zgaruvchilaridan olingan. Bularni o'zgartirmang — butun ilova shularga tayanadi.

### Asosiy (brend)
| Token | HEX | Vazifa |
|-------|-----|--------|
| `chocolate-900` (`--ch`) | `#3d1e0c` | Eng to'q shokolad — sarlavhalar, asosiy matn urg'usi |
| `chocolate-700` (`--ch2`)| `#6b3318` | To'q shokolad — tugmalar, aktiv holat |
| `caramel` (`--cara`)     | `#c47820` | Karamel — narx, urg'u, ikkilamchi |
| `gold` (`--gold`)        | `#e8a020` | Oltin — statistika qiymatlari (to'q fonda) |

### Fon va yuza
| Token | HEX | Vazifa |
|-------|-----|--------|
| `cream` (`--cream`)| `#fff9f2` | Sahifa foni |
| `card` (`--card`)  | `#fffcf8` | Karta foni |
| `border` (`--bdr`) | `#f0d4b8` | Chegaralar |

### Matn
| Token | HEX | Vazifa |
|-------|-----|--------|
| `text` (`--txt`)  | `#2a1508` | Asosiy matn |
| `muted` (`--mut`) | `#8a6040` | Ikkilamchi/kulrang matn |

### Holat (status) ranglari
| Token | HEX | Vazifa |
|-------|-----|--------|
| `ok` (`--ok`) | `#267a50` | Muvaffaqiyat, kirim, "yetarli" |
| `danger` (`--no`)| `#b83020` | Xatolik, chiqim, "tamom" |
| Sariq ogohlantirish | `#7a5800` / fon `#fff3cd` | "Kam qoldi" |

### Pastel kartochka gradientlari (statistika)
| Klass | Gradient | Ishlatish |
|-------|----------|-----------|
| `.sc.g` (yashil) | `#d6f5ea → #b4ead4` | Ijobiy ko'rsatkich (sotuv, balans) |
| `.sc.o` (sariq)  | `#fde8ca → #f8d090` | Naqd, kirim |
| `.sc.p` (pushti) | `#fde0dc → #f8c0b8` | Xarajat |
| `.sc.v` (siyohrang)| `#ebe3f8 → #d4c4f0` | Operatsiyalar, set |
| `.sc.b` (ko'k)   | `#ddeeff → #b8d8f8` | Nasiya |

### Header gradient
`linear-gradient(135deg, #3d1e0c 0%, #6b3318 55%, #c47820 100%)` — yuqori panel.

---

## 3. Tipografika

| Element | Shrift | O'lcham | Og'irlik |
|---------|--------|---------|----------|
| Logo / dekorativ | **Pacifico** (cursive) | 17–21px | normal |
| Hamma matn | **Nunito** | — | 400/600/700/800/900 |
| Sahifa sarlavha (`.sec`) | Nunito | 16px | 900 |
| Statistika qiymat | Nunito | 13–19px | 900 |
| Asosiy matn | Nunito | 14px | 400–700 |
| Mayda izoh / label | Nunito | 9–12px | 700–800 |

Asosiy `font-size: 14px`. Nunito 900 (qora) — raqamlar va sarlavhalar uchun ko'p ishlatiladi, bu brendning "qalin, ishonchli" hisini beradi.

Ulanish:
```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Pacifico&display=swap" rel="stylesheet">
```

---

## 4. O'lcham, radius, soya

| Token | Qiymat | Ishlatish |
|-------|--------|-----------|
| Radius — karta | `18px` | `.card` |
| Radius — kichik karta | `16px` | statistika |
| Radius — tugma | `13px` | `.btn` |
| Radius — input | `13px` | `.fi` |
| Radius — badge | `20px` | `.badge` |
| Radius — modal | `26px 26px 0 0` | pastdan chiquvchi modal |
| Soya — karta | `0 2px 10px rgba(61,30,12,0.10)` | yumshoq |
| Soya — tugma (primary) | `0 3px 10px rgba(107,51,24,0.28)` | |
| Bo'shliq (gap) | 6–12px | grid va flex |
| Ichki padding — karta | `14px` | |

**Qoida:** hamma narsa yumshoq burchakli (radius ≥ 13px). O'tkir burchak yo'q.

---

## 5. Komponentlar (spec)

### Tugma (Button)
- **Variantlar:** `primary` (shokolad gradient), `secondary` (krem + chegara), `ok` (yashil), `danger` (qizil).
- **O'lchamlar:** standart (`11px 18px`), `sm` (`7px 13px`), `full-width`.
- **Holatlar:** `:active` da `scale(0.95)` — bosilganda "cho'kadi".
- Matn: Nunito 800, 13px, ikona + matn (gap 7px).

### Karta (Card)
- Fon `card`, chegara `1.5px border`, radius 18px, soya yumshoq, padding 14px.
- Holat chegarasi: tamom bo'lsa qizil, kam bo'lsa sariq chegara.

### Statistika kartasi (StatCard)
- Grid 2 ustun (telefonда), gradient fon (yuqoridagi `.sc` ranglari).
- Katta qiymat (900, 15px) + kichik label (700, 10px).

### Input / Select / Label
- Input: fon oq, chegara `1.5px`, radius 13px, focus'da chegara karamel + fon `#fffaf3`.
- Label: Nunito 800, 12px, shokolad rang.
- Hint: 10px, karamel rang (masalan "1000 ga ko'paytiriladi").

### Badge / Chip
- Kichik, dumaloq (radius 20px), rangli fon + mos matn. Variantlar: yashil (`bg`), qizil (`br`), sariq (`bo/bn`), ko'k (`bb`), siyohrang (`bv`).
- To'lov turlari: Naqd=yashil, Karta=ko'k, Nasiya=sariq.

### Modal (pastdan chiquvchi — bottom sheet)
- Pastdan yuqoriga sirpanib chiqadi (`slideUp 0.26s`).
- Yuqori burchaklar dumaloq (26px), maks balandlik 88vh, scroll bor.
- Yopish: X tugma (o'ng yuqorida) yoki fonga bosish.
- **Telefonда** bu ideal. **Kompyuterда** markazda, kengligi cheklangan (maks 480px) dialog sifatida ko'rsating.

### Toast (xabarnoma)
- Pastda markazda, shokolad fon, krem matn, 2.4s ko'rinadi, yumshoq paydo bo'ladi.

### Bottom Navigation
- 5 bo'lim: Bosh sahifa, Sotuv, Ombor, Nasiya, Moliya.
- Aktiv: ikona foni shokolad, label qalin shokolad rang, yengil scale.
- Pastга fikslangan, `safe-area-inset` hisobga olingan (iPhone uchun).

### Progress bar (haftalik sotuv)
- Gorizontal bar, shokolad→karamel gradient, qiymat o'ngда.

### Empty state
- Markazda katta emoji + qisqa matn ("Hali sotuv yo'q"). Har bo'sh ro'yxatда bo'lishi shart.

---

## 6. Responsive qoidalar (eng muhim qism)

Mavjud prototip faqat telefon uchun. Yangi ilova **ikkalasida** chiroyli bo'lishi kerak:

### Breakpoint'lar (Tailwind)
| Nom | Kenglik | Maqsad |
|-----|---------|--------|
| (default) | < 640px | Telefon |
| `sm` | ≥ 640px | Katta telefon |
| `md` | ≥ 768px | Planshet |
| `lg` | ≥ 1024px | Kompyuter |

### Telefon (mobil) — asosiy
- Bitta ustun, pastда navigatsiya (bottom nav).
- Statistika: 2 ustun grid.
- Modal: pastdan chiquvchi (bottom sheet).

### Kompyuter (`lg` va undan katta)
- **Bottom nav o'rniga chap tomonда sidebar** (vertikal menyu).
- Kontent markazда, maks kenglik ~1100px.
- Statistika: 4 ustun grid.
- Ro'yxatlar: jadval (table) ko'rinishida ham bo'lishi mumkin.
- Modal: markazda dialog (bottom sheet emas).
- Hover holatlari qo'shiladi (telefonда yo'q edi).

### Qoidalar
- Touch target ≥ 44×44px (barmoq uchun).
- `overflow-x: hidden` — gorizontal scroll bo'lmasin.
- Matn hech qachon 14px'dan kichik bo'lmasin asosiy joyда (mayda label'lar bundan mustasno).
- Rasm/ikona `flex-shrink: 0` — siqilib ketmasin.

---

## 7. Tailwind config'ga ko'chirish

`tailwind.config.ts` ichida `theme.extend`:

```ts
export default {
  theme: {
    extend: {
      colors: {
        chocolate: { 900:'#3d1e0c', 700:'#6b3318' },
        caramel: '#c47820',
        gold: '#e8a020',
        cream: '#fff9f2',
        card: '#fffcf8',
        brdr: '#f0d4b8',
        ink: '#2a1508',
        muted: '#8a6040',
        ok: '#267a50',
        danger: '#b83020',
      },
      fontFamily: {
        sans: ['Nunito','sans-serif'],
        brand: ['Pacifico','cursive'],
      },
      borderRadius: { card:'18px', btn:'13px' },
      boxShadow: {
        card: '0 2px 10px rgba(61,30,12,0.10)',
        btn:  '0 3px 10px rgba(107,51,24,0.28)',
      },
    },
  },
}
```

> shadcn/ui komponentlarini o'rnatib, yuqoridagi token'lar bilan ranglang. Shunda Button, Dialog, Input, Badge tayyor va bir xil bo'ladi.

---

## 8. Ikonografiya

Hozir emoji ishlatilgan (🍫🎁📦💰) — bu brendга yoqimli, qoldiring. Lekin tizim ikonalari (tahrirlash, o'chirish, strelka) uchun **lucide-react** kutubxonasini ishlating — toza va izchil. Emoji = mahsulot/bo'lim belgisi; lucide = harakat tugmalari.

---

## 9. Tekshiruv ro'yxati (har ekran uchun)

- [ ] Telefon (375px) va kompyuter (1280px)да sinab ko'rilганmi?
- [ ] Bo'sh holat (empty state) bormi?
- [ ] Loading (yuklanish) holati bormi?
- [ ] Xatolik holati ko'rsatiladimi?
- [ ] Tugmalar bosilganда fikr (toast/animatsiya) beradimi?
- [ ] Rang kontrasti yetarlimi (matn o'qilarli)?
- [ ] Barcha matn o'zbekchami va izchilmi?
