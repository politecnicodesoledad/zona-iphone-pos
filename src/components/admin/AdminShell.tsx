import { useState, useEffect } from "react";
import { BarChart3, ShoppingBag, Wallet, Package, Users, Settings, LogOut } from "lucide-react";
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
  const [clock, setClock] = useState("");
  useEffect(() => {
    const t = () => setClock(new Date().toLocaleString("es-CO", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }));
    t(); const i = setInterval(t, 30000); return () => clearInterval(i);
  }, []);

  const items: { id: Mod; icon: typeof BarChart3; label: string; badge?: string }[] = [
    { id: "ganancias", icon: BarChart3, label: "Ganancias" },
    { id: "venta", icon: ShoppingBag, label: "Nueva Venta", badge: fmtFactura(num) },
    { id: "finanzas", icon: Wallet, label: "Finanzas" },
    { id: "inventario", icon: Package, label: "Inventario" },
    { id: "clientes", icon: Users, label: "Clientes" },
    { id: "config", icon: Settings, label: "Configuración" },
  ];

  const TITLES: Record<Mod, string> = {
    ganancias: "Ganancias",
    venta: "Nueva Venta",
    finanzas: "Finanzas",
    inventario: "Inventario",
    clientes: "Clientes y Empleados",
    config: "Configuración",
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      {/* SIDEBAR */}
      <aside className="w-56 shrink-0 bg-[#0f0d0a] border-r border-[var(--gold)]/20 flex flex-col">
        <div className="p-4 border-b border-[var(--gold)]/10 flex items-center gap-2">
          <img src={cfg.logoUrl} alt="" className="w-9 h-9" />
          <div>
            <div className="font-display text-[var(--gold)] text-lg leading-tight">ADMIN</div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest">Zona iPhone</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {items.map(it => (
            <button key={it.id} onClick={() => setMod(it.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      mod === it.id ? "bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30" : "text-gray-400 hover:bg-white/5"
                    }`}>
              <it.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{it.label}</span>
              {it.badge && <span className="text-[10px] bg-[var(--gold)]/20 text-[var(--gold)] px-1.5 py-0.5 rounded">{it.badge}</span>}
            </button>
          ))}
        </nav>
        <button onClick={logout} className="m-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 flex items-center gap-2 border border-white/5">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-[#0f0d0a] border-b border-[var(--gold)]/10 px-5 flex items-center justify-between">
          <h1 className="font-display text-2xl text-[var(--gold)]">{TITLES[mod]}</h1>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> En vivo
            </span>
            <span className="text-xs text-gray-400">{clock}</span>
            <span className="text-xs bg-[var(--gold)]/10 text-[var(--gold)] px-2 py-1 rounded border border-[var(--gold)]/20">Factura: {fmtFactura(num)}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-5 scrollbar-thin">
          {mod === "ganancias" && <Ganancias />}
          {mod === "venta" && <NuevaVenta />}
          {mod === "finanzas" && <Finanzas />}
          {mod === "inventario" && <Inventario />}
          {mod === "clientes" && <ClientesEmpleados />}
          {mod === "config" && <Configuracion />}
        </main>
      </div>
    </div>
  );
}
