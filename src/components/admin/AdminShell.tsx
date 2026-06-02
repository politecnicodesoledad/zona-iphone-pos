import { useState, useEffect } from "react";
import { BarChart3, ShoppingBag, Wallet, Package, Users, Settings, LogOut, Menu, X } from "lucide-react";
import { useSession, useConfig, useFacturaNum } from "@/lib/zi/store";
import { fmtFactura } from "@/lib/zi/store";
import { Ganancias } from "./Ganancias";
import { NuevaVenta } from "./NuevaVenta";
import { Finanzas } from "./Finanzas";
import { Inventario } from "./Inventario";
import { ClientesEmpleados } from "./ClientesEmpleados";
import { Configuracion } from "./Configuracion";

type Mod = "ganancias" | "venta" | "finanzas" | "inventario" | "clientes" | "config";

export function AdminShell() {
  const { logout } = useSession();
  const [cfg] = useConfig();
  const [num] = useFacturaNum();
  const [mod, setMod] = useState<Mod>("ganancias");
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const t = () => setClock(new Date().toLocaleString("es-CO", {
      weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }));
    t(); const i = setInterval(t, 30000); return () => clearInterval(i);
  }, []);

  const items: { id: Mod; icon: typeof BarChart3; label: string; badge?: string }[] = [
    { id: "ganancias", icon: BarChart3, label: "Ganancias" },
    { id: "venta", icon: ShoppingBag, label: "Nueva venta", badge: fmtFactura(num) },
    { id: "finanzas", icon: Wallet, label: "Finanzas" },
    { id: "inventario", icon: Package, label: "Inventario" },
    { id: "clientes", icon: Users, label: "Clientes" },
    { id: "config", icon: Settings, label: "Configuración" },
  ];

  const TITLES: Record<Mod, string> = {
    ganancias: "Resumen de ganancias",
    venta: "Registrar nueva venta",
    finanzas: "Finanzas y movimientos",
    inventario: "Inventario",
    clientes: "Clientes y empleados",
    config: "Configuración",
  };

  const Sidebar = (
    <aside className="w-64 shrink-0 bg-white border-r border-[var(--line)] flex flex-col">
      <div className="px-5 py-5 border-b border-[var(--line)] flex items-center gap-3">
        <img src={cfg.logoUrl} alt="" className="w-11 h-11 rounded-xl bg-[var(--cream)] p-1 border border-[var(--line)]" />
        <div className="leading-tight">
          <div className="font-display text-xl text-[var(--ink)]">{cfg.storeName}</div>
          <div className="text-[9px] text-[var(--gold-dark)] font-bold tracking-[0.2em] uppercase">Panel admin</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(it => {
          const active = mod === it.id;
          return (
            <button key={it.id} onClick={() => { setMod(it.id); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition group ${
                      active
                        ? "bg-[var(--ink)] text-white shadow-md"
                        : "text-gray-600 hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                    }`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-[var(--gold)] text-[var(--ink)]" : "bg-[var(--mist)] text-gray-500 group-hover:bg-white group-hover:text-[var(--gold-dark)]"}`}>
                <it.icon className="w-4 h-4" />
              </span>
              <span className="flex-1 text-left">{it.label}</span>
              {it.badge && <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${active ? "bg-white/15 text-white" : "bg-[var(--cream)] text-[var(--gold-dark)]"}`}>{it.badge}</span>}
            </button>
          );
        })}
      </nav>
      <button onClick={logout} className="m-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 border border-[var(--line)] transition">
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </button>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[var(--mist)] text-[var(--ink)]">
      <div className="hidden md:flex">{Sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full flex animate-fade-up">{Sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[var(--ink)] text-white border-b border-black/40 px-5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setOpen(true)} className="md:hidden w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><Menu className="w-5 h-5" /></button>
            <h1 className="font-display text-2xl text-white truncate">{TITLES[mod]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-900/40 border border-emerald-500/30 px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En vivo
            </span>
            <span className="hidden md:inline text-xs text-gray-300 font-medium">{clock}</span>
            <span className="text-[11px] bg-[var(--gold)] text-[var(--ink)] px-2.5 py-1 rounded-full font-bold shadow">Factura · {fmtFactura(num)}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-5 md:p-7 scrollbar-thin">
          <div className="max-w-[1400px] mx-auto animate-fade-up">
            {mod === "ganancias" && <Ganancias />}
            {mod === "venta" && <NuevaVenta />}
            {mod === "finanzas" && <Finanzas />}
            {mod === "inventario" && <Inventario />}
            {mod === "clientes" && <ClientesEmpleados />}
            {mod === "config" && <Configuracion />}
          </div>
        </main>
      </div>
    </div>
  );
}
