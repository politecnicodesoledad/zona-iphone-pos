import { useMemo, useEffect, useState } from "react";
import { useVentas, useSession, useGastos, uid } from "@/lib/zi/store";
import { fmtCOP, fmtDate } from "@/lib/zi/format";
import { ziSupabase } from "@/integrations/supabase/zi-client";
import { Card, Field, Input, Select, Btn } from "./ui";
import { TrendingUp, Calendar, Award, ShieldCheck, ReceiptText, Wallet } from "lucide-react";
import type { Gasto } from "@/lib/zi/types";

function mesActualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function labelRango(fi: string, ff: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const start = new Date(fi + "T12:00:00"), end = new Date(ff + "T12:00:00");
  return `${start.toLocaleDateString("es-CO", opts)} — ${end.toLocaleDateString("es-CO", { ...opts, year: "numeric" })}`;
}

function monthBoundsISO(mesISO: string) {
  const [y, m] = mesISO.split("-").map(Number);
  return { start: new Date(y, m - 1, 1).getTime(), end: new Date(y, m, 0, 23, 59, 59, 999).getTime() };
}

type PagoRow = { id: string; fecha_inicio: string; fecha_fin: string; ganancia_neta: number; monto: number; pagado_en: string };

// Panel del ASESOR: solo su propio rendimiento. Nunca costos de producto,
// nunca la utilidad neta global del negocio, nunca ventas de otros asesores
// — eso ya lo bloquea RLS en Supabase, esta pantalla solo evita mostrar
// campos que el asesor de todas formas no debería estar viendo.
export function MiDesempeno() {
  const [ventas] = useVentas();
  const { profile } = useSession();
  const [cierre, setCierre] = useState<{ ganancia_neta: number; porcentaje: number; comision: number; estado: string } | null>(null);
  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [mesSel, setMesSel] = useState(mesActualISO());

  useEffect(() => {
    if (!profile) return;
    ziSupabase.from("zi_comisiones").select("*").eq("id", `${profile.id}-${mesSel}`).maybeSingle()
      .then(({ data }) => setCierre(data as typeof cierre));
    // RLS ya garantiza que solo veo mis propios pagos (asesor_id = auth.uid()).
    ziSupabase.from("zi_pagos_comisiones").select("*").eq("asesor_id", profile.id).order("fecha_fin", { ascending: false })
      .then(({ data }) => setPagos((data as PagoRow[]) ?? []));
  }, [profile, mesSel]);

  const misVentas = useMemo(() => ventas.filter(v => v.asesorId === profile?.id && !v.cancelada).sort((a, b) => b.fecha - a.fecha), [ventas, profile]);

  const { hoy, mes, gananciaMes, descuentosMes, credMes, contadoMes } = useMemo(() => {
    const now = new Date();
    const inicioHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const { start: inicioMes, end: finMes } = monthBoundsISO(mesSel);
    const vHoy = misVentas.filter(v => v.fecha >= inicioHoy);
    const vMes = misVentas.filter(v => v.fecha >= inicioMes && v.fecha <= finMes);
    const ganancia = vMes.reduce((s, v) => s + (v.total - v.productos.reduce((a, p) => a + (p.costo || 0) * p.cantidad, 0)), 0);
    return {
      hoy: { cantidad: vHoy.length, total: vHoy.reduce((s, v) => s + v.total, 0) },
      mes: { cantidad: vMes.length, total: vMes.reduce((s, v) => s + v.total, 0), ventas: vMes },
      gananciaMes: ganancia,
      descuentosMes: vMes.reduce((s, v) => s + (v.descuentoOrden || 0) + (v.descuentoTotal || 0), 0),
      credMes: vMes.filter(v => v.tipo === "credito").length,
      contadoMes: vMes.filter(v => v.tipo === "contado").length,
    };
  }, [misVentas, mesSel]);

  const pct = profile?.comision_pct ?? 0;
  const comisionEstimada = Math.round(gananciaMes * (pct / 100));
  const esMesActual = mesSel === mesActualISO();
  const cerrado = esMesActual && (cierre?.estado === "cerrado" || cierre?.estado === "pagado");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl text-[var(--ink)]">Hola, {profile?.nombre} 👋</h2>
        <p className="text-sm text-gray-500">Este es tu rendimiento — solo tus propias ventas.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest"><Calendar className="w-3.5 h-3.5" /> Hoy</div>
          <div className="font-display text-3xl text-[var(--ink)] mt-1">{hoy.cantidad}</div>
          <div className="text-sm text-gray-500">{fmtCOP(hoy.total)}</div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-gray-400 text-xs uppercase tracking-widest">
            <span className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Mes</span>
            <input type="month" value={mesSel} onChange={e => setMesSel(e.target.value)}
                   className="text-[11px] border border-[var(--line)] rounded-lg px-1.5 py-0.5 outline-none focus:border-[var(--gold)]" />
          </div>
          <div className="font-display text-3xl text-[var(--ink)] mt-1">{mes.cantidad}</div>
          <div className="text-sm text-gray-500">{fmtCOP(mes.total)}</div>
        </Card>
        <Card className="bg-gradient-to-br from-[var(--gold-dark)]/20 to-[var(--gold)]/5 border-[var(--gold)]/40">
          <div className="flex items-center gap-2 text-[var(--gold-dark)] text-xs uppercase tracking-widest font-bold"><Award className="w-3.5 h-3.5" /> Comisión ({pct}%)</div>
          <div className="font-display text-3xl text-[var(--gold)] mt-1">{fmtCOP(cerrado ? cierre!.comision : comisionEstimada)}</div>
          <div className="text-[11px] text-gray-500">{cerrado ? "Cerrada por el admin este mes" : esMesActual ? "Generada hasta ahora este mes" : "Generada en el mes seleccionado"}</div>
        </Card>
      </div>

      <Card>
        <h3 className="font-display text-lg text-[var(--ink)] mb-3">Detalle del mes seleccionado</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-gray-400">Ganancia neta generada</div><div className="font-semibold text-[var(--gold-dark)]">{fmtCOP(gananciaMes)}</div></div>
          <div><div className="text-xs text-gray-400">Descuentos otorgados</div><div className="font-semibold text-[var(--ink)]">{fmtCOP(descuentosMes)}</div></div>
          <div><div className="text-xs text-gray-400">Ventas de contado</div><div className="font-semibold text-[var(--ink)]">{contadoMes}</div></div>
          <div><div className="text-xs text-gray-400">Ventas a crédito</div><div className="font-semibold text-[var(--ink)]">{credMes}</div></div>
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-lg text-[var(--ink)] mb-3">Mis últimas ventas</h3>
        {misVentas.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Aún no has registrado ventas.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {misVentas.slice(0, 15).map(v => (
              <div key={v.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold text-[var(--ink)]">{v.factura} · {v.cliente?.nombre || "—"}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    {fmtDate(v.fecha)}
                    {v.garantiaMeses ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3 h-3" /> {v.garantiaMeses} meses</span>
                    ) : null}
                  </div>
                </div>
                <div className="font-display text-lg text-[var(--gold)]">{fmtCOP(v.total)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-display text-lg text-[var(--ink)] mb-1 flex items-center gap-2"><Wallet className="w-4 h-4 text-[var(--gold-dark)]" /> Pagos de comisión recibidos</h3>
        <p className="text-xs text-gray-500 mb-3">Lo que ya te pagaron. Distinto de "Comisión ({pct}%)" de arriba, que es lo que llevas generado y aún no se ha pagado.</p>
        {pagos.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Aún no tienes pagos de comisión registrados.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {pagos.map(p => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold text-[var(--ink)]">{labelRango(p.fecha_inicio, p.fecha_fin)}</div>
                  <div className="text-xs text-gray-500">Pagado el {fmtDate(new Date(p.pagado_en).getTime())} · ganancia generada {fmtCOP(p.ganancia_neta)}</div>
                </div>
                <div className="font-display text-lg text-[var(--gold)]">{fmtCOP(p.monto)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <RegistrarGasto />
    </div>
  );
}

function RegistrarGasto() {
  const [, setGastos] = useGastos();
  const [desc, setDesc] = useState("");
  const [monto, setMonto] = useState(0);
  const [cat, setCat] = useState("Transporte");
  const [ok, setOk] = useState(false);

  function add() {
    if (!desc.trim() || !monto) { alert("Escribe una descripción y el monto del gasto."); return; }
    const g: Gasto = { id: uid(), descripcion: desc.trim(), monto, categoria: cat, local: 1, fecha: Date.now(), tipo: "operativo" };
    setGastos(prev => [...prev, g]);
    setDesc(""); setMonto(0);
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  }

  return (
    <Card>
      <h3 className="font-display text-lg text-[var(--ink)] flex items-center gap-2"><ReceiptText className="w-4 h-4 text-[var(--gold-dark)]" /> Registrar un gasto</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">Para gastos necesarios del día a día (transporte, suministros, etc.) — se descuentan del negocio, el admin los revisa en Gastos.</p>
      <div className="grid md:grid-cols-4 gap-2 items-end">
        <Field label="Descripción"><Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Domicilio del producto" /></Field>
        <Field label="Monto"><Input type="number" value={monto} onChange={e => setMonto(+e.target.value || 0)} /></Field>
        <Field label="Categoría">
          <Select value={cat} onChange={e => setCat(e.target.value)}>
            <option>Transporte</option><option>Suministros</option><option>Servicios</option><option>Publicidad</option><option>Otro</option>
          </Select>
        </Field>
        <Btn variant="ink" onClick={add}>+ Registrar</Btn>
      </div>
      {ok && <div className="text-emerald-600 text-xs mt-2">Gasto registrado ✓</div>}
    </Card>
  );
}
