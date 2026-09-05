import { useState, useMemo, useEffect, useCallback } from "react";
import { useVentas, useGastos, useConfig, useVendidos, useSession, uid } from "@/lib/zi/store";
import { ziSupabase } from "@/integrations/supabase/zi-client";
import type { Perfil } from "@/lib/zi/store";
import { fmtCOP, fmtDate, fmtDateTime, rangeFor, type Periodo, maskCedula, dateInputToTime } from "@/lib/zi/format";
import { generarFacturaPDF, exportarHistorialPDF, facturaWhatsappText } from "@/lib/zi/pdf";
import { exportarVentasExcel, importarVentasDesdeExcel } from "@/lib/zi/excel";
import { isVentaRecuperada, ventasConArchivados } from "@/lib/zi/sales-recovery";
import { Card, Btn, Input, Select, Tabs, Field, Modal, Stat, DateTriple } from "./ui";
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
  const [vendidos] = useVendidos();
  const [cfg] = useConfig();
  const { isAdmin } = useSession();
  const [asesores, setAsesores] = useState<Perfil[]>([]);
  const [tipo, setTipo] = useState("todos");
  const [local, setLocal] = useState("todos");
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Venta | null>(null);
  const [pinModal, setPinModal] = useState<Venta | null>(null);
  const [pin, setPin] = useState(""); const [pinErr, setPinErr] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    ziSupabase.from("zi_perfiles").select("*").eq("rol", "asesor").order("nombre")
      .then(({ data }) => setAsesores((data as Perfil[]) ?? []));
  }, [isAdmin]);

  const reasignar = useCallback((venta: Venta, asesorId: string) => {
    const a = asesores.find(x => x.id === asesorId);
    setVentas(prev => prev.map(v => v.id === venta.id
      ? { ...v, asesorId: a?.id, asesor: a ? `${a.nombre} ${a.apellido}`.trim() : undefined }
      : v));
    setDetail(prev => prev && prev.id === venta.id ? { ...prev, asesorId: a?.id, asesor: a ? `${a.nombre} ${a.apellido}`.trim() : undefined } : prev);
  }, [asesores, setVentas]);

  const [start, end] = rangeFor(periodo, dateInputToTime(from), dateInputToTime(to, true));
  const baseVentas = useMemo(() => ventasConArchivados(ventas, vendidos), [ventas, vendidos]);
  const list = useMemo(() => baseVentas.filter(v =>
    !v.cancelada &&
    (tipo === "todos" || v.tipo === tipo) &&
    (local === "todos" || String(v.local) === local) &&
    v.fecha >= start && v.fecha <= end &&
    (!q || v.factura.includes(q) || (v.cliente?.nombre || "").toLowerCase().includes(q.toLowerCase()))
  ), [baseVentas, tipo, local, start, end, q]);

  function confirmCancel() {
    if (pin !== cfg.cancelPin) { setPinErr("PIN incorrecto"); return; }
    setVentas(prev => prev.map(v => v.id === pinModal!.id ? { ...v, cancelada: true, canceladaEn: Date.now(), razonCancelacion: "Cancelada desde historial" } : v));
    setPinModal(null); setPin(""); setPinErr(""); setDetail(null);
  }
  function borrarVentaDefinitivo(v: Venta) {
    if (isVentaRecuperada(v)) return alert("Esta venta fue reconstruida desde Productos vendidos. Para quitarla, edita o elimina el producto vendido asociado.");
    const p = prompt("PIN para eliminar definitivamente:");
    if (p !== "0011") return alert("PIN incorrecto");
    if (!confirm(`¿Eliminar definitivamente ${v.factura}?`)) return;
    setVentas(prev => prev.filter(x => x.id !== v.id));
    setDetail(null);
  }
  function sendWhatsapp(v: Venta) {
    const phone = (v.cliente?.telefono || cfg.whatsapp).replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(facturaWhatsappText(v, cfg))}`, "_blank");
  }
  async function importarExcel(file: File) {
    const imported = await importarVentasDesdeExcel(file);
    setVentas(prev => {
      const ids = new Set(prev.map(v => v.id));
      return [...prev, ...imported.filter(v => !ids.has(v.id))];
    });
    alert(`Importadas ${imported.length} ventas del Excel. DIOVANNYS fue omitida si estaba en el archivo.`);
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
          <Select value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)} className="w-auto">
            <option value="hoy">Hoy</option>
            <option value="mes">Este mes</option>
            <option value="todos">Todos</option>
            <option value="custom">Fecha específica</option>
          </Select>
          {periodo === "custom" && (
            <>
              <div className="min-w-[260px]"><DateTriple value={from} onChange={v => setFrom(v)} /></div>
              <span className="text-gray-500 text-xs">→</span>
              <div className="min-w-[260px]"><DateTriple value={to} onChange={v => setTo(v)} /></div>
            </>
          )}
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
          <label className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] border border-[var(--line)] text-gray-700 bg-white hover:border-[var(--gold)] cursor-pointer">
            Importar Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && importarExcel(e.target.files[0])} />
          </label>
        </div>
      </Card>

      <Card>
        {list.length === 0 ? <p className="text-sm text-gray-500">Sin ventas en el período.</p> : (
          <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="text-[10px] text-gray-500 uppercase border-b border-[var(--line)]">
                <tr><th className="text-left px-3 py-3">Factura</th><th className="text-left px-3">Fecha</th><th className="text-left px-3">Cliente</th><th className="text-left px-3">Teléfono</th><th className="text-right px-3">Total</th>{isAdmin && <th className="text-right px-3">Ganancia</th>}{isAdmin && <th className="text-left px-3">Asesor</th>}<th className="px-3 text-left">Pago</th><th className="px-3"></th></tr>
              </thead>
              <tbody>
                {list.map(v => {
                  const costo = v.productos.reduce((s, p) => s + (p.costo || 0) * p.cantidad, 0);
                  const recovered = isVentaRecuperada(v);
                  return <tr key={v.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--mist)] cursor-pointer" onClick={() => setDetail(v)}>
                    <td className="px-3 py-3 text-[var(--gold)] font-semibold whitespace-nowrap">{v.factura}{recovered && <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] text-amber-700">RECUP.</span>}{v.fechaManual && !recovered && <span className="ml-1 text-[9px] text-amber-700">MANUAL</span>}</td>
                    <td className="px-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(v.fecha)}</td>
                    <td className="px-3 text-xs min-w-[180px]">{v.cliente?.nombre || "—"}</td>
                    <td className="px-3 text-xs whitespace-nowrap">{v.cliente?.telefono || "—"}</td>
                    <td className="px-3 text-right whitespace-nowrap">{fmtCOP(v.total)}</td>
                    {isAdmin && <td className="px-3 text-right text-emerald-600 whitespace-nowrap">{fmtCOP(v.total - costo)}</td>}
                    {isAdmin && <td className="px-3 text-xs whitespace-nowrap">{v.asesor || <span className="text-amber-600">Sin asignar</span>}</td>}
                    <td className="px-3 text-xs uppercase text-gray-500 whitespace-nowrap">{v.tipo}</td>
                    <td className="px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <button title="Reimprimir" className="text-[var(--gold)] p-2" onClick={() => generarFacturaPDF(v, cfg)}><Printer className="w-4 h-4" /></button>
                      <button title="Enviar por WhatsApp" className="text-emerald-600 p-2" onClick={() => sendWhatsapp(v)}><MessageCircle className="w-4 h-4" /></button>
                      {!recovered && <button title="Cancelar" className="text-red-600 p-2" onClick={() => setPinModal(v)}><Trash2 className="w-4 h-4" /></button>}
                      {!recovered && <button title="Eliminar definitivo" className="text-red-800 p-2 text-xs font-black" onClick={() => borrarVentaDefinitivo(v)}>✕</button>}
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
            {isAdmin ? (
              <div className="bg-[var(--mist)] rounded-lg p-3 text-xs space-y-2">
                <div className="text-gray-500">Atendió: <b className="text-[var(--ink)]">{detail.asesor || "Sin asignar"}</b></div>
                <div className="flex items-center gap-2">
                  <Select value={detail.asesorId || ""} onChange={e => reasignar(detail, e.target.value)} className="flex-1">
                    <option value="">— Sin asignar —</option>
                    {asesores.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
                  </Select>
                </div>
                <p className="text-[10px] text-gray-400">Útil para pasarle a un asesor ventas que se registraron antes de crear su cuenta.</p>
              </div>
            ) : (
              detail.asesor && <div className="text-xs">Atendió: <b>{detail.asesor}</b></div>
            )}
            <div className="flex gap-2 pt-3 border-t border-[var(--line)]">
              <Btn variant="danger" onClick={() => setPinModal(detail)}><Trash2 className="inline w-3 h-3" /> Cancelar</Btn>
              <Btn variant="ghost" onClick={() => borrarVentaDefinitivo(detail)}><Trash2 className="inline w-3 h-3" /> Eliminar historial</Btn>
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
  const cancel = ventas.filter(v => v.cancelada).sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
  const total = cancel.reduce((s, v) => s + v.total, 0);
  function borrarDefinitivo(v: Venta) {
    const pin = prompt("PIN para eliminar definitivamente:");
    if (pin !== "0011") return alert("PIN incorrecto");
    if (!confirm(`¿Eliminar definitivamente ${v.factura} del historial?`)) return;
    setVentas(prev => prev.filter(x => x.id !== v.id));
  }
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Stat label="Ventas canceladas" value={cancel.length} />
        <Stat label="Monto total cancelado" value={fmtCOP(total)} color="#ef4444" />
      </div>
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-xl text-[var(--gold)]">Historial de canceladas</h3>
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Conservado para auditoría</span>
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
                  <td className="text-right"><button title="Eliminar definitivamente" onClick={() => borrarDefinitivo(v)} className="text-red-600 px-2"><Trash2 className="w-4 h-4" /></button></td>
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

  const [start, end] = rangeFor(periodo, dateInputToTime(from), dateInputToTime(to, true));
  const op = gastos.filter(g => g.tipo === "operativo");
  const list = op.filter(g => g.fecha >= start && g.fecha <= end).sort((a, b) => (b.fecha || 0) - (a.fecha || 0));

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
          <Select value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)} className="w-auto">
            <option value="hoy">Hoy</option>
            <option value="mes">Este mes</option>
            <option value="anio">Este año</option>
            <option value="todos">Todos</option>
            <option value="custom">Fecha específica</option>
          </Select>
          {periodo === "custom" && (
            <>
              <div className="min-w-[250px]"><DateTriple value={from} onChange={v => setFrom(v)} /></div>
              <span className="text-gray-500 text-xs">→</span>
              <div className="min-w-[250px]"><DateTriple value={to} onChange={v => setTo(v)} /></div>
            </>
          )}
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
