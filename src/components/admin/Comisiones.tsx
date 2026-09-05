import { useState, useMemo, useEffect, useCallback } from "react";
import { useVentas, useSession } from "@/lib/zi/store";
import { fmtCOP, fmtDate } from "@/lib/zi/format";
import { ziSupabase } from "@/integrations/supabase/zi-client";
import { Card, Btn, Field } from "./ui";
import { ChevronDown, ChevronUp, CheckCircle2, Loader2, History } from "lucide-react";
import type { Perfil } from "@/lib/zi/store";

type PagoRow = {
  id: string; asesor_id: string; fecha_inicio: string; fecha_fin: string;
  ganancia_neta: number; monto: number; pagado_en: string;
};

const FRECUENCIA_LABEL: Record<string, string> = { semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual" };

// ---- utilidades de fechas de calendario (sin horas) ----
function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function parseISO(s: string) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfDay(d: Date) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d: Date) { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }
function mondayOf(d: Date) { const r = new Date(d); const day = r.getDay(); const diff = day === 0 ? -6 : 1 - day; r.setDate(r.getDate() + diff); return startOfDay(r); }
function quincenaBounds(d: Date) {
  const y = d.getFullYear(), m = d.getMonth();
  if (d.getDate() <= 15) return { start: new Date(y, m, 1), end: new Date(y, m, 15) };
  return { start: new Date(y, m, 16), end: new Date(y, m + 1, 0) };
}
function monthBounds(d: Date) { const y = d.getFullYear(), m = d.getMonth(); return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) }; }
function currentPeriodStart(freq: string, today: Date) {
  if (freq === "semanal") return mondayOf(today);
  if (freq === "quincenal") return quincenaBounds(today).start;
  return monthBounds(today).start;
}
function periodEnd(freq: string, start: Date) {
  if (freq === "semanal") return addDays(start, 6);
  if (freq === "quincenal") return quincenaBounds(start).end;
  return monthBounds(start).end;
}
// Rango sugerido: el día siguiente al último pago hasta el fin de su período;
// si nunca se le ha pagado, el período actual completo según su frecuencia.
function sugerirRango(freq: string, ultimoFin: Date | null, hoy: Date) {
  const start = ultimoFin ? startOfDay(addDays(ultimoFin, 1)) : currentPeriodStart(freq, hoy);
  const end = periodEnd(freq, start);
  return { start, end };
}
function labelRango(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${start.toLocaleDateString("es-CO", opts)} — ${end.toLocaleDateString("es-CO", { ...opts, year: "numeric" })}`;
}

export function Comisiones() {
  const [ventas] = useVentas();
  const { profile } = useSession();
  const [asesores, setAsesores] = useState<Perfil[]>([]);
  const [ultimosPagos, setUltimosPagos] = useState<Record<string, PagoRow | null>>({});
  const [historiales, setHistoriales] = useState<Record<string, PagoRow[]>>({});
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [pctDraft, setPctDraft] = useState<Record<string, number>>({});
  const [montoDraft, setMontoDraft] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: perfiles } = await ziSupabase.from("zi_perfiles").select("*").eq("rol", "asesor").order("nombre");
    const list = (perfiles as Perfil[]) ?? [];
    setAsesores(list);
    setPctDraft(prev => ({ ...Object.fromEntries(list.map(p => [p.id, p.comision_pct ?? 0])), ...prev }));

    const { data: pagos } = await ziSupabase.from("zi_pagos_comisiones").select("*").order("fecha_fin", { ascending: false });
    const porAsesor: Record<string, PagoRow[]> = {};
    (pagos as PagoRow[] ?? []).forEach(p => { (porAsesor[p.asesor_id] ||= []).push(p); });
    setHistoriales(porAsesor);
    setUltimosPagos(Object.fromEntries(list.map(a => [a.id, porAsesor[a.id]?.[0] ?? null])));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Ganancia neta de un asesor en un rango de fechas: total (ya con
  // descuentos) − costo de los productos, misma fórmula que Ganancias.
  const gananciaEnRango = useCallback((asesorId: string, start: Date, end: Date) => {
    const from = startOfDay(start).getTime(), to = endOfDay(end).getTime();
    return ventas
      .filter(v => !v.cancelada && v.asesorId === asesorId && v.fecha >= from && v.fecha <= to)
      .reduce((s, v) => s + (v.total - v.productos.reduce((a, p) => a + (p.costo || 0) * p.cantidad, 0)), 0);
  }, [ventas]);

  const rangos = useMemo(() => {
    const hoy = new Date();
    const map: Record<string, { start: Date; end: Date; ganancia: number }> = {};
    asesores.forEach(a => {
      const ultimo = ultimosPagos[a.id];
      const { start, end } = sugerirRango(a.frecuencia_pago || "mensual", ultimo ? parseISO(ultimo.fecha_fin) : null, hoy);
      map[a.id] = { start, end, ganancia: gananciaEnRango(a.id, start, end) };
    });
    return map;
  }, [asesores, ultimosPagos, gananciaEnRango]);

  async function guardarPct(asesorId: string) {
    const pct = pctDraft[asesorId] ?? 0;
    await ziSupabase.from("zi_perfiles").update({ comision_pct: pct }).eq("id", asesorId);
    load();
  }

  async function marcarPagado(a: Perfil) {
    const r = rangos[a.id];
    const pct = pctDraft[a.id] ?? 0;
    const sugerido = Math.round(r.ganancia * (pct / 100));
    const monto = montoDraft[a.id] ?? sugerido;
    if (!confirm(
      `¿Marcar como pagado a ${a.nombre}?\n\nRango: ${labelRango(r.start, r.end)}\nGanancia neta generada: ${fmtCOP(r.ganancia)}\nMonto a pagar: ${fmtCOP(monto)}\n\nEsto queda registrado como pago realizado hoy y se descontará de "Ganancias" en el período en que lo registras.`
    )) return;
    setBusyId(a.id);
    const { error } = await ziSupabase.from("zi_pagos_comisiones").insert({
      asesor_id: a.id,
      fecha_inicio: iso(r.start),
      fecha_fin: iso(r.end),
      ganancia_neta: r.ganancia,
      monto,
      registrado_por: profile?.id ?? null,
    });
    setBusyId(null);
    if (error) { alert("No se pudo registrar el pago: " + error.message); return; }
    setMontoDraft(prev => { const p = { ...prev }; delete p[a.id]; return p; });
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl text-[var(--ink)]">Reportes y comisiones de asesores</h2>
        <p className="text-sm text-gray-500">Comisión = % configurado × ganancia neta generada por el asesor en su rango. El pago solo se descuenta de "Ganancias" cuando lo marcas aquí.</p>
      </div>

      {loading ? (
        <Card className="text-center text-gray-400 py-8 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</Card>
      ) : asesores.length === 0 ? (
        <Card className="text-center text-gray-400 py-8">Aún no hay asesores creados. Ve a "Usuarios" para crear el primero.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {asesores.map(a => {
            const r = rangos[a.id];
            if (!r) return null;
            const pct = pctDraft[a.id] ?? 0;
            const sugerido = Math.round(r.ganancia * (pct / 100));
            const monto = montoDraft[a.id] ?? sugerido;
            const hist = historiales[a.id] || [];
            const abierto = !!abiertos[a.id];
            return (
              <Card key={a.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-[var(--ink)]">{a.nombre} {a.apellido}</div>
                    <div className="text-xs text-gray-500">{FRECUENCIA_LABEL[a.frecuencia_pago] || "Mensual"} · pendiente: {labelRango(r.start, r.end)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div><div className="text-gray-400 text-xs">Ganancia neta en el rango</div><div className="font-semibold text-[var(--gold-dark)]">{fmtCOP(r.ganancia)}</div></div>
                  <div>
                    <div className="text-gray-400 text-xs">% comisión</div>
                    <div className="flex items-center gap-1.5">
                      <input type="number" min={0} max={100} step={0.5} value={pct}
                        onChange={e => setPctDraft(prev => ({ ...prev, [a.id]: +e.target.value || 0 }))}
                        className="w-16 px-2 py-1 border border-[var(--line)] rounded-lg text-sm outline-none focus:border-[var(--gold)]" />
                      <button onClick={() => guardarPct(a.id)} className="text-[10px] text-[var(--gold-dark)] font-bold uppercase">Guardar</button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[var(--line)]">
                  <Field label="Monto a pagar (editable)">
                    <input type="number" min={0} value={monto}
                      onChange={e => setMontoDraft(prev => ({ ...prev, [a.id]: +e.target.value || 0 }))}
                      className="w-full px-3 py-2 border border-[var(--line)] rounded-xl text-sm font-semibold outline-none focus:border-[var(--gold)]" />
                  </Field>
                  <p className="text-[11px] text-gray-400 mt-1">Sugerido: {fmtCOP(sugerido)} ({pct}% de la ganancia). Puedes ajustarlo antes de confirmar.</p>
                  <Btn variant="ink" disabled={busyId === a.id} onClick={() => marcarPagado(a)} className="w-full text-xs mt-3 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {busyId === a.id ? "Registrando..." : "Marcar como pagado"}
                  </Btn>
                </div>

                <button onClick={() => setAbiertos(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                        className="mt-3 text-[11px] text-gray-500 hover:text-[var(--gold-dark)] flex items-center gap-1 font-semibold">
                  <History className="w-3.5 h-3.5" /> Historial de pagos ({hist.length}) {abierto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {abierto && (
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                    {hist.length === 0 ? (
                      <p className="text-xs text-gray-400">Aún no se le ha registrado ningún pago.</p>
                    ) : hist.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs bg-[var(--mist)] rounded-lg px-2.5 py-1.5">
                        <div>
                          <div className="font-semibold text-[var(--ink)]">{labelRango(parseISO(p.fecha_inicio), parseISO(p.fecha_fin))}</div>
                          <div className="text-gray-400">Pagado el {fmtDate(new Date(p.pagado_en).getTime())} · ganancia {fmtCOP(p.ganancia_neta)}</div>
                        </div>
                        <div className="font-display text-sm text-[var(--gold-dark)]">{fmtCOP(p.monto)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
