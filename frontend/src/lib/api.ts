const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";
const TOKEN_KEY = "picasso_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as any) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = "Xatolik yuz berdi";
    try { const e = await res.json(); msg = e.detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};

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
export const fmtShort = (n: number) => {
  const r = Math.round(n);
  if (r >= 1_000_000) return (r / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (r >= 1000) return Math.round(r / 1000) + "K";
  return String(r);
};
