import { useState } from "react";
import { useSession, useConfig } from "@/lib/zi/store";
import { Lock, ShieldCheck } from "lucide-react";

export function AdminLogin() {
  const { login } = useSession();
  const [cfg] = useConfig();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
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
        <form onSubmit={(e) => { e.preventDefault(); if (!login(pw)) setErr("Contraseña incorrecta"); }} className="mt-7 space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold">Contraseña</span>
            <div className="mt-1.5 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password" value={pw} autoFocus
                onChange={(e) => { setPw(e.target.value); setErr(""); }}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--line)] rounded-xl text-[var(--ink)] placeholder:text-gray-400 focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none"
              />
            </div>
          </label>
          {err && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
          <button type="submit" className="zi-btn-gold w-full text-sm">Entrar</button>
        </form>
        <p className="text-[10px] text-gray-400 mt-5 text-center">Contraseña por defecto: <b className="text-gray-600">admin123</b></p>
      </div>
    </div>
  );
}
