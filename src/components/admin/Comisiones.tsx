import { useState, useMemo, useEffect, useCallback } from "react";
import { useVentas } from "@/lib/zi/store";
import { fmtCOP } from "@/lib/zi/format";
import { ziSupabase } from "@/integrations/supabase/zi-client";
import { Card, Btn, Select, Field } from "./ui";
import { Lock, Unlock, Loader2 } from "lucide-react";
import type { Perfil } from "@/lib/zi/store";

type CierreRow = {
  id: string; asesor_id: string; periodo: string;
  ganancia_neta: number; porcentaje: number; comision: number;
  estado: "en_curso" | "cerrado" | "pagado"; cerrado_en: string | null;
};

function mesActualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function labelMes(periodo: string) {
  const [y, m] = periodo.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

export function Comisiones() {
  const [ventas] = useVentas();
  const [periodo, setPeriodo] = useState(mesActualISO());
  const [asesores, setAsesores] = useState<Perfil[]>([]);
  const [cierres, setCierres] = useState<Record<string, CierreRow>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pctDraft, setPctDraft] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: perfiles } = await ziSupabase.from("zi_perfiles").select("*").eq("rol", "asesor").order("nombre");
    const list = (perfiles as Perfil[]) ?? [];
    setAsesores(list);
    setPctDraft(Object.fromEntries(list.map(p => [p.id, p.comision_pct ?? 0])));
    const { data: cierresData } = await ziSupabase.from("zi_comisiones").select("*").eq("periodo", periodo);
    const map: Record<string, CierreRow> = {};
    (cierresData as CierreRow[] ?? []).forEach(c => { map[c.asesor_id] = c; });
    setCierres(map);
    setLoading(false);
  }, [periodo]);

  useEffect(() => { load(); }, [load]);

  // Ganancia neta generada por cada asesor en el período: (total de la venta,
  // ya con descuentos aplicados) − costo de los productos vendidos.
  // Es la MISMA fórmula que usa el módulo de Ganancias, solo que agrupada
  // por asesor y acotada al mes — así el número nunca se contradice.
  const gananciaPorAsesor = useMemo(() => {
    const [y, m] = periodo.split("-").map(Number);
    const start = new Date(y, m - 1, 1).getTime();
    const end = new Date(y, m, 1).getTime();
    const map = new Map<string, { ventas: number; total: number; ganancia: number }>();
    ventas.filter(v => !v.cancelada && v.asesorId && v.fecha >= start && v.fecha < end).forEach(v => {
      const costo = v.productos.reduce((s, p) => s + (p.costo || 0) * p.cantidad, 0);
      const cur = map.get(v.asesorId!) || { ventas: 0, total: 0, ganancia: 0 };
      cur.ventas++; cur.total += v.total; cur.ganancia += v.total - costo;
      map.set(v.asesorId!, cur);
    });
    return map;
  }, [ventas, periodo]);

  async function guardarPct(asesorId: string) {
    const pct = pctDraft[asesorId] ?? 0;
    await ziSupabase.from("zi_perfiles").update({ comision_pct: pct }).eq("id", asesorId);
    load();
  }

  async function cerrarMes(asesorId: string) {
    const g = gananciaPorAsesor.get(asesorId) || { ventas: 0, total: 0, ganancia: 0 };
    const pct = pctDraft[asesorId] ?? 0;
    const comision = Math.round(g.ganancia * (pct / 100));
    if (!confirm(`Cerrar ${labelMes(periodo)} con ganancia neta ${fmtCOP(g.ganancia)} y comisión ${fmtCOP(comision)}? Una vez cerrado, este resultado queda fijo aunque cambien ventas de meses anteriores.`)) return;
    setBusyId(asesorId);
    await ziSupabase.from("zi_comisiones").upsert({
      id: `${asesorId}-${periodo}`, asesor_id: asesorId, periodo,
      ganancia_neta: g.ganancia, porcentaje: pct, comision,
      estado: "cerrado", cerrado_en: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    setBusyId(null);
    load();
  }

  async function reabrirMes(asesorId: string) {
    if (!confirm("¿Reabrir este mes para recalcular? El resultado dejará de estar fijo hasta que lo vuelvas a cerrar.")) return;
    setBusyId(asesorId);
    await ziSupabase.from("zi_comisiones").update({ estado: "en_curso" }).eq("id", `${asesorId}-${periodo}`);
    setBusyId(null);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-[var(--ink)]">Comisiones de asesores</h2>
          <p className="text-sm text-gray-500">Comisión = % configurado × ganancia neta generada por el asesor (nunca sobre ventas totales).</p>
        </div>
        <Field label="Mes"><input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
          className="px-3 py-2 border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--gold)]" /></Field>
      </div>

      {loading ? (
        <Card className="text-center text-gray-400 py-8 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</Card>
      ) : asesores.length === 0 ? (
        <Card className="text-center text-gray-400 py-8">Aún no hay asesores creados. Ve a "Usuarios" para crear el primero.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {asesores.map(a => {
            const g = gananciaPorAsesor.get(a.id) || { ventas: 0, total: 0, ganancia: 0 };
            const cierre = cierres[a.id];
            const pct = pctDraft[a.id] ?? 0;
            const cerrado = cierre?.estado === "cerrado" || cierre?.estado === "pagado";
            const gananciaMostrada = cerrado ? cierre.ganancia_neta : g.ganancia;
            const pctMostrado = cerrado ? cierre.porcentaje : pct;
            const comisionMostrada = cerrado ? cierre.comision : Math.round(g.ganancia * (pct / 100));
            return (
              <Card key={a.id} className={cerrado ? "border-emerald-300 bg-emerald-50/40" : ""}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-[var(--ink)]">{a.nombre} {a.apellido}</div>
                    <div className="text-xs text-gray-500">{labelMes(periodo)} · {g.ventas} ventas</div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${cerrado ? "bg-emerald-200 text-emerald-800" : "bg-amber-100 text-amber-700"}`}>
                    {cerrado ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />} {cerrado ? "Cerrado" : "En curso"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div><div className="text-gray-400 text-xs">Ventas totales</div><div className="font-semibold">{fmtCOP(g.total)}</div></div>
                  <div><div className="text-gray-400 text-xs">Ganancia neta</div><div className="font-semibold text-[var(--gold-dark)]">{fmtCOP(gananciaMostrada)}</div></div>
                </div>

                <div className="flex items-end gap-2 mt-3">
                  <Field label="% comisión">
                    <input type="number" min={0} max={100} step={0.5} disabled={cerrado} value={pctMostrado}
                      onChange={e => setPctDraft(prev => ({ ...prev, [a.id]: +e.target.value || 0 }))}
                      className="w-24 px-3 py-2 border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--gold)] disabled:bg-gray-100" />
                  </Field>
                  {!cerrado && <Btn variant="ghost" onClick={() => guardarPct(a.id)} className="!py-2 text-xs">Guardar %</Btn>}
                  <div className="ml-auto text-right">
                    <div className="text-gray-400 text-xs">Comisión extra</div>
                    <div className="font-display text-2xl text-[var(--gold)]">{fmtCOP(comisionMostrada)}</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[var(--line)]">
                  {cerrado ? (
                    <Btn variant="ghost" disabled={busyId === a.id} onClick={() => reabrirMes(a.id)} className="w-full text-xs">
                      {busyId === a.id ? "..." : "Reabrir mes"}
                    </Btn>
                  ) : (
                    <Btn variant="ink" disabled={busyId === a.id} onClick={() => cerrarMes(a.id)} className="w-full text-xs">
                      {busyId === a.id ? "Cerrando..." : "Cerrar mes y fijar comisión"}
                    </Btn>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
