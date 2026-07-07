import { useState, useMemo } from "react";
import { useProductos, useOtros, useVentas, useClientes, useFacturaNum, useConfig, useVendidos, Store, uid, fmtFactura } from "@/lib/zi/store";
import { fmtCOP } from "@/lib/zi/format";
import { facturaWhatsappText, generarFacturaPDF } from "@/lib/zi/pdf";
import { Card, Btn, Input, Select, Textarea, Tabs, Field, DateTriple } from "./ui";
import type { VentaProducto, Venta, Producto } from "@/lib/zi/types";
import { Trash2, Search, Plus, MessageCircle } from "lucide-react";

interface Item extends VentaProducto { id: string; precioBase: number; }

export function NuevaVenta({ retroMode = false }: { retroMode?: boolean }) {
  const [productos] = useProductos();
  const [otros] = useOtros();
  const [, setVentas] = useVentas();
  const [, setClientes] = useClientes();
  const [num, setNum] = useFacturaNum();
  const [cfg] = useConfig();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [quickNombre, setQuickNombre] = useState("");
  const [quickCosto, setQuickCosto] = useState(0);
  const [quickPrecio, setQuickPrecio] = useState(0);
  const [quickStock, setQuickStock] = useState(1);
  const [tipoPago, setTipoPago] = useState<"contado" | "credito" | "tradein">("contado");
  const [metodo, setMetodo] = useState<"efectivo" | "nequi" | "transferencia" | "datafono">("efectivo");
  const [recibido, setRecibido] = useState(0);
  const [asesor, setAsesor] = useState("");
  const [local, setLocal] = useState<1 | 2>(1);
  // credito
  const [cNombre, setCNombre] = useState("");
  const [cCedula, setCCedula] = useState("");
  const [cTel, setCTel] = useState("");
  const [cInicial, setCInicial] = useState(0);
  const [cCuotas, setCCuotas] = useState(3);
  // tradein
  const [tMarca, setTMarca] = useState("");
  const [tModelo, setTModelo] = useState("");
  const [tImei, setTImei] = useState("");
  const [tValor, setTValor] = useState(0);
  const [tMetodo, setTMetodo] = useState<"efectivo" | "nequi" | "transferencia" | "datafono">("efectivo");

  const [obs, setObs] = useState("");
  const [garantia, setGarantia] = useState("");
  const [ultimaVenta, setUltima] = useState<Venta | null>(null);
  const [fechaFactura, setFechaFactura] = useState(() => new Date().toISOString().slice(0, 16));
  const [pinFecha, setPinFecha] = useState("");

  const disponibles = useMemo(() => [...productos, ...otros].filter(p => p.stock > 0), [productos, otros]);
  const matches = useMemo(() => {
    const base = search ? disponibles.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase())) : disponibles;
    return base.slice(0, search ? 30 : 50);
  }, [disponibles, search]);
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const descuentoTotal = items.reduce((s, i) => s + (i.descuento || 0), 0);
  const cValorCuota = cCuotas > 0 ? (total - cInicial) / cCuotas : 0;
  const tRestante = total - tValor;

  function add(p: Producto) {
    const already = items.filter(i => i.productoId === p.id).reduce((s, i) => s + i.cantidad, 0);
    if (already >= p.stock) return alert("No hay más stock disponible para este producto.");
    setItems(prev => [...prev, {
      id: uid(), productoId: p.id, nombre: p.nombre, cantidad: 1,
      precioUnitario: p.precio, precioBase: p.precio, costo: p.costo, descuento: 0, subtotal: p.precio,
    }]);
    setSearch(""); setSelectedId("");
  }
  function addSelected() {
    const p = disponibles.find(x => x.id === selectedId) || matches[0];
    if (!p) return alert("Selecciona un producto del inventario");
    add(p);
  }
  function addQuick() {
    if (!quickNombre.trim()) { alert("Escribe el nombre del producto personalizado"); return; }
    const cantidad = Math.max(1, quickStock || 1);
    setItems(prev => [...prev, {
      id: uid(), productoId: `rapido-${uid()}`, nombre: quickNombre.trim(), cantidad,
      precioUnitario: quickPrecio, precioBase: quickPrecio, costo: quickCosto, descuento: 0,
      subtotal: quickPrecio * cantidad, esRapido: true,
    }]);
    setQuickNombre(""); setQuickCosto(0); setQuickPrecio(0); setQuickStock(1);
  }
  function updateItem(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const next = { ...i, ...patch };
      next.subtotal = Math.max(0, next.precioUnitario * next.cantidad - (next.descuento || 0));
      return next;
    }));
  }
  function removeItem(id: string) { setItems(prev => prev.filter(i => i.id !== id)); }

  async function finalizar() {
    if (saving) return;
    if (items.length === 0) { alert("Agrega al menos un producto"); return; }
    const requiereCliente = tipoPago === "credito" || tipoPago === "tradein";
    if (requiereCliente && (!cNombre.trim() || !cTel.trim() || !cCedula.trim())) {
      alert("Para crédito o celular como parte de pago debes registrar nombre, teléfono y cédula."); return;
    }
    if (retroMode && pinFecha !== "0011") { alert("PIN incorrecto para registrar venta con fecha manual"); return; }
    const fechaVenta = retroMode ? new Date(fechaFactura).getTime() : Date.now();
    if (!Number.isFinite(fechaVenta)) { alert("Fecha inválida"); return; }
    const stockActual = [...Store.productos(), ...Store.otros()];
    const sinStock = items.find((it) => !it.esRapido && it.cantidad > (stockActual.find(p => p.id === it.productoId)?.stock || 0));
    if (sinStock) { alert(`Stock insuficiente para ${sinStock.nombre}`); return; }
    setSaving(true);
    let facturaNum = num;
    try {
      const { nextFacturaNumber } = await import("@/lib/zi/cloud-sync");
      facturaNum = await nextFacturaNumber(num);
    } catch {
      facturaNum = num;
    }
    const factura = fmtFactura(facturaNum);
    const venta: Venta = {
      id: uid(), factura, fecha: fechaVenta, registradaEn: Date.now(), fechaManual: retroMode, tipo: tipoPago, local, asesor,
      productos: items.map(({ id: _id, precioBase: _pb, ...rest }) => rest),
      total, descuentoTotal, observaciones: obs, garantia: garantia.trim() || cfg.facturaGarantia,
      ...((cNombre || cTel || cCedula) && { cliente: { nombre: cNombre.trim(), cedula: cCedula.trim(), telefono: cTel.trim() } }),
      ...(tipoPago === "contado" && { metodoPago: metodo, recibido }),
      ...(tipoPago === "credito" && {
        cliente: { nombre: cNombre, cedula: cCedula, telefono: cTel },
        creditoCuotas: cCuotas, creditoCuotaInicial: cInicial, creditoValorCuota: cValorCuota,
      }),
      ...(tipoPago === "tradein" && {
        cliente: { nombre: cNombre, cedula: cCedula, telefono: cTel },
        tradeIn: { marca: tMarca, modelo: tModelo, imei: tImei, valor: tValor, restante: tRestante, metodoRestante: tMetodo },
      }),
    };
    // descontar stock + archivar si llega a 0
    const ps = Store.productos();
    const os = Store.otros();
    const vendidosArr = Store.vendidos();
    let psNew = [...ps];
    let osNew = [...os];
    items.forEach(it => {
      const idx = psNew.findIndex(p => p.id === it.productoId);
      if (idx >= 0) {
        const p = { ...psNew[idx], stock: Math.max(0, psNew[idx].stock - it.cantidad) };
        psNew[idx] = p;
        if (p.stock <= 0) {
          vendidosArr.push({
            id: uid(), nombre: p.nombre, categoria: p.categoria, cantidad: it.cantidad, costo: it.costo, precio: it.precioUnitario,
            gananciaPotencial: (it.precioUnitario - it.costo) * it.cantidad, fechaArchivado: Date.now(), fechaVenta,
            ventaId: venta.id, cliente: venta.cliente?.nombre, detalleExtra: it.color, observaciones: obs, original: p,
          });
        }
      } else if (osNew.findIndex(p => p.id === it.productoId) >= 0) {
        const oidx = osNew.findIndex(p => p.id === it.productoId);
        const p = { ...osNew[oidx], stock: Math.max(0, osNew[oidx].stock - it.cantidad) };
        osNew[oidx] = p;
        if (p.stock <= 0) {
          vendidosArr.push({
            id: uid(), nombre: p.nombre, categoria: p.categoria, cantidad: it.cantidad, costo: it.costo, precio: it.precioUnitario,
            gananciaPotencial: (it.precioUnitario - it.costo) * it.cantidad, fechaArchivado: Date.now(), fechaVenta,
            ventaId: venta.id, cliente: venta.cliente?.nombre, detalleExtra: it.color, observaciones: obs, original: p,
          });
        }
      } else if (it.esRapido) {
        vendidosArr.push({
          id: uid(), nombre: it.nombre, categoria: "otro", cantidad: it.cantidad, costo: it.costo, precio: it.precioUnitario,
          gananciaPotencial: (it.precioUnitario - it.costo) * it.cantidad, fechaArchivado: Date.now(), fechaVenta,
          ventaId: venta.id, cliente: venta.cliente?.nombre, observaciones: obs,
          original: { id: it.productoId, nombre: it.nombre, categoria: "otro", descripcion: "Venta rápida", estado: "personalizado", colores: [], imagen: "", precio: it.precioUnitario, costo: it.costo, stock: 1, local, costoOrigen: "capital_aparte", creadoEn: Date.now() },
        });
      }
    });
    psNew = psNew.filter(p => p.stock > 0);
    osNew = osNew.filter(p => p.stock > 0);
    Store.setProductos(psNew);
    Store.setOtros(osNew);
    Store.setVendidos(vendidosArr);

    setVentas(prev => [...prev, venta]);
    setNum(Math.max(num, facturaNum) + 1);

    // CRM crédito
    if (tipoPago === "credito" && cNombre) {
      const cuotas = Array.from({ length: cCuotas }, (_, i) => ({
        numero: i + 1,
        fechaPago: Date.now() + (i + 1) * 30 * 86400000,
        monto: cValorCuota,
        estado: "pendiente" as const,
      }));
      setClientes(prev => [...prev, {
        id: uid(), nombre: cNombre, cedula: cCedula, telefono: cTel,
        producto: items.map(i => i.nombre).join(", "),
        total, cuotaInicial: cInicial, cuotas: cCuotas, cuotasPagadas: 0,
        valorCuota: cValorCuota, estado: "al_dia",
        proximoPago: Date.now() + 30 * 86400000,
        cuotasDetalle: cuotas, historialAbonos: [{ fecha: Date.now(), monto: cInicial, nota: "Cuota inicial" }],
        ventaId: venta.id,
      }]);
    }
    setUltima(venta);
    // reset
    setItems([]); setObs(""); setGarantia(""); setRecibido(0); setPinFecha(""); setFechaFactura(new Date().toISOString().slice(0, 16));
    setCNombre(""); setCCedula(""); setCTel(""); setCInicial(0); setCCuotas(3);
    setTMarca(""); setTModelo(""); setTImei(""); setTValor(0);
    alert(`Venta ${factura} guardada ✓`);
    setSaving(false);
  }

  function imprimir() {
    if (!ultimaVenta) return alert("Primero finaliza una venta");
    generarFacturaPDF(ultimaVenta, cfg);
  }
  function enviarWhatsapp() {
    if (!ultimaVenta) return alert("Primero finaliza una venta");
    const phone = (ultimaVenta.cliente?.telefono || cfg.whatsapp).replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(facturaWhatsappText(ultimaVenta, cfg))}`, "_blank");
  }

  function cancelar() {
    const pin = prompt("PIN de cancelación (4 dígitos):");
    if (pin !== cfg.cancelPin) return alert("PIN incorrecto");
    setItems([]); setObs(""); setUltima(null);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      <div className="space-y-4">
        <Card>
          <Field label="Buscar producto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre del producto..." className="pl-9" />
            </div>
          </Field>
          <div className="mt-3 grid md:grid-cols-[1fr_auto] gap-2 items-end">
            <Field label={search ? "Resultados filtrados" : "Desplegar inventario"}>
              <Select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                <option value="">Selecciona un producto...</option>
                {matches.map(p => <option key={p.id} value={p.id}>{p.nombre} · {p.stock} disp. · {fmtCOP(p.precio)}</option>)}
              </Select>
            </Field>
            <Btn type="button" variant="ink" onClick={addSelected} className="h-10">Agregar</Btn>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-xl text-[var(--gold)] mb-3">Datos del cliente</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label={tipoPago === "contado" ? "Nombre (opcional)" : "Nombre (obligatorio)"}><Input value={cNombre} onChange={e => setCNombre(e.target.value)} placeholder="Nombre del cliente" /></Field>
            <Field label={tipoPago === "contado" ? "Teléfono (opcional)" : "Teléfono (obligatorio)"}><Input value={cTel} onChange={e => setCTel(e.target.value.replace(/\D/g,""))} placeholder="300..." /></Field>
            <Field label={tipoPago === "contado" ? "Cédula (opcional)" : "Cédula (obligatoria)"}><Input value={cCedula} onChange={e => setCCedula(e.target.value.replace(/\D/g,""))} placeholder="CC / NIT" /></Field>
          </div>
        </Card>

        {retroMode && (
          <Card className="border-amber-200 bg-amber-50">
            <h3 className="font-display text-xl text-amber-900 mb-3">Venta con fecha manual</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Fecha real (mes / día / año)"><DateTriple value={fechaFactura.slice(0, 10)} onChange={v => setFechaFactura(`${v}${fechaFactura.slice(10) || "T12:00"}`)} /></Field>
              <Field label="Hora"><Input type="time" value={(fechaFactura.split("T")[1] || "12:00").slice(0, 5)} onChange={e => setFechaFactura(`${fechaFactura.slice(0, 10)}T${e.target.value}`)} /></Field>
              <Field label="PIN requerido"><Input type="password" maxLength={4} value={pinFecha} onChange={e => setPinFecha(e.target.value.replace(/\D/g,""))} placeholder="0011" /></Field>
            </div>
          </Card>
        )}

        <Card className="border-[var(--gold)]/30 bg-[var(--cream)]/60">
          <h3 className="font-display text-xl text-[var(--gold-dark)] mb-3">Venta rápida personalizada</h3>
          <div className="grid md:grid-cols-5 gap-3 items-end">
            <Field label="Nombre"><Input value={quickNombre} onChange={e => setQuickNombre(e.target.value)} placeholder="Ej: iPhone pedido" /></Field>
            <Field label="Costo compra"><Input type="number" value={quickCosto} onChange={e => setQuickCosto(+e.target.value || 0)} /></Field>
            <Field label="Precio venta"><Input type="number" value={quickPrecio} onChange={e => setQuickPrecio(+e.target.value || 0)} /></Field>
            <Field label="Stock/Cant."><Input type="number" min={1} value={quickStock} onChange={e => setQuickStock(Math.max(1, +e.target.value || 1))} /></Field>
            <Btn variant="ink" onClick={addQuick} className="h-10">Agregar rápido</Btn>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-xl text-[var(--gold)] mb-3">Carrito ({items.length})</h3>
          {items.length === 0 ? <p className="text-sm text-gray-500">No hay productos agregados.</p> : (
            <div className="space-y-3">
              {items.map(i => {
                const ganancia = i.precioUnitario - i.costo;
                const margen = i.precioUnitario > 0 ? (ganancia / i.precioUnitario) * 100 : 0;
                return (
                  <div key={i.id} className="border border-[var(--line)] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm">{i.nombre}</div>
                      <button onClick={() => removeItem(i.id)} className="text-red-600 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      <Field label="Precio unit."><Input type="number" value={i.precioUnitario} onChange={e => updateItem(i.id, { precioUnitario: +e.target.value || 0 })} /></Field>
                      <Field label="Cantidad"><Input type="number" min={1} value={i.cantidad} onChange={e => updateItem(i.id, { cantidad: Math.max(1, +e.target.value || 1) })} /></Field>
                      <Field label="Descuento"><Input type="number" value={i.descuento || 0} onChange={e => updateItem(i.id, { descuento: +e.target.value || 0 })} /></Field>
                      <Field label="Subtotal"><div className="px-3 py-2 font-display text-2xl text-[var(--gold)]">{fmtCOP(i.subtotal)}</div></Field>
                    </div>
                    <div className={`text-xs mt-1 ${ganancia >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      Ganancia: {fmtCOP(ganancia)} ({margen.toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 border-t border-[var(--line)] pt-3 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Descuentos</span><span className="text-red-600">− {fmtCOP(descuentoTotal)}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-400 uppercase tracking-widest">Total</span><span className="font-display text-4xl text-[var(--gold)]">{fmtCOP(total)}</span></div>
          </div>
        </Card>

        <Card>
          <Tabs
            tabs={[{ id: "contado", label: "💵 Contado" }, { id: "credito", label: "💳 Crédito" }, { id: "tradein", label: "🔄 Celular como pago" }]}
            active={tipoPago}
            onChange={(v) => setTipoPago(v as never)}
          />
          {tipoPago === "contado" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Método"><Select value={metodo} onChange={e => setMetodo(e.target.value as never)}>
                <option value="efectivo">Efectivo</option><option value="nequi">Nequi</option>
                <option value="transferencia">Transferencia</option><option value="datafono">Datáfono</option>
              </Select></Field>
              <Field label="Recibido"><Input type="number" value={recibido} onChange={e => setRecibido(+e.target.value || 0)} /></Field>
              <Field label="Vuelto"><div className="px-3 py-2 text-[var(--gold)] font-bold">{fmtCOP(Math.max(0, recibido - total))}</div></Field>
              <Field label="Asesor"><Input value={asesor} onChange={e => setAsesor(e.target.value)} placeholder="Nombre de quien atiende" /></Field>
            </div>
          )}
          {tipoPago === "credito" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cuota inicial"><Input type="number" value={cInicial} onChange={e => setCInicial(+e.target.value || 0)} /></Field>
              <Field label="# Cuotas"><Input type="number" min={1} value={cCuotas} onChange={e => setCCuotas(Math.max(1, +e.target.value))} /></Field>
              <Field label="Valor por cuota"><div className="px-3 py-2 text-[var(--gold)] font-bold">{fmtCOP(cValorCuota)}</div></Field>
              <Field label="Asesor"><Input value={asesor} onChange={e => setAsesor(e.target.value)} /></Field>
            </div>
          )}
          {tipoPago === "tradein" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca del cel"><Input value={tMarca} onChange={e => setTMarca(e.target.value)} /></Field>
              <Field label="Modelo"><Input value={tModelo} onChange={e => setTModelo(e.target.value)} /></Field>
              <Field label="IMEI (opcional)"><Input value={tImei} onChange={e => setTImei(e.target.value)} /></Field>
              <Field label="Valor del cel"><Input type="number" value={tValor} onChange={e => setTValor(+e.target.value || 0)} /></Field>
              <Field label="Restante"><div className="px-3 py-2 text-[var(--gold)] font-bold">{fmtCOP(tRestante)}</div></Field>
              <Field label="Método restante"><Select value={tMetodo} onChange={e => setTMetodo(e.target.value as never)}>
                <option value="efectivo">Efectivo</option><option value="nequi">Nequi</option>
                <option value="transferencia">Transferencia</option><option value="datafono">Datáfono</option>
              </Select></Field>
              <Field label="Asesor"><Input value={asesor} onChange={e => setAsesor(e.target.value)} /></Field>
            </div>
          )}
        </Card>

        <Card>
          <Field label="Observaciones"><Textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Notas internas, IMEI, detalles del pago..." /></Field>
          <Field label="Garantía de esta venta"><Textarea rows={2} value={garantia} onChange={e => setGarantia(e.target.value)} placeholder={cfg.facturaGarantia} /></Field>
          <Field label="Local">
            <Select value={local} onChange={e => setLocal(+e.target.value as 1 | 2)}>
              {cfg.local1activo && <option value={1}>{cfg.local1nombre}</option>}
              {cfg.local2activo && <option value={2}>{cfg.local2nombre}</option>}
            </Select>
          </Field>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-[var(--gold-dark)]/30 to-[var(--gold)]/10 border-[var(--gold)]/40">
          <div className="text-xs uppercase text-gray-400 tracking-widest">Factura actual</div>
          <div className="font-display text-5xl text-[var(--gold)]">{fmtFactura(num)}</div>
        </Card>
        <Btn onClick={finalizar} disabled={saving} className="w-full py-4 text-base"><Plus className="inline w-4 h-4 -mt-0.5" /> {saving ? "Guardando..." : "Finalizar venta"}</Btn>
        <Btn variant="ghost" onClick={imprimir} className="w-full">🖨 Imprimir factura</Btn>
        <Btn variant="ok" onClick={enviarWhatsapp} className="w-full"><MessageCircle className="inline w-4 h-4 -mt-0.5" /> Enviar factura WhatsApp</Btn>
        <Btn variant="danger" onClick={cancelar} className="w-full">❌ Cancelar venta</Btn>
        {ultimaVenta && (
          <Card>
            <div className="text-xs text-gray-400">Última venta:</div>
            <div className="font-display text-2xl text-[var(--gold)]">{ultimaVenta.factura}</div>
            <div className="text-sm">{fmtCOP(ultimaVenta.total)}</div>
          </Card>
        )}
      </div>
    </div>
  );
}
