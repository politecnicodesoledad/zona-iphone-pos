import { useState, useMemo } from "react";
import { useVentas, useGastos, useConfig, uid } from "@/lib/zi/store";
import { fmtCOP, fmtDate, fmtDateTime, rangeFor, type Periodo, maskCedula } from "@/lib/zi/format";
import { generarFacturaPDF, exportarHistorialPDF, facturaWhatsappText } from "@/lib/zi/pdf";
import { exportarVentasExcel } from "@/lib/zi/excel";
import { Card, Btn, Input, Select, Tabs, Field, Modal, Stat } from "./ui";
import { Trash2, Printer, MessageCircle, Download } from "lucide-react";
import type { Venta, Gasto } from "@/lib/zi/types";
import { NuevaVenta } from "./NuevaVenta";

export function Finanzas() {
  const [tab, setTab] = useState("historial");
  return (
    <div>
      <Tabs tabs={[
        { id: "historial", label: "📋 Historial" },
        { id: "retro", label: "🗓 Venta con fecha" },
        { id: "canceladas", label: "🚫 Canceladas" },
      ]} active={tab} onChange={setTab} />
      {tab === "historial" && <Historial />}
      {tab === "retro" && <RetroVenta />}
      {tab === "canceladas" && <Canceladas />}
    </div>
  );
}

function RetroVenta() {
  return (
    <div className="space-y-4">
      <Card className="bg-amber-50 border-amber-200">
        <h3 className="font-display text-2xl text-amber-900">Registrar venta atrasada</h3>
        <p className="text-sm text-amber-800 mt-1">Usa esta opción solo para recuperar una factura de otro día. Requiere PIN 0011 y queda marcada en el historial.</p>
      </Card>
      <NuevaVenta retroMode />
    </div>
  );
}

function Historial() {
  const [ventas, setVentas] = useVentas();
  const [cfg] = useConfig();
  const [tipo, setTipo] = useState("todos");
  const [local, setLocal] = useState("todos");
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Venta | null>(null);
  const [pinModal, setPinModal] = useState<Venta | null>(null);
  const [pin, setPin] = useState(""); const [pinErr, setPinErr] = useState("");

  const [start, end] = rangeFor(periodo, from ? new Date(from).getTime() : undefined, to ? new Date(to).getTime() + 86400000 : undefined);
  const list = useMemo(() => ventas.filter(v =>
    !v.cancelada &&
    (tipo === "todos" || v.tipo === tipo) &&
    (local === "todos" || String(v.local) === local) &&
    v.fecha >= start && v.fecha <= end &&
    (!q || v.factura.includes(q) || (v.cliente?.nombre || "").toLowerCase().includes(q.toLowerCase()))
  ).reverse(), [ventas, tipo, local, start, end, q]);

  function confirmCancel() {
    if (pin !== cfg.cancelPin) { setPinErr("PIN incorrecto"); return; }
    setVentas(prev => prev.map(v => v.id === pinModal!.id ? { ...v, cancelada: true, canceladaEn: Date.now(), razonCancelacion: "Cancelada desde historial" } : v));
    setPinModal(null); setPin(""); setPinErr(""); setDetail(null);
  }
  function sendWhatsapp(v: Venta) {
    const phone = (v.cliente?.telefono || cfg.whatsapp).replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(facturaWhatsappText(v, cfg))}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={tipo} onChange={e => setTipo(e.target.value)} className="w-auto">
            <option value="todos">Todos los pagos</option>
            <option value="contado">Contado</option><option value="credito">Crédito</option><option value="tradein">Celular como pago</option>
          </Select>
          <Select value={local} onChange={e => setLocal(e.target.value)} className="w-auto">
            <option value="todos">Todos los locales</option><option value="1">Local 1</option><option value="2">Local 2</option>
          </Select>
          {(["hoy","mes","todos"] as Periodo[]).map(p =>
            <button key={p} onClick={() => setPeriodo(p)} className={`px-3 py-1.5 text-xs rounded-full uppercase font-semibold ${periodo===p ? "bg-[var(--gold)] text-black" : "border border-[var(--line)] text-gray-400"}`}>{p === "hoy" ? "Hoy" : p === "mes" ? "Este mes" : "Todos"}</button>
          )}
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPeriodo("custom"); }} className="px-2 py-1.5 bg-white border border-[var(--line)] rounded-lg text-xs text-[var(--ink)]" />
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPeriodo("custom"); }} className="px-2 py-1.5 bg-white border border-[var(--line)] rounded-lg text-xs text-[var(--ink)]" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por # o cliente" className="w-auto flex-1 min-w-[180px]" />
          <Btn
            variant="gold"
            onClick={() => exportarHistorialPDF(list, cfg, { periodo, tipo, local })}
            disabled={list.length === 0}
            className="ml-auto"
            title={list.length === 0 ? "No hay ventas para exportar" : "Descargar PDF del historial filtrado"}
          >
            <Download className="inline w-3.5 h-3.5 mr-1" /> Exportar PDF
          </Btn>
          <Btn
            variant="ink"
            onClick={() => exportarVentasExcel(list)}
            disabled={list.length === 0}
            title={list.length === 0 ? "No hay ventas para exportar" : "Descargar Excel del historial filtrado"}
          >
            <Download className="inline w-3.5 h-3.5 mr-1" /> Excel
          </Btn>
        </div>
      </Card>

      <Card>
        {list.length === 0 ? <p className="text-sm text-gray-500">Sin ventas en el período.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] text-gray-500 uppercase border-b border-[var(--line)]">
                <tr><th className="text-left py-2">Factura</th><th className="text-left">Fecha</th><th className="text-left">Cliente</th><th className="text-left">Teléfono</th><th className="text-right">Total</th><th className="text-right">Ganancia</th><th>Pago</th><th></th></tr>
              </thead>
              <tbody>
                {list.map(v => {
                  const costo = v.productos.reduce((s, p) => s + (p.costo || 0) * p.cantidad, 0);
                  return <tr key={v.id} className="border-b border-[var(--line)] hover:bg-[var(--mist)] cursor-pointer" onClick={() => setDetail(v)}>
                    <td className="py-2 text-[var(--gold)] font-semibold">{v.factura}{v.fechaManual && <span className="ml-1 text-[9px] text-amber-700">MANUAL</span>}</td>
                    <td className="text-xs text-gray-400">{fmtDate(v.fecha)}</td>
                    <td className="text-xs">{v.cliente?.nombre || "—"}</td>
                    <td className="text-xs">{v.cliente?.telefono || "—"}</td>
                    <td className="text-right">{fmtCOP(v.total)}</td>
                    <td className="text-right text-emerald-600">{fmtCOP(v.total - costo)}</td>
                    <td className="text-xs uppercase text-gray-400">{v.tipo}</td>
                    <td className="text-right" onClick={e => e.stopPropagation()}>
                      <button title="Reimprimir" className="text-[var(--gold)] px-2" onClick={() => generarFacturaPDF(v, cfg)}><Printer className="w-4 h-4" /></button>
                      <button title="Enviar por WhatsApp" className="text-emerald-600 px-2" onClick={() => sendWhatsapp(v)}><MessageCircle className="w-4 h-4" /></button>
                      <button title="Cancelar" className="text-red-600 px-2" onClick={() => setPinModal(v)}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Detalle ${detail.factura}` : ""} size="lg">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="text-xs text-gray-400">{fmtDateTime(detail.fecha)}</div>
            <div className="space-y-1.5">
              {detail.productos.map((p, i) => (
                <div key={i} className="flex justify-between border-b border-[var(--line)] py-1.5">
                  <span>{p.cantidad} × {p.nombre}</span>
                  <span className="text-[var(--gold)]">{fmtCOP(p.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-base font-bold pt-2"><span>Total</span><span className="text-[var(--gold)] font-display text-2xl">{fmtCOP(detail.total)}</span></div>
            <div className="text-xs text-gray-400">Pago: <b className="text-[var(--ink)]">{detail.tipo}</b> {detail.metodoPago && `(${detail.metodoPago})`}</div>
            {detail.cliente && (
              <div className="bg-[var(--mist)] rounded-lg p-3 space-y-1 text-xs">
                <div>👤 {detail.cliente.nombre}</div>
                {detail.cliente.cedula && <div>📄 {maskCedula(detail.cliente.cedula)}</div>}
                {detail.cliente.telefono && <div>📞 {detail.cliente.telefono}</div>}
              </div>
            )}
            {detail.tradeIn && (
              <div className="bg-[var(--mist)] rounded-lg p-3 text-xs space-y-1">
                <div>📱 Recibido: {detail.tradeIn.marca} {detail.tradeIn.modelo}</div>
                <div>💰 Valor: {fmtCOP(detail.tradeIn.valor)} · Restante: {fmtCOP(detail.tradeIn.restante)} ({detail.tradeIn.metodoRestante})</div>
              </div>
            )}
            {detail.creditoCuotas && (
              <div className="bg-[var(--mist)] rounded-lg p-3 text-xs space-y-1">
                <div>💳 Cuota inicial: {fmtCOP(detail.creditoCuotaInicial || 0)}</div>
                <div>📅 {detail.creditoCuotas} cuotas de {fmtCOP(detail.creditoValorCuota || 0)}</div>
              </div>
            )}
            {detail.observaciones && <div className="text-xs text-gray-400">📝 {detail.observaciones}</div>}
            {detail.asesor && <div className="text-xs">Atendió: <b>{detail.asesor}</b></div>}
            <div className="flex gap-2 pt-3 border-t border-[var(--line)]">
              <Btn variant="danger" onClick={() => setPinModal(detail)}><Trash2 className="inline w-3 h-3" /> Cancelar</Btn>
              {detail.cliente?.telefono &&
                <Btn variant="ok" onClick={() => sendWhatsapp(detail)}>
                  <MessageCircle className="inline w-3 h-3" /> WhatsApp
                </Btn>}
              <Btn variant="gold" onClick={() => generarFacturaPDF(detail, cfg)}><Printer className="inline w-3 h-3" /> Imprimir</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!pinModal} onClose={() => { setPinModal(null); setPin(""); setPinErr(""); }} title="Cancelar venta" size="sm">
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-3">
          ⚠️ La venta se eliminará de los resultados activos y se descontará de las ganancias. Quedará registrada en canceladas.
        </p>
        <Field label="PIN de cancelación"><Input type="password" maxLength={4} value={pin} onChange={e => { setPin(e.target.value); setPinErr(""); }} /></Field>
        {pinErr && <div className="text-red-600 text-sm mt-2">{pinErr}</div>}
        <div className="flex gap-2 mt-4">
          <Btn variant="danger" onClick={confirmCancel} className="flex-1">Confirmar cancelación</Btn>
          <Btn variant="ghost" onClick={() => setPinModal(null)} className="flex-1">Volver</Btn>
        </div>
      </Modal>
    </div>
  );
}

function Canceladas() {
  const [ventas, setVentas] = useVentas();
  const cancel = ventas.filter(v => v.cancelada);
  const total = cancel.reduce((s, v) => s + v.total, 0);
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Stat label="Ventas canceladas" value={cancel.length} />
        <Stat label="Monto total cancelado" value={fmtCOP(total)} color="#ef4444" />
      </div>
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-xl text-[var(--gold)]">Historial de canceladas</h3>
          {cancel.length > 0 && <Btn variant="danger" onClick={() => { if (confirm("¿Vaciar todas las canceladas?")) setVentas(prev => prev.filter(v => !v.cancelada)); }}>🗑 Vaciar historial</Btn>}
        </div>
        {cancel.length === 0 ? <p className="text-sm text-gray-500">No hay ventas canceladas.</p> : (
          <table className="w-full text-sm">
            <thead className="text-[10px] text-gray-500 uppercase border-b border-[var(--line)]">
              <tr><th className="text-left py-2">Factura</th><th className="text-left">Fecha</th><th className="text-left">Cliente</th><th className="text-right">Total</th><th></th><th></th></tr>
            </thead>
            <tbody>
              {cancel.map(v => (
                <tr key={v.id} className="border-b border-[var(--line)]">
                  <td className="py-2 text-[var(--gold)]">{v.factura}</td>
                  <td className="text-xs text-gray-400">{fmtDate(v.fecha)}</td>
                  <td className="text-xs">{v.cliente?.nombre || "—"}</td>
                  <td className="text-right line-through text-gray-500">{fmtCOP(v.total)}</td>
                  <td><span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-bold">CANCELADA</span></td>
                  <td className="text-right"><button onClick={() => setVentas(prev => prev.filter(x => x.id !== v.id))} className="text-red-600 px-2"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function Gastos() {
  const [gastos, setGastos] = useGastos();
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [desc, setDesc] = useState(""); const [monto, setMonto] = useState(0);
  const [cat, setCat] = useState("Arriendo"); const [loc, setLoc] = useState<1 | 2>(1);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  const [start, end] = rangeFor(periodo, from ? new Date(from).getTime() : undefined, to ? new Date(to).getTime() + 86400000 : undefined);
  const op = gastos.filter(g => g.tipo === "operativo");
  const list = op.filter(g => g.fecha >= start && g.fecha <= end);

  const totHoy = op.filter(g => g.fecha >= rangeFor("hoy")[0]).reduce((s, g) => s + g.monto, 0);
  const totMes = op.filter(g => g.fecha >= rangeFor("mes")[0]).reduce((s, g) => s + g.monto, 0);
  const totAnio = op.filter(g => g.fecha >= rangeFor("anio")[0]).reduce((s, g) => s + g.monto, 0);

  function add() {
    if (!desc || !monto) return;
    const g: Gasto = { id: uid(), descripcion: desc, monto, categoria: cat, local: loc, fecha: new Date(fecha).getTime(), tipo: "operativo" };
    setGastos(prev => [...prev, g]);
    setDesc(""); setMonto(0);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-amber-50 border-amber-200">
        <div className="text-sm text-amber-800">
          <b>¿Qué registrar aquí?</b> Solo gastos operativos: arriendo del local, servicios (luz, internet), transportes, publicidad, suministros.<br />
          <b>NO registres aquí la compra de inventario:</b> eso ya se descuenta automáticamente cuando vendes un producto.
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Gastos hoy" value={fmtCOP(totHoy)} />
        <Stat label="Gastos este mes" value={fmtCOP(totMes)} />
        <Stat label="Gastos este año" value={fmtCOP(totAnio)} />
      </div>

      <Card>
        <h3 className="font-display text-xl text-[var(--gold)] mb-3">Registrar gasto</h3>
        <div className="grid md:grid-cols-5 gap-3">
          <Field label="Descripción"><Input value={desc} onChange={e => setDesc(e.target.value)} /></Field>
          <Field label="Monto"><Input type="number" value={monto} onChange={e => setMonto(+e.target.value || 0)} /></Field>
          <Field label="Categoría"><Select value={cat} onChange={e => setCat(e.target.value)}>
            <option>Arriendo</option><option>Servicios</option><option>Transporte</option><option>Publicidad</option><option>Suministros</option><option>Otro</option>
          </Select></Field>
          <Field label="Local"><Select value={loc} onChange={e => setLoc(+e.target.value as 1 | 2)}><option value={1}>Local 1</option><option value={2}>Local 2</option></Select></Field>
          <Field label="Fecha"><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
        </div>
        <Btn className="mt-3" onClick={add}>+ Agregar gasto</Btn>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          {(["hoy","mes","anio","todos"] as Periodo[]).map(p =>
            <button key={p} onClick={() => setPeriodo(p)} className={`px-3 py-1 text-xs rounded-full uppercase font-semibold ${periodo===p ? "bg-[var(--gold)] text-black" : "border border-[var(--line)] text-gray-400"}`}>
              {p === "hoy" ? "Hoy" : p === "mes" ? "Este mes" : p === "anio" ? "Este año" : "Todos"}
            </button>
          )}
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPeriodo("custom"); }} className="px-2 py-1 bg-white border border-[var(--line)] rounded-lg text-xs text-[var(--ink)]" />
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPeriodo("custom"); }} className="px-2 py-1 bg-white border border-[var(--line)] rounded-lg text-xs text-[var(--ink)]" />
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] text-gray-500 uppercase border-b border-[var(--line)]">
            <tr><th className="text-left py-2">Descripción</th><th>Categoría</th><th>Local</th><th className="text-right">Monto</th><th>Fecha</th><th></th></tr>
          </thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan={6} className="text-center text-gray-500 py-4">Sin gastos.</td></tr> :
              list.map(g => (
                <tr key={g.id} className="border-b border-[var(--line)]">
                  <td className="py-2">{g.descripcion}</td>
                  <td className="text-xs text-gray-400">{g.categoria}</td>
                  <td className="text-xs">L{g.local}</td>
                  <td className="text-right text-red-600">{fmtCOP(g.monto)}</td>
                  <td className="text-xs text-gray-400">{fmtDate(g.fecha)}</td>
                  <td className="text-right"><button onClick={() => setGastos(prev => prev.filter(x => x.id !== g.id))} className="text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
