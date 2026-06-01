import { useState, useMemo, useEffect } from "react";
import { useClientes, useProveedores, useEmpleados, useConfig, uid } from "@/lib/zi/store";
import { fmtCOP, fmtDate, maskCedula } from "@/lib/zi/format";
import { Card, Btn, Input, Select, Tabs, Field, Modal, Stat } from "./ui";
import type { ClienteCRM, Proveedor, Empleado, CuotaCRM } from "@/lib/zi/types";
import { Trash2, MessageCircle, Eye, Plus, Edit } from "lucide-react";

export function ClientesEmpleados() {
  const [tab, setTab] = useState("crm");
  return (
    <div>
      <Tabs tabs={[
        { id: "crm", label: "👥 Crédito CRM" },
        { id: "prov", label: "🏭 Proveedores" },
        { id: "emp", label: "👤 Empleados" },
      ]} active={tab} onChange={setTab} />
      {tab === "crm" && <CRM />}
      {tab === "prov" && <Proveedores />}
      {tab === "emp" && <Empleados />}
    </div>
  );
}

function CRM() {
  const [clientes, setClientes] = useClientes();
  // mora automática
  useEffect(() => {
    const now = Date.now();
    let changed = false;
    const upd = clientes.map(c => {
      if (c.estado === "pagado" || c.estado === "solicitud") return c;
      if (c.proximoPago < now) { changed = true; return { ...c, estado: "mora" as const }; }
      return c;
    });
    if (changed) setClientes(upd);
  }, [clientes, setClientes]);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("todos");
  const [detail, setDetail] = useState<ClienteCRM | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const list = useMemo(() => clientes.filter(c =>
    (filter === "todos" || c.estado === filter) &&
    (!q || c.nombre.toLowerCase().includes(q.toLowerCase()) || c.cedula.includes(q) || c.telefono.includes(q) || c.producto.toLowerCase().includes(q.toLowerCase()))
  ), [clientes, q, filter]);

  const proximos = clientes.filter(c => c.estado !== "pagado" && c.proximoPago - Date.now() < 7 * 86400000 && c.proximoPago > Date.now());

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-2 items-center">
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nombre, cédula, teléfono..." className="w-auto flex-1 min-w-[200px]" />
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-auto">
            <option value="todos">Todos</option><option value="al_dia">Al día</option><option value="mora">En mora</option><option value="pagado">Pagado</option><option value="solicitud">Solicitudes</option>
          </Select>
          <Btn onClick={() => setAddOpen(true)}><Plus className="inline w-3 h-3" /> Agregar cliente</Btn>
        </div>
      </Card>

      {proximos.length > 0 && (
        <Card className="bg-yellow-500/5 border-yellow-500/30">
          <div className="text-xs uppercase tracking-widest text-yellow-300 mb-2">⏰ Próximos vencimientos (7 días)</div>
          <div className="space-y-1 text-sm">
            {proximos.map(c => <div key={c.id} className="flex justify-between"><span>{c.nombre}</span><span className="text-yellow-300">{fmtDate(c.proximoPago)}</span></div>)}
          </div>
        </Card>
      )}

      <Card>
        {list.length === 0 ? <p className="text-sm text-gray-500">Sin clientes.</p> : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-gray-500 border-b border-white/10"><tr><th className="text-left py-2">Nombre</th><th>Cédula</th><th>Tel</th><th className="text-right">Total</th><th className="text-right">Saldo</th><th>Cuotas</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {list.map(c => {
                const saldo = c.total - c.cuotaInicial - c.historialAbonos.slice(1).reduce((s, a) => s + a.monto, 0);
                return (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="py-2">{c.nombre}</td>
                    <td className="text-xs text-gray-400">{maskCedula(c.cedula)}</td>
                    <td className="text-xs">{c.telefono}</td>
                    <td className="text-right">{fmtCOP(c.total)}</td>
                    <td className="text-right text-yellow-300">{fmtCOP(saldo)}</td>
                    <td className="text-xs">{c.cuotasPagadas}/{c.cuotas}</td>
                    <td><EstadoBadge estado={c.estado} /></td>
                    <td className="text-right">
                      <button onClick={() => setDetail(c)} className="text-blue-400 px-2"><Eye className="w-4 h-4" /></button>
                      {c.telefono && <a target="_blank" rel="noreferrer" href={`https://wa.me/${c.telefono}`} className="text-green-400 px-2 inline-block"><MessageCircle className="w-4 h-4" /></a>}
                      <button onClick={() => { if (confirm("¿Eliminar cliente?")) setClientes(prev => prev.filter(x => x.id !== c.id)); }} className="text-red-400 px-2"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.nombre} size="lg">
        {detail && <CRMDetail cliente={detail} onUpdate={(c) => { setClientes(prev => prev.map(x => x.id === c.id ? c : x)); setDetail(c); }} />}
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Agregar cliente CRM" size="md">
        <AddCRMForm onSave={(c) => { setClientes(prev => [...prev, c]); setAddOpen(false); }} />
      </Modal>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: ClienteCRM["estado"] }) {
  const c = { al_dia: "bg-green-500/20 text-green-400", mora: "bg-red-500/20 text-red-400", pagado: "bg-blue-500/20 text-blue-400", solicitud: "bg-yellow-500/20 text-yellow-400" }[estado];
  const l = { al_dia: "✅ Al día", mora: "⚠️ Mora", pagado: "🎉 Pagado", solicitud: "📋 Solicitud" }[estado];
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c}`}>{l}</span>;
}

function CRMDetail({ cliente, onUpdate }: { cliente: ClienteCRM; onUpdate: (c: ClienteCRM) => void }) {
  const saldo = cliente.total - cliente.cuotaInicial - cliente.historialAbonos.slice(1).reduce((s, a) => s + a.monto, 0);
  function pagarCuota(idx: number) {
    const cuotasDetalle = [...cliente.cuotasDetalle];
    cuotasDetalle[idx] = { ...cuotasDetalle[idx], estado: "pagada", pagadaEn: Date.now() };
    const cuotasPagadas = cuotasDetalle.filter(c => c.estado === "pagada").length;
    const nextPending = cuotasDetalle.find(c => c.estado === "pendiente");
    const todasPagadas = cuotasPagadas >= cliente.cuotas;
    onUpdate({
      ...cliente, cuotasDetalle, cuotasPagadas,
      estado: todasPagadas ? "pagado" : "al_dia",
      proximoPago: nextPending?.fechaPago || cliente.proximoPago,
      historialAbonos: [...cliente.historialAbonos, { fecha: Date.now(), monto: cliente.valorCuota, nota: `Cuota ${idx + 1}` }],
    });
  }
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div><span className="text-gray-500 text-xs">Cédula:</span> {cliente.cedula}</div>
        <div><span className="text-gray-500 text-xs">Tel:</span> {cliente.telefono}</div>
        <div><span className="text-gray-500 text-xs">Producto:</span> {cliente.producto}</div>
        <div><span className="text-gray-500 text-xs">Total:</span> <b className="text-[var(--gold)]">{fmtCOP(cliente.total)}</b></div>
        <div><span className="text-gray-500 text-xs">Abono inicial:</span> {fmtCOP(cliente.cuotaInicial)}</div>
        <div><span className="text-gray-500 text-xs">Saldo:</span> <b className="text-yellow-300">{fmtCOP(saldo)}</b></div>
      </div>
      <h4 className="text-xs uppercase tracking-widest text-gray-500 mt-4 border-b border-white/10 pb-2">Cuotas</h4>
      <table className="w-full text-xs">
        <thead className="text-gray-500"><tr><th className="text-left">#</th><th className="text-left">Fecha</th><th className="text-right">Monto</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {cliente.cuotasDetalle.map((c: CuotaCRM, i) => (
            <tr key={i} className="border-t border-white/5">
              <td className="py-2">{c.numero}</td>
              <td>{fmtDate(c.fechaPago)}</td>
              <td className="text-right">{fmtCOP(c.monto)}</td>
              <td>{c.estado === "pagada" ? "✅" : c.estado === "mora" || c.fechaPago < Date.now() ? "⚠️ Mora" : "⏳ Pendiente"}</td>
              <td>{c.estado !== "pagada" && <Btn variant="ok" onClick={() => pagarCuota(i)}>✓ Pagada</Btn>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4 className="text-xs uppercase tracking-widest text-gray-500 mt-4 border-b border-white/10 pb-2">Historial de abonos</h4>
      <ul className="text-xs space-y-1">
        {cliente.historialAbonos.map((a, i) => <li key={i} className="flex justify-between"><span>{fmtDate(a.fecha)} {a.nota && `· ${a.nota}`}</span><span className="text-[var(--gold)]">{fmtCOP(a.monto)}</span></li>)}
      </ul>
    </div>
  );
}

function AddCRMForm({ onSave }: { onSave: (c: ClienteCRM) => void }) {
  const [nombre, setNombre] = useState(""); const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState(""); const [producto, setProducto] = useState("");
  const [total, setTotal] = useState(0); const [inicial, setInicial] = useState(0);
  const [cuotas, setCuotas] = useState(3); const [pin, setPin] = useState("");
  const [estado, setEstado] = useState<ClienteCRM["estado"]>("al_dia");
  const valorCuota = cuotas > 0 ? (total - inicial) / cuotas : 0;
  function genPin() { setPin(String(Math.floor(1000 + Math.random() * 9000))); }
  function save() {
    if (!nombre) return;
    const detalle: CuotaCRM[] = Array.from({ length: cuotas }, (_, i) => ({
      numero: i + 1, fechaPago: Date.now() + (i + 1) * 30 * 86400000, monto: valorCuota, estado: "pendiente",
    }));
    onSave({
      id: uid(), nombre, cedula, telefono, producto, total, cuotaInicial: inicial, cuotas,
      cuotasPagadas: 0, valorCuota, estado, proximoPago: Date.now() + 30 * 86400000,
      cuotasDetalle: detalle, historialAbonos: inicial > 0 ? [{ fecha: Date.now(), monto: inicial, nota: "Cuota inicial" }] : [],
      pin,
    });
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Nombre"><Input value={nombre} onChange={e => setNombre(e.target.value)} /></Field>
      <Field label="Cédula"><Input value={cedula} onChange={e => setCedula(e.target.value)} /></Field>
      <Field label="Teléfono"><Input value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g,""))} /></Field>
      <Field label="Producto"><Input value={producto} onChange={e => setProducto(e.target.value)} /></Field>
      <Field label="Total"><Input type="number" value={total} onChange={e => setTotal(+e.target.value || 0)} /></Field>
      <Field label="Cuota inicial"><Input type="number" value={inicial} onChange={e => setInicial(+e.target.value || 0)} /></Field>
      <Field label="# Cuotas"><Input type="number" min={1} value={cuotas} onChange={e => setCuotas(Math.max(1, +e.target.value))} /></Field>
      <Field label="Valor por cuota"><div className="px-3 py-2 text-[var(--gold)] font-bold">{fmtCOP(valorCuota)}</div></Field>
      <Field label="Estado"><Select value={estado} onChange={e => setEstado(e.target.value as never)}><option value="al_dia">Al día</option><option value="mora">Mora</option><option value="solicitud">Solicitud</option></Select></Field>
      <Field label="PIN"><div className="flex gap-2"><Input value={pin} onChange={e => setPin(e.target.value)} maxLength={4} /><Btn variant="ghost" onClick={genPin}>🎲</Btn></div></Field>
      <div className="col-span-2"><Btn onClick={save} className="w-full">💾 Guardar cliente</Btn></div>
    </div>
  );
}

function Proveedores() {
  const [provs, setProvs] = useProveedores();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Proveedor | null>(null);
  function newP(): Proveedor { return { id: "", nombre: "", telefono: "", banco: "", cuenta: "", totalDeuda: 0, abonado: 0, fechaLimite: Date.now() + 30*86400000, historialAbonos: [] }; }
  function save(p: Proveedor) {
    const final = { ...p, id: p.id || uid() };
    setProvs(prev => p.id ? prev.map(x => x.id === p.id ? final : x) : [...prev, final]);
    setOpen(false);
  }
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex justify-between mb-3"><h3 className="font-display text-xl text-[var(--gold)]">Proveedores</h3><Btn onClick={() => { setEdit(newP()); setOpen(true); }}><Plus className="inline w-3 h-3" /> Agregar</Btn></div>
        {provs.length === 0 ? <p className="text-sm text-gray-500">Sin proveedores.</p> : (
          <table className="w-full text-sm"><thead className="text-[10px] uppercase text-gray-500 border-b border-white/10"><tr><th className="text-left py-2">Proveedor</th><th>Tel</th><th>Banco</th><th className="text-right">Deuda</th><th className="text-right">Abonado</th><th className="text-right">Saldo</th><th>Límite</th><th></th></tr></thead>
            <tbody>
              {provs.map(p => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-2">{p.nombre}</td><td className="text-xs">{p.telefono}</td><td className="text-xs">{p.banco}</td>
                  <td className="text-right">{fmtCOP(p.totalDeuda)}</td><td className="text-right text-green-400">{fmtCOP(p.abonado)}</td>
                  <td className="text-right text-yellow-300">{fmtCOP(p.totalDeuda - p.abonado)}</td>
                  <td className="text-xs">{fmtDate(p.fechaLimite)}</td>
                  <td className="text-right">
                    <button onClick={() => { const m = +(prompt("Monto abono:") || 0); if (m) setProvs(prev => prev.map(x => x.id === p.id ? { ...x, abonado: x.abonado + m, historialAbonos: [...x.historialAbonos, { fecha: Date.now(), monto: m }] } : x)); }} className="text-green-400 px-2">+$</button>
                    <button onClick={() => { setEdit(p); setOpen(true); }} className="text-blue-400 px-2"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm("¿Eliminar?")) setProvs(prev => prev.filter(x => x.id !== p.id)); }} className="text-red-400 px-2"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title={edit?.id ? "Editar proveedor" : "Nuevo proveedor"}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre"><Input value={edit.nombre} onChange={e => setEdit({ ...edit, nombre: e.target.value })} /></Field>
            <Field label="Teléfono"><Input value={edit.telefono} onChange={e => setEdit({ ...edit, telefono: e.target.value })} /></Field>
            <Field label="Banco"><Input value={edit.banco} onChange={e => setEdit({ ...edit, banco: e.target.value })} /></Field>
            <Field label="Cuenta"><Input value={edit.cuenta} onChange={e => setEdit({ ...edit, cuenta: e.target.value })} /></Field>
            <Field label="Total deuda"><Input type="number" value={edit.totalDeuda} onChange={e => setEdit({ ...edit, totalDeuda: +e.target.value })} /></Field>
            <Field label="Abono inicial"><Input type="number" value={edit.abonado} onChange={e => setEdit({ ...edit, abonado: +e.target.value })} /></Field>
            <Field label="Fecha límite"><Input type="date" value={new Date(edit.fechaLimite).toISOString().slice(0,10)} onChange={e => setEdit({ ...edit, fechaLimite: new Date(e.target.value).getTime() })} /></Field>
            <div className="col-span-2"><Btn onClick={() => save(edit)} className="w-full">💾 Guardar</Btn></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Empleados() {
  const [emp, setEmp] = useEmpleados();
  const [cfg] = useConfig();
  const [open, setOpen] = useState(false);
  const [pago, setPago] = useState<{ e: Empleado } | null>(null);
  const [edit, setEdit] = useState<Empleado | null>(null);

  function newE(): Empleado { return { id: "", nombre: "", local: 1, tipoPago: "diario", monto: 0, activoHoy: false, historialPagos: [] }; }

  function save(e: Empleado) {
    const final = { ...e, id: e.id || uid() };
    setEmp(prev => e.id ? prev.map(x => x.id === e.id ? final : x) : [...prev, final]);
    setOpen(false);
  }
  function toggle(e: Empleado) {
    const nuevoActivo = !e.activoHoy;
    setEmp(prev => prev.map(x => {
      if (x.id !== e.id) return x;
      // si pasa a activo y pago diario → registrar pago
      if (nuevoActivo && x.tipoPago === "diario") {
        return { ...x, activoHoy: true, historialPagos: [...x.historialPagos, { fecha: Date.now(), monto: x.monto, descripcion: "Pago diario auto" }] };
      }
      return { ...x, activoHoy: nuevoActivo };
    }));
  }
  function registrarPago(e: Empleado, monto: number, desc: string) {
    setEmp(prev => prev.map(x => x.id === e.id ? { ...x, historialPagos: [...x.historialPagos, { fecha: Date.now(), monto, descripcion: desc }] } : x));
    setPago(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex justify-between mb-3"><h3 className="font-display text-xl text-[var(--gold)]">Empleados</h3><Btn onClick={() => { setEdit(newE()); setOpen(true); }}><Plus className="inline w-3 h-3" /> Agregar</Btn></div>
        <p className="text-xs text-gray-500 mb-3">Cada empleado debe marcarse "Activo hoy" para generar pago diario.</p>
        {emp.length === 0 ? <p className="text-sm text-gray-500">Sin empleados.</p> : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-gray-500 border-b border-white/10"><tr><th className="text-left py-2">Nombre</th><th>Caja</th><th>Tipo</th><th className="text-right">Monto</th><th>Activo</th><th></th></tr></thead>
            <tbody>
              {emp.map(e => (
                <tr key={e.id} className="border-b border-white/5">
                  <td className="py-2">{e.nombre}</td>
                  <td className="text-xs">L{e.local} · {e.local === 1 ? cfg.local1nombre : cfg.local2nombre}</td>
                  <td className="text-xs uppercase">{e.tipoPago}</td>
                  <td className="text-right">{fmtCOP(e.monto)}</td>
                  <td><button onClick={() => toggle(e)} className={`px-2 py-1 rounded text-[10px] ${e.activoHoy ? "bg-green-500/20 text-green-400" : "bg-white/5 text-gray-400"}`}>{e.activoHoy ? "✓ Activo" : "Inactivo"}</button></td>
                  <td className="text-right">
                    <button onClick={() => setPago({ e })} className="text-[var(--gold)] px-2">💳</button>
                    <button onClick={() => { setEdit(e); setOpen(true); }} className="text-blue-400 px-2"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm("¿Eliminar?")) setEmp(prev => prev.filter(x => x.id !== e.id)); }} className="text-red-400 px-2"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={edit?.id ? "Editar empleado" : "Nuevo empleado"}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre"><Input value={edit.nombre} onChange={e => setEdit({ ...edit, nombre: e.target.value })} /></Field>
            <Field label="Caja"><Select value={edit.local} onChange={e => setEdit({ ...edit, local: +e.target.value as 1 | 2 })}><option value={1}>Local 1</option><option value={2}>Local 2</option></Select></Field>
            <Field label="Tipo de pago"><Select value={edit.tipoPago} onChange={e => setEdit({ ...edit, tipoPago: e.target.value as "diario" | "mensual" })}><option value="diario">Diario</option><option value="mensual">Mensual</option></Select></Field>
            <Field label="Monto"><Input type="number" value={edit.monto} onChange={e => setEdit({ ...edit, monto: +e.target.value })} /></Field>
            <div className="col-span-2"><Btn onClick={() => save(edit)} className="w-full">💾 Guardar</Btn></div>
          </div>
        )}
      </Modal>

      <Modal open={!!pago} onClose={() => setPago(null)} title={pago ? `Pago: ${pago.e.nombre}` : ""}>
        {pago && <PagoForm e={pago.e} onSave={registrarPago} />}
      </Modal>
    </div>
  );
}

function PagoForm({ e, onSave }: { e: Empleado; onSave: (e: Empleado, monto: number, desc: string) => void }) {
  const [monto, setMonto] = useState(e.monto);
  const [desc, setDesc] = useState("Pago quincenal");
  return (
    <div className="space-y-3">
      <Field label="Monto"><Input type="number" value={monto} onChange={ev => setMonto(+ev.target.value)} /></Field>
      <Field label="Descripción"><Input value={desc} onChange={ev => setDesc(ev.target.value)} /></Field>
      <Btn onClick={() => onSave(e, monto, desc)} className="w-full">💾 Registrar pago</Btn>
      {e.historialPagos.length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase text-gray-500 mb-1">Historial</div>
          <ul className="text-xs space-y-1 max-h-40 overflow-auto">
            {e.historialPagos.slice().reverse().slice(0, 10).map((p, i) => <li key={i} className="flex justify-between"><span>{fmtDate(p.fecha)} {p.descripcion}</span><span className="text-[var(--gold)]">{fmtCOP(p.monto)}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
