import { useState, useMemo, useEffect } from "react";
import { useVentas, useGastos, useProductos, useOtros, useVendidos } from "@/lib/zi/store";
import { fmtCOP, fmtDate, rangeFor, type Periodo, dateInputToTime } from "@/lib/zi/format";
import { ventasConArchivados } from "@/lib/zi/sales-recovery";
import { Card, Stat, Btn, DateTriple } from "./ui";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ziSupabase } from "@/integrations/supabase/zi-client";
import type { Perfil } from "@/lib/zi/store";

export function Ganancias() {
  const [ventas] = useVentas();
  const [gastos] = useGastos();
  const [productos] = useProductos();
  const [otros] = useOtros();
  const [vendidos] = useVendidos();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [local, setLocal] = useState<"todos" | "1" | "2">("todos");
  const [verDesglose, setVer] = useState(false);

  // Nombres ACTUALES de cada usuario, tomados en vivo de zi_perfiles — así el
  // rendimiento por asesor queda conectado con la cuenta real de cada quien
  // (si alguien corrige su nombre en Usuarios, aquí se refleja al instante),
  // en vez de depender del texto que quedó guardado en la venta el día que
  // se hizo (que puede quedar viejo o vacío).
  const [perfiles, setPerfiles] = useState<Record<string, Perfil>>({});
  useEffect(() => {
    let alive = true;
    ziSupabase.from("zi_perfiles").select("*").then(({ data }) => {
      if (!alive) return;
      const map: Record<string, Perfil> = {};
      (data as Perfil[] ?? []).forEach(p => { map[p.id] = p; });
      setPerfiles(map);
    });
    return () => { alive = false; };
  }, []);

  const [start, end] = rangeFor(periodo, dateInputToTime(from), dateInputToTime(to, true));
  const ventasBase = useMemo(() => ventasConArchivados(ventas, vendidos), [ventas, vendidos]);

  // Comisiones PAGADAS en este período (no las generadas): se restan por la
  // fecha en que el admin marcó el pago (pagado_en), no por la fecha de las
  // ventas que las originaron — así "Ganancias" refleja lo que realmente
  // salió de caja en el período que estás mirando.
  const [comisionesPagadas, setComisionesPagadas] = useState(0);
  useEffect(() => {
    let alive = true;
    ziSupabase.from("zi_pagos_comisiones").select("monto")
      .gte("pagado_en", new Date(start).toISOString())
      .lte("pagado_en", new Date(end).toISOString())
      .then(({ data }) => { if (alive) setComisionesPagadas((data ?? []).reduce((s, r: any) => s + (r.monto || 0), 0)); });
    return () => { alive = false; };
  }, [start, end]);

  const data = useMemo(() => {
    const vs = ventasBase.filter(v => !v.cancelada && v.fecha >= start && v.fecha <= end && (local === "todos" || String(v.local) === local));
    const gs = gastos.filter(g => g.fecha >= start && g.fecha <= end && g.tipo === "operativo" && (local === "todos" || String(g.local) === local));
    const ingresos = vs.reduce((s, v) => s + v.total, 0);
    const costoVendido = vs.reduce((s, v) => s + v.productos.reduce((a, p) => a + (p.costo || 0) * p.cantidad, 0), 0);
    const operativos = gs.reduce((s, g) => s + g.monto, 0);
    const inventario = [...productos, ...otros];
    const inversionActiva = inventario.filter(p => p.stock > 0 && (local === "todos" || String(p.local) === local)).reduce((s, p) => s + (p.costo || 0) * Math.max(0, p.stock || 0), 0);
    const inversion = inversionActiva + costoVendido;
    const gananciaBruta = ingresos - costoVendido;
    const neta = gananciaBruta - operativos - comisionesPagadas;
    return { vs, ingresos, costoVendido, operativos, inversionActiva, inversion, comisionesPagadas, gananciaBruta, neta };
  }, [ventasBase, gastos, productos, otros, start, end, local, comisionesPagadas]);

  // Rendimiento por asesor — agrupado por asesorId (el vínculo REAL con la
  // cuenta, el mismo que usa RLS y el módulo de Comisiones), no por el texto
  // que se guardó en la venta. El nombre mostrado es el actual de zi_perfiles;
  // si el asesor ya no existe, cae al nombre que quedó guardado en la venta.
  // Las ventas sin asesorId (de antes del sistema de usuarios individuales,
  // o importadas) se agrupan aparte para no mezclarlas con datos reales.
  const porAsesor = useMemo(() => {
    const m = new Map<string, { nombre: string; ventas: number; total: number; ganancia: number }>();
    let sinVincular = { ventas: 0, total: 0, ganancia: 0 };
    data.vs.forEach(v => {
      const ganancia = v.total - v.productos.reduce((a, p) => a + (p.costo || 0) * p.cantidad, 0);
      if (!v.asesorId) {
        sinVincular.ventas++; sinVincular.total += v.total; sinVincular.ganancia += ganancia;
        return;
      }
      const perfil = perfiles[v.asesorId];
      const nombre = perfil ? `${perfil.nombre} ${perfil.apellido || ""}`.trim() : (v.asesor || "Asesor eliminado");
      const cur = m.get(v.asesorId) || { nombre, ventas: 0, total: 0, ganancia: 0 };
      cur.nombre = nombre; // siempre el más reciente
      cur.ventas++; cur.total += v.total; cur.ganancia += ganancia;
      m.set(v.asesorId, cur);
    });
    const filas = [...m.entries()].map(([id, d]) => ({ id, ...d })).sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (sinVincular.ventas > 0) filas.push({ id: "sin-vincular", nombre: "Ventas antiguas (sin asesor vinculado)", ...sinVincular });
    return filas;
  }, [data.vs, perfiles]);

  // ventas por día
  const porDia = useMemo(() => {
    const m = new Map<string, { label: string; total: number; ts: number }>();
    data.vs.forEach(v => {
      const d = new Date(v.fecha);
      d.setHours(0, 0, 0, 0);
      const k = d.toISOString().slice(0, 10);
      const cur = m.get(k) || { label: fmtDate(v.fecha), total: 0, ts: d.getTime() };
      cur.total += v.total;
      m.set(k, cur);
    });
    return [...m.values()].sort((a, b) => a.ts - b.ts).map((x) => [x.label, x.total] as [string, number]);
  }, [data.vs]);
  const maxDia = Math.max(1, ...porDia.map(([, v]) => v));
  const chartData = porDia.slice(-14).map(([fecha, ventas]) => ({ fecha, ventas }));

  const periodos: { id: Periodo; label: string }[] = [
    { id: "hoy", label: "Hoy" }, { id: "semana", label: "Esta semana" },
    { id: "mes", label: "Este mes" }, { id: "anio", label: "Este año" },
    { id: "custom", label: "Fecha específica" }, { id: "todos", label: "Todos" },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap gap-2 items-center">
          {periodos.map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${periodo === p.id ? "bg-[var(--gold)] text-black" : "border border-[var(--line)] text-gray-400"}`}>{p.label}</button>
          ))}
          {periodo === "custom" && (
            <div className="flex gap-2 items-center">
              <div className="min-w-[250px]"><DateTriple value={from} onChange={setFrom} /></div>
              <span className="text-gray-500 text-xs">→</span>
              <div className="min-w-[250px]"><DateTriple value={to} onChange={setTo} /></div>
            </div>
          )}
          <select value={local} onChange={e => setLocal(e.target.value as never)} className="ml-auto px-3 py-1.5 bg-white border border-[var(--line)] rounded-full text-xs text-[var(--ink)]">
            <option value="todos">Todos los locales</option>
            <option value="1">Local 1</option>
            <option value="2">Local 2</option>
          </select>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="💰 Inversión en productos" value={fmtCOP(data.inversion)} hint={`Activo ${fmtCOP(data.inversionActiva)} + vendido ${fmtCOP(data.costoVendido)}`} />
        <Stat label="📈 Ingresos totales" value={fmtCOP(data.ingresos)} hint={`${data.vs.length} ventas`} />
        <Stat label="🟢 Ganancia neta" value={fmtCOP(data.neta)} color={data.neta < 0 ? "#ef4444" : "var(--gold)"} />
      </div>

      <Card>
        <button onClick={() => setVer(v => !v)} className="text-xs text-[var(--gold-dark)] uppercase font-bold tracking-wider">
          {verDesglose ? "▼" : "▶"} Ver desglose
        </button>
        {verDesglose && (
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Ingresos brutos" v={data.ingresos} />
            <Row label="− Costo de productos vendidos" v={-data.costoVendido} />
            <Row label="= Ganancia bruta" v={data.gananciaBruta} bold />
            <Row label="− Gastos operativos del período" v={-data.operativos} />
            <Row label="− Comisiones de asesores PAGADAS en el período" v={-data.comisionesPagadas} />
            <div className="h-px bg-white/10" />
            <Row label="Lo que te queda (ganancia neta)" v={data.neta} bold color={data.neta < 0 ? "#ef4444" : "var(--gold)"} />
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="font-display text-2xl text-[var(--ink)]">Gráfica breve de ingresos</h3>
            <p className="text-xs text-gray-500">Últimos días dentro del filtro activo</p>
          </div>
          <div className="font-display text-3xl text-[var(--gold-dark)]">{fmtCOP(data.ingresos)}</div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="ziGoldArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.45}/>
                  <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v) => fmtCOP(Number(v))} labelStyle={{ color: "var(--ink)" }} />
              <Area type="monotone" dataKey="ventas" stroke="var(--gold-dark)" strokeWidth={3} fill="url(#ziGoldArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-display text-xl text-[var(--gold)] mb-3">Ventas por día</h3>
          {porDia.length === 0 ? <p className="text-sm text-gray-500">No hay ventas en este período.</p> : (
            <div className="space-y-1.5">
              {porDia.slice(-14).map(([d, v]) => (
                <div key={d}>
                  <div className="flex justify-between text-xs text-gray-400"><span>{d}</span><span>{fmtCOP(v)}</span></div>
                  <div className="h-2 bg-[var(--mist)] rounded-full overflow-hidden"><div className="h-full bg-[var(--gold)]" style={{ width: `${(v/maxDia)*100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="font-display text-xl text-[var(--gold)] mb-3">Rendimiento por asesor</h3>
          {porAsesor.length === 0 ? <p className="text-sm text-gray-500">Sin datos.</p> : (
            <table className="w-full text-sm">
              <thead className="text-[10px] text-gray-500 uppercase">
                <tr><th className="text-left py-1">Asesor</th><th className="text-right">Ventas</th><th className="text-right">Total</th><th className="text-right">Ganancia</th></tr>
              </thead>
              <tbody>
                {porAsesor.map(d => (
                  <tr key={d.id} className={`border-t border-[var(--line)] ${d.id === "sin-vincular" ? "text-gray-400 italic" : ""}`}>
                    <td className="py-1.5">{d.nombre}</td>
                    <td className="text-right">{d.ventas}</td>
                    <td className="text-right">{fmtCOP(d.total)}</td>
                    <td className="text-right text-[var(--gold)]">{fmtCOP(d.ganancia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="font-display text-xl text-[var(--gold)] mb-3">Historial de ventas del período</h3>
        {data.vs.length === 0 ? <p className="text-sm text-gray-500">Sin ventas.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] text-gray-500 uppercase border-b border-[var(--line)]">
                <tr><th className="text-left py-2">Factura</th><th className="text-left">Fecha</th><th className="text-left">Cliente</th><th className="text-right">Total</th><th className="text-right">Ganancia</th><th>Tipo</th></tr>
              </thead>
              <tbody>
                {data.vs.slice(0, 50).map(v => {
                  const g = v.total - v.productos.reduce((a, p) => a + (p.costo || 0) * p.cantidad, 0);
                  return (
                    <tr key={v.id} className="border-b border-[var(--line)]">
                      <td className="py-2 text-[var(--gold)]">{v.factura}</td>
                      <td className="text-xs text-gray-400">{fmtDate(v.fecha)}</td>
                      <td className="text-xs">{v.cliente?.nombre || "—"}</td>
                      <td className="text-right">{fmtCOP(v.total)}</td>
                      <td className="text-right text-[var(--gold)]">{fmtCOP(g)}</td>
                      <td className="text-xs uppercase text-gray-500">{v.tipo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, v, bold, color }: { label: string; v: number; bold?: boolean; color?: string }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span className={bold ? "text-[var(--ink)]" : "text-gray-600"}>{label}</span>
      <span style={{ color: color || (v < 0 ? "#dc2626" : "var(--gold-dark)") }}>{fmtCOP(v)}</span>
    </div>
  );
}
