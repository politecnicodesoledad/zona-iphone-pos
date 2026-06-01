import { useState, useMemo } from "react";
import { useVentas, useGastos, useEmpleados } from "@/lib/zi/store";
import { fmtCOP, fmtDate, rangeFor, type Periodo } from "@/lib/zi/format";
import { Card, Stat, Btn } from "./ui";

export function Ganancias() {
  const [ventas] = useVentas();
  const [gastos] = useGastos();
  const [empleados] = useEmpleados();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [local, setLocal] = useState<"todos" | "1" | "2">("todos");
  const [verDesglose, setVer] = useState(false);

  const [start, end] = rangeFor(periodo, from ? new Date(from).getTime() : undefined, to ? new Date(to).getTime() + 86400000 : undefined);

  const data = useMemo(() => {
    const vs = ventas.filter(v => !v.cancelada && v.fecha >= start && v.fecha <= end && (local === "todos" || String(v.local) === local));
    const gs = gastos.filter(g => g.fecha >= start && g.fecha <= end && g.tipo === "operativo" && (local === "todos" || String(g.local) === local));
    const ci = gastos.filter(g => g.fecha >= start && g.fecha <= end && g.tipo === "compra_inventario" && (local === "todos" || String(g.local) === local));
    const ingresos = vs.reduce((s, v) => s + v.total, 0);
    const costoVendido = vs.reduce((s, v) => s + v.productos.reduce((a, p) => a + (p.costo || 0) * p.cantidad, 0), 0);
    const operativos = gs.reduce((s, g) => s + g.monto, 0);
    const inversion = ci.reduce((s, g) => s + g.monto, 0);
    const salarios = empleados.reduce((s, e) =>
      s + e.historialPagos.filter(p => p.fecha >= start && p.fecha <= end).reduce((a, p) => a + p.monto, 0), 0);
    const gananciaBruta = ingresos - costoVendido;
    const neta = gananciaBruta - operativos - salarios;
    return { vs, ingresos, costoVendido, operativos, inversion, salarios, gananciaBruta, neta };
  }, [ventas, gastos, empleados, start, end, local]);

  // por asesor
  const porAsesor = useMemo(() => {
    const m = new Map<string, { ventas: number; total: number; ganancia: number }>();
    data.vs.forEach(v => {
      const k = v.asesor || "Sin asesor";
      const cur = m.get(k) || { ventas: 0, total: 0, ganancia: 0 };
      cur.ventas++; cur.total += v.total;
      cur.ganancia += v.total - v.productos.reduce((a, p) => a + (p.costo || 0) * p.cantidad, 0);
      m.set(k, cur);
    });
    return [...m.entries()];
  }, [data.vs]);

  // ventas por día
  const porDia = useMemo(() => {
    const m = new Map<string, number>();
    data.vs.forEach(v => {
      const k = fmtDate(v.fecha);
      m.set(k, (m.get(k) || 0) + v.total);
    });
    return [...m.entries()];
  }, [data.vs]);
  const maxDia = Math.max(1, ...porDia.map(([, v]) => v));

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
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-2 py-1 bg-white border border-[var(--line)] rounded text-xs text-white" />
              <span className="text-gray-500 text-xs">→</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-2 py-1 bg-white border border-[var(--line)] rounded text-xs text-white" />
            </div>
          )}
          <select value={local} onChange={e => setLocal(e.target.value as never)} className="ml-auto px-3 py-1.5 bg-white border border-[var(--line)] rounded-full text-xs text-white">
            <option value="todos">Todos los locales</option>
            <option value="1">Local 1</option>
            <option value="2">Local 2</option>
          </select>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="💰 Inversión en productos" value={fmtCOP(data.inversion)} hint="Capital invertido este período" />
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
            <Row label="− Salarios del período" v={-data.salarios} />
            <div className="h-px bg-white/10" />
            <Row label="Lo que te queda (ganancia neta)" v={data.neta} bold color={data.neta < 0 ? "#ef4444" : "var(--gold)"} />
          </div>
        )}
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
                {porAsesor.map(([k, d]) => (
                  <tr key={k} className="border-t border-[var(--line)]"><td className="py-1.5">{k}</td><td className="text-right">{d.ventas}</td><td className="text-right">{fmtCOP(d.total)}</td><td className="text-right text-[var(--gold)]">{fmtCOP(d.ganancia)}</td></tr>
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
                {data.vs.slice().reverse().slice(0, 50).map(v => {
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
