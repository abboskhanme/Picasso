import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserRound, KeyRound, ShieldCheck } from "lucide-react";
import { me, updateProfile, changePassword, isOwner, type Me } from "@/lib/api";
import { Card, PageHeader, Field, Input, Button, ErrorBox, Spinner, ImagePicker, Badge } from "@/components/ui";
import { toast } from "@/components/ui/toast";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ["me"], queryFn: me, staleTime: Infinity });

  if (isLoading) return <Spinner />;
  return (
    <div className="max-w-2xl">
      <PageHeader title="Sozlamalar" subtitle="Profil ma'lumotlari va xavfsizlik" />
      {user && <ProfileCard user={user} onSaved={() => qc.invalidateQueries({ queryKey: ["me"] })} />}
      <PasswordCard />
    </div>
  );
}

/* ---------- Profil: rasm, ism, login (email) ---------- */
function ProfileCard({ user, onSaved }: { user: Me; onSaved: () => void }) {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState<string | null>(user.avatar_url);

  // Tashqaridan yangilansa (qayta yuklash) — maydonlarni sinxronlash
  useEffect(() => {
    setFullName(user.full_name ?? ""); setEmail(user.email); setAvatar(user.avatar_url);
  }, [user]);

  const mut = useMutation({
    mutationFn: () => updateProfile({ full_name: fullName || null, email, avatar_url: avatar }),
    onSuccess: () => { onSaved(); toast("Profil saqlandi"); },
  });

  const changed = fullName !== (user.full_name ?? "") || email !== user.email || avatar !== user.avatar_url;

  return (
    <Card className="mb-4">
      <div className="flex items-center gap-2 mb-4">
        <UserRound size={17} className="text-brand-600" />
        <h2 className="text-[14px] font-bold text-ink">Profil</h2>
        <Badge tone={isOwner(user.role) ? "n" : "neutral"} className="ml-auto">
          {isOwner(user.role) ? (<><ShieldCheck size={11} /> Egasi</>) : "Sotuvchi"}
        </Badge>
      </div>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="flex items-center gap-4 mb-4">
        <ImagePicker value={avatar} onChange={setAvatar} />
        <p className="text-[12.5px] text-muted">Profil rasmi (ixtiyoriy). JPG, PNG, WEBP yoki GIF, 5 MB gacha.</p>
      </div>
      <Field label="Ism familiya"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ismingiz" /></Field>
      <Field label="Login (email)" hint="Bu manzil orqali tizimga kirasiz">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
      </Field>
      <Button onClick={() => mut.mutate()} disabled={!changed || !email || mut.isPending}>
        {mut.isPending ? "Saqlanmoqda…" : "Saqlash"}
      </Button>
    </Card>
  );
}

/* ---------- Parolni o'zgartirish ---------- */
function PasswordCard() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  const mut = useMutation({
    mutationFn: () => changePassword({ current_password: cur, new_password: next }),
    onSuccess: () => { setCur(""); setNext(""); setConfirm(""); setErr(""); toast("Parol yangilandi"); },
    onError: (e) => setErr((e as Error).message),
  });

  const submit = () => {
    setErr("");
    if (next.length < 8) return setErr("Yangi parol kamida 8 belgi bo'lsin");
    if (next !== confirm) return setErr("Yangi parol va tasdiq mos emas");
    mut.mutate();
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={17} className="text-brand-600" />
        <h2 className="text-[14px] font-bold text-ink">Parolni o'zgartirish</h2>
      </div>
      <ErrorBox message={err || undefined} />
      <Field label="Joriy parol"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
      <Field label="Yangi parol" hint="Kamida 8 belgi"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
      <Field label="Yangi parolni tasdiqlang"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
      <Button onClick={submit} disabled={!cur || !next || !confirm || mut.isPending}>
        {mut.isPending ? "Saqlanmoqda…" : "Parolni yangilash"}
      </Button>
    </Card>
  );
}
