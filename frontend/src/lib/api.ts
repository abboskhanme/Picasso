const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";
const TOKEN_KEY = "picasso_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/** Token eskirgan/yaroqsiz (401) bo'lsa — tokenni tozalab login sahifasiga qaytaramiz. */
function handleUnauthorized() {
  clearToken();
  if (!location.pathname.startsWith("/login")) location.href = "/login";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as any) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) { handleUnauthorized(); throw new Error("Sessiya tugadi, qaytadan kiring"); }
  if (!res.ok) {
    let msg = "Xatolik yuz berdi";
    try { const e = await res.json(); msg = e.detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

/** Nisbiy rasm yo'lini (/uploads/...) to'liq manzilga aylantiradi. */
export const imgSrc = (p?: string | null): string | undefined =>
  p ? (/^https?:\/\//.test(p) ? p : `${BASE}${p}`) : undefined;

/** Rasm faylini serverga yuklaydi, {url} qaytaradi (mahsulot/to'plam rasmi uchun). */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/uploads/image`, { method: "POST", body: fd, headers });
  if (!res.ok) {
    let msg = "Rasm yuklashda xatolik";
    try { const e = await res.json(); msg = e.detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(p: string, body?: unknown) => request<T>(p, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};

export interface Me { id: string; email: string; full_name: string | null; avatar_url: string | null; role: string; }
/** Joriy foydalanuvchi (rol bilan) — rol asosida UI'ni cheklash uchun. */
export const me = () => api.get<Me>("/auth/me");
export const isOwner = (role?: string) => role === "owner" || role === "admin";

/** Profilni yangilash (ism, login, rasm). */
export const updateProfile = (body: { full_name?: string | null; email?: string; avatar_url?: string | null }) =>
  api.patch<Me>("/auth/me", body);
/** Parolni o'zgartirish (joriy parol talab qilinadi). */
export const changePassword = (body: { current_password: string; new_password: string }) =>
  api.post<{ ok: boolean }>("/auth/me/password", body);

export async function login(email: string, password: string) {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);
  const res = await fetch(`${BASE}/auth/login`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Email yoki parol noto'g'ri");
  const data = await res.json();
  setToken(data.access_token);
  return data;
}

export const fmt = (n: number) => Math.round(n).toLocaleString("uz-UZ") + " so'm";

/* ---------- telefon: O'rta Osiyo davlatlari ---------- */
export type PhoneCountry = {
  code: string;     // ISO-2 (kalit)
  flag: string;     // bayroq emoji
  name: string;     // ko'rsatiladigan nom
  dial: string;     // xalqaro kod, masalan "998"
  len: number;      // milliy raqamdagi raqamlar soni
  groups: number[]; // guruhlash shabloni, masalan [2,3,2,2]
  example: string;  // placeholder namunasi
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "UZ", flag: "🇺🇿", name: "O'zbekiston",  dial: "998", len: 9,  groups: [2, 3, 2, 2], example: "90 123 45 67" },
  { code: "KZ", flag: "🇰🇿", name: "Qozog'iston",  dial: "7",   len: 10, groups: [3, 3, 2, 2], example: "701 234 56 78" },
  { code: "KG", flag: "🇰🇬", name: "Qirg'iziston", dial: "996", len: 9,  groups: [3, 3, 3],    example: "700 123 456" },
  { code: "TJ", flag: "🇹🇯", name: "Tojikiston",   dial: "992", len: 9,  groups: [2, 3, 4],    example: "90 123 4567" },
  { code: "TM", flag: "🇹🇲", name: "Turkmaniston", dial: "993", len: 8,  groups: [2, 2, 2, 2], example: "65 12 34 56" },
  // Abxaziya Rossiya raqamlash rejasidan foydalanadi: +7 940 XXX-XX-XX (mobil)
  { code: "AB", flag: "🏴", name: "Abxaziya",     dial: "7940", len: 7, groups: [3, 2, 2],    example: "123 45 67" },
];

// uzun kodlar avval tekshirilsin (masalan "998" — "7" dan oldin)
const PHONE_BY_DIAL = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

/** Faqat raqamlardan iborat E.164 raqamdan mos davlatni topadi (dial + milliy uzunlik to'g'ri kelsa). */
export const phoneCountry = (digits: string): PhoneCountry | undefined =>
  PHONE_BY_DIAL.find((c) => digits.startsWith(c.dial) && digits.length === c.dial.length + c.len);

/** Milliy raqamni davlat shabloni bo'yicha guruhlaydi: "976662675" → "97 666 26 75". */
export const groupNational = (d: string, groups: number[]): string => {
  const out: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (i >= d.length) break;
    out.push(d.slice(i, i + g));
    i += g;
  }
  if (i < d.length) out.push(d.slice(i)); // ortib qolgan raqamlar
  return out.join(" ");
};

/** Telefon raqamni chiroyli ko'rinishga keltiradi: +998 97 666 26 75, +7 701 234 56 78, … */
export const fmtPhone = (p?: string | null): string => {
  if (!p) return "—";
  const digits = p.replace(/\D/g, "");
  const c = phoneCountry(digits);
  if (!c) return p;
  return `+${c.dial} ${groupNational(digits.slice(c.dial.length), c.groups)}`;
};
export const fmtShort = (n: number) => {
  const r = Math.round(n);
  if (r >= 1_000_000) return (r / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (r >= 1000) return Math.round(r / 1000) + "K";
  return String(r);
};
