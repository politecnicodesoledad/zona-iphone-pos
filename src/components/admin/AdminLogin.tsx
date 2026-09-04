import { useState } from "react";
import { useSession, useConfig } from "@/lib/zi/store";
import { Lock, Mail, ShieldCheck } from "lucide-react";

export function AdminLogin() {
  const { login } = useSession();
  const [cfg] = useConfig();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await login(email.trim(), pw);
      if (!res.ok) setErr(res.error);
    } catch (e2) {
      // login() ya no debería lanzar excepciones, pero por si acaso: nunca
      // dejamos el botón atascado en "Entrando...".
      setErr("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--mist)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(201,168,76,0.12),transparent_50%),radial-gradient(circle_at_85%_90%,rgba(10,10,10,0.05),transparent_55%)] pointer-events-none" />
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-8 shadow-soft border border-[var(--line)]">
        <div className="flex items-center gap-2">
          <span className="zi-chip"><ShieldCheck className="w-3 h-3" /> Panel administrativo</span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <img src={cfg.logoUrl} alt="" className="w-14 h-14 rounded-xl border border-[var(--line)] bg-[var(--cream)] p-1" />
          <div>
            <h1 className="font-display text-3xl text-[var(--ink)] leading-none">{cfg.storeName}</h1>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--gold-dark)] mt-1 font-semibold">Acceso restringido</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold">Correo</span>
            <div className="mt-1.5 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email" value={email} autoFocus required
                onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                placeholder="tu@correo.com"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--line)] rounded-xl text-[var(--ink)] placeholder:text-gray-400 focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold">Contraseña / PIN</span>
            <div className="mt-1.5 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password" value={pw} required
                onChange={(e) => { setPw(e.target.value); setErr(""); }}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--line)] rounded-xl text-[var(--ink)] placeholder:text-gray-400 focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none"
              />
            </div>
          </label>
          {err && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
          <button type="submit" disabled={busy} className="zi-btn-gold w-full text-sm disabled:opacity-60">
            {busy ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
