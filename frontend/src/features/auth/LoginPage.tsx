import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { login } from "@/lib/api";
import { Button, Field, Input, ErrorBox } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try { await login(email, password); nav("/"); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white font-bold text-xl flex items-center justify-center mb-3 shadow-card">P</div>
          <h1 className="text-[20px] font-bold text-ink tracking-[-0.01em]">Picasso ERP</h1>
          <p className="text-[13px] text-muted mt-1">Shokolad biznesi boshqaruv tizimi</p>
        </div>

        <form onSubmit={submit} className="bg-card rounded-card border border-border shadow-card p-6">
          <ErrorBox message={err} />
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" placeholder="email@picasso.uz" />
          </Field>
          <Field label="Parol">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="••••••••" />
          </Field>
          <Button variant="p" className="w-full mt-1" type="submit" disabled={loading}>
            <LogIn size={16} /> {loading ? "Kirilmoqda…" : "Kirish"}
          </Button>
        </form>
      </div>
    </div>
  );
}
