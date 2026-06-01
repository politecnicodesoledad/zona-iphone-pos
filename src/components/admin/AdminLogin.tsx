import { useState } from "react";
import { useSession, useConfig } from "@/lib/zi/store";
import { Settings } from "lucide-react";

export function AdminLogin() {
  const { login } = useSession();
  const [cfg] = useConfig();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1A1814] via-[#2C2520] to-[#1A1814]">
      <div className="w-full max-w-sm bg-[#0f0d0a] border border-[var(--gold)]/30 rounded-2xl p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)] text-xs">
          <Settings className="w-3 h-3" /> Panel Administrativo
        </div>
        <img src={cfg.logoUrl} alt="" className="w-16 h-16 mt-4" />
        <h1 className="font-display text-4xl text-white mt-2">{cfg.storeName}</h1>
        <p className="text-sm text-gray-400 mt-1">Ingresa tu contraseña para continuar</p>
        <form onSubmit={(e) => { e.preventDefault(); if (!login(pw)) setErr("Contraseña incorrecta"); }} className="mt-6 space-y-3">
          <input
            type="password" value={pw} autoFocus
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            placeholder="Contraseña"
            className="w-full px-4 py-3 bg-black/50 border border-[var(--gold)]/30 rounded-lg text-white placeholder:text-gray-600 focus:border-[var(--gold)] outline-none"
          />
          {err && <div className="text-red-500 text-sm">{err}</div>}
          <button type="submit" className="w-full py-3 rounded-lg bg-gradient-to-br from-[var(--gold-light)] via-[var(--gold)] to-[var(--gold-dark)] text-black font-extrabold uppercase tracking-wider text-sm">
            Entrar
          </button>
        </form>
        <p className="text-[10px] text-gray-600 mt-4 text-center">Por defecto: admin123</p>
      </div>
    </div>
  );
}
