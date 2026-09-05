import { useState, useMemo } from "react";
import { useProductos, useOtros, useVentas, useFacturaNum, useConfig, useVendidos, useSession, Store, uid, fmtFactura } from "@/lib/zi/store";
import { fmtCOP } from "@/lib/zi/format";
import { facturaWhatsappText, generarFacturaPDF } from "@/lib/zi/pdf";
import { Card, Btn, Input, Select, Textarea, Field } from "./ui";
import type { VentaProducto, Venta, Producto } from "@/lib/zi/types";
import { Trash2, Search, Plus, MessageCircle, ChevronDown, ShieldCheck } from "lucide-react";

interface Item extends VentaProducto { id: string; precioBase: number; }

// Sección compacta y colapsable — todo lo que no se esté usando queda oculto.
function Section({ title, subtitle, defaultOpen = true, children }: { title: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="!p-0 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
        <div>
          <h3 className="font-display text-lg text-[var(--ink)] leading-none">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-[var(--line)]">{children}</div>}
    </Card>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--line)] bg-white text-sm font-medium text-gray-600 cursor-pointer hover:border-[var(--gold)] has-[:checked]:border-[var(--gold)] has-[:checked]:bg-[var(--cream)] has-[:checked]:text-[var(--ink)] transition">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-[var(--gold-dark)]" />
      {label}
    </label>
  );
}

export function NuevaVenta({ retroMode = false }: { retroMode?: boolean }) {
  const [productos] = useProductos();
  const [otros] = useOtros();
  const [, setVentas] = useVentas();
  const [num, setNum] = useFacturaNum();
  const [cfg] = useConfig();
  const { profile } = useSession();

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("todos");
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);

  // Datos adicionales — solo aparecen cuando el usuario los selecciona.
  const [showImei, setShowImei] = useState(false);
  const [showCedula, setShowCedula] = useState(false);
  const [showCelular, setShowCelular] = useState(false);
  const [showDireccion, setShowDireccion] = useState(false);
  const [showRapida, setShowRapida] = useState(false);

  const [imei, setImei] = useState("");
  const [cNombre, setCNombre] = useState("");
  const [cCedula, setCCedula] = useState("");
  const [cTel, setCTel] = useState("");
  const [cDireccion, setCDireccion] = useState("");

  const [quickNombre, setQuickNombre] = useState("");
  const [quickCosto, setQuickCosto] = useState(0);
  const [quickPrecio, setQuickPrecio] = useState(0);
  const [quickStock, setQuickStock] = useState(1);

  const [tipoPago, setTipoPago] = useState<"contado" | "credito" | "tradein">("contado");
  const [empresaCredito, setEmpresaCredito] = useState("");
  const [metodo, setMetodo] = useState<"efectivo" | "nequi" | "transferencia" | "datafono">("efectivo");
  const [recibido, setRecibido] = useState(0);
  const [descuentoOrden, setDescuentoOrden] = useState(0);
  const [local, setLocal] = useState<1 | 2>(1);

  // crédito (cuotas)
  const [cInicial, setCInicial] = useState(0);
  const [cCuotas, setCCuotas] = useState(3);
  // celular como parte de pago
  const [tMarca, setTMarca] = useState("");
  const [tModelo, setTModelo] = useState("");
  const [tImei, setTImei] = useState("");
  const [tValor, setTValor] = useState(0);
  const [tMetodo, setTMetodo] = useState<"efectivo" | "nequi" | "transferencia" | "datafono">("efectivo");

  const [obs, setObs] = useState("");
  const [garantiaMeses, setGarantiaMeses] = useState<0 | 6 | 12>(0);
  const [ultimaVenta, setUltima] = useState<Venta | null>(null);
  const [fechaFactura, setFechaFactura] = useState(() => new Date().toISOString().slice(0, 16));
  const [pinFecha, setPinFecha] = useState("");

  const disponibles = useMemo(() => [...productos, ...otros].filter(p => p.stock > 0), [productos, otros]);
  const categoriasDisponibles = useMemo(() => {
    const set = new Set(disponibles.map(p => p.categoria));
    return Array.from(set);
  }, [disponibles]);
  const matches = useMemo(() => {
    let base = disponibles;
    if (catFilter !== "todos") base = base.filter(p => p.categoria === catFilter);
    if (search) base = base.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));
    return base.slice(0, 100);
  }, [disponibles, search, catFilter]);

  const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0);
  const descuentoItems = items.reduce((s, i) => s + (i.descuento || 0), 0);
  const total = Math.max(0, itemsTotal - descuentoOrden);
  const cambio = Math.max(0, recibido - total);
  const faltante = Math.max(0, total - recibido);
  const cValorCuota = cCuotas > 0 ? (total - cInicial) / cCuotas : 0;
  const tRestante = total - tValor;
  const vencimientoPreview = garantiaMeses > 0
    ? new Date(new Date().setMonth(new Date().getMonth() + garantiaMeses)).toLocaleDateString("es-CO")
    : null;

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
    if (!profile) { alert("No se detectó tu sesión. Vuelve a iniciar sesión."); return; }
    if (!cNombre.trim()) { alert("El nombre del cliente es obligatorio."); return; }
    const requiereCliente = tipoPago === "credito" || tipoPago === "tradein";
    if (requiereCliente && (!cNombre.trim() || !cTel.trim() || !cCedula.trim())) {
      alert("Para crédito o celular como parte de pago debes registrar nombre, teléfono y cédula del cliente."); return;
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
    const garantiaVencimiento = garantiaMeses > 0
      ? new Date(new Date(fechaVenta).setMonth(new Date(fechaVenta).getMonth() + garantiaMeses)).getTime()
      : undefined;
    const nombreAsesor = `${profile.nombre} ${profile.apellido}`.trim();
    const venta: Venta = {
      id: uid(), factura, fecha: fechaVenta, registradaEn: Date.now(), fechaManual: retroMode,
      tipo: tipoPago, local,
      asesor: nombreAsesor, asesorId: profile.id,
      productos: items.map(({ id: _id, precioBase: _pb, ...rest }) => rest),
      total, descuentoTotal: descuentoItems, descuentoOrden,
      observaciones: obs, garantia: cfg.facturaGarantia,
      garantiaMeses: garantiaMeses || undefined, garantiaVencimiento,
      ...(showImei && imei.trim() && { imei: imei.trim() }),
      cliente: {
        nombre: cNombre.trim(),
        ...(showCedula && { cedula: cCedula.trim() }),
        ...(showCelular && { telefono: cTel.trim() }),
        ...(showDireccion && { direccion: cDireccion.trim() }),
      },
      ...(tipoPago === "contado" && { metodoPago: metodo, recibido }),
      ...(tipoPago === "credito" && {
        cliente: { nombre: cNombre, cedula: cCedula, telefono: cTel, ...(showDireccion && { direccion: cDireccion }) },
        empresaCredito: empresaCredito.trim() || undefined,
        creditoCuotas: cCuotas, creditoCuotaInicial: cInicial, creditoValorCuota: cValorCuota,
      }),
      ...(tipoPago === "tradein" && {
        cliente: { nombre: cNombre, cedula: cCedula, telefono: cTel, ...(showDireccion && { direccion: cDireccion }) },
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
    setUltima(venta);
    // reset
    setItems([]); setObs(""); setGarantiaMeses(0); setRecibido(0); setPinFecha(""); setFechaFactura(new Date().toISOString().slice(0, 16));
    setCNombre(""); setCCedula(""); setCTel(""); setCDireccion(""); setImei(""); setDescuentoOrden(0); setEmpresaCredito("");
    setCInicial(0); setCCuotas(3);
    setTMarca(""); setTModelo(""); setTImei(""); setTValor(0);
    setShowImei(false); setShowCedula(false); setShowCelular(false); setShowDireccion(false); setShowRapida(false);
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
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-3">
        <Section title="1. Productos" subtitle={`${items.length} en el carrito`}>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Categoría">
              <Select value={catFilter} onChange={e => { setCatFilter(e.target.value); setSelectedId(""); }}>
                <option value="todos">Todas las categorías</option>
                {categoriasDisponibles.includes("iphone") && <option value="iphone">📱 iPhone</option>}
                {categoriasDisponibles.includes("ipad") && <option value="ipad">📲 iPad</option>}
                {categoriasDisponibles.includes("macbook") && <option value="macbook">💻 MacBook</option>}
                {categoriasDisponibles.includes("accesorio") && <option value="accesorio">🎧 Accesorios</option>}
                {categoriasDisponibles.includes("otro") && <option value="otro">📦 Otros</option>}
              </Select>
            </Field>
            <Field label="Buscar producto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre del producto..." className="pl-9" />
              </div>
            </Field>
          </div>

          <div className="mt-3 grid md:grid-cols-[1fr_auto] gap-2 items-end">
            <Field label={`Producto (${matches.length} disponibles)`}>
              <Select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                <option value="">Selecciona un producto...</option>
                {matches.map(p => <option key={p.id} value={p.id}>{p.nombre} · {p.stock} disp. · {fmtCOP(p.precio)}</option>)}
              </Select>
            </Field>
            <Btn type="button" variant="ink" onClick={addSelected} className="h-10"><Plus className="w-4 h-4 inline" /> Agregar</Btn>
          </div>

          <div className="mt-3">
            <Checkbox label="Venta rápida (producto sin inventario)" checked={showRapida} onChange={setShowRapida} />
          </div>
          {showRapida && (
            <div className="mt-3 grid md:grid-cols-5 gap-2 items-end bg-[var(--cream)]/60 border border-[var(--gold)]/30 rounded-xl p-3">
              <Field label="Nombre"><Input value={quickNombre} onChange={e => setQuickNombre(e.target.value)} placeholder="Ej: iPhone pedido" /></Field>
              <Field label="Costo"><Input type="number" value={quickCosto} onChange={e => setQuickCosto(+e.target.value || 0)} /></Field>
              <Field label="Precio"><Input type="number" value={quickPrecio} onChange={e => setQuickPrecio(+e.target.value || 0)} /></Field>
              <Field label="Cant."><Input type="number" min={1} value={quickStock} onChange={e => setQuickStock(Math.max(1, +e.target.value || 1))} /></Field>
              <Btn variant="ink" onClick={addQuick} className="h-10">Agregar</Btn>
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-3">
              {items.map(i => {
                const ganancia = i.precioUnitario - i.costo;
                return (
                  <div key={i.id} className="border border-[var(--line)] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm">{i.nombre}</div>
                      <button onClick={() => removeItem(i.id)} className="text-red-600 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      <Field label="Precio unit."><Input type="number" value={i.precioUnitario} onChange={e => updateItem(i.id, { precioUnitario: +e.target.value || 0 })} /></Field>
                      <Field label="Cantidad"><Input type="number" min={1} value={i.cantidad} onChange={e => updateItem(i.id, { cantidad: Math.max(1, +e.target.value || 1) })} /></Field>
                      <Field label="Descuento ítem"><Input type="number" value={i.descuento || 0} onChange={e => updateItem(i.id, { descuento: +e.target.value || 0 })} /></Field>
                      <Field label="Subtotal"><div className="px-3 py-2 font-display text-xl text-[var(--gold)]">{fmtCOP(i.subtotal)}</div></Field>
                    </div>
                    {profile?.rol === "admin" && (
                      <div className={`text-xs mt-1 ${ganancia >= 0 ? "text-emerald-600" : "text-red-600"}`}>Ganancia: {fmtCOP(ganancia)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="2. Cliente" subtitle="El nombre es obligatorio para toda venta">
          <Field label="Nombre del cliente (obligatorio)">
            <Input value={cNombre} onChange={e => setCNombre(e.target.value)} placeholder="Nombre de quien compra" required />
          </Field>
          <div className="flex flex-wrap gap-2 mt-3">
            <Checkbox label="IMEI" checked={showImei} onChange={setShowImei} />
            <Checkbox label="Cédula" checked={showCedula} onChange={setShowCedula} />
            <Checkbox label="Número de celular" checked={showCelular} onChange={setShowCelular} />
            <Checkbox label="Dirección" checked={showDireccion} onChange={setShowDireccion} />
          </div>
          {(showImei || showCedula || showCelular || showDireccion) && (
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              {showImei && <Field label="IMEI del producto"><Input value={imei} onChange={e => setImei(e.target.value)} placeholder="Ej: 353454545454545" /></Field>}
              {showCedula && <Field label="Cédula del cliente"><Input value={cCedula} onChange={e => setCCedula(e.target.value.replace(/\D/g, ""))} placeholder="1.234.567.890" /></Field>}
              {showCelular && <Field label="Número de celular"><Input value={cTel} onChange={e => setCTel(e.target.value.replace(/\D/g, ""))} placeholder="300 123 4567" /></Field>}
              {showDireccion && <Field label="Dirección de entrega"><Input value={cDireccion} onChange={e => setCDireccion(e.target.value)} placeholder="Calle 123 #45-67" /></Field>}
            </div>
          )}
        </Section>

        <Section title="3. Garantía" subtitle="Aplica a todos los productos de esta venta" defaultOpen={false}>
          <div className="grid md:grid-cols-2 gap-3 items-end">
            <Field label="Duración de garantía">
              <Select value={garantiaMeses} onChange={e => setGarantiaMeses(+e.target.value as 0 | 6 | 12)}>
                <option value={0}>Sin garantía</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
              </Select>
            </Field>
            {vencimientoPreview && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0" /> Vence el {vencimientoPreview}
              </div>
            )}
          </div>
        </Section>

        {retroMode && (
          <Section title="Venta con fecha manual" subtitle="Solo para registrar ventas atrasadas">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Fecha real"><Input type="date" value={fechaFactura.slice(0, 10)} onChange={e => setFechaFactura(`${e.target.value}${fechaFactura.slice(10) || "T12:00"}`)} /></Field>
              <Field label="Hora"><Input type="time" value={(fechaFactura.split("T")[1] || "12:00").slice(0, 5)} onChange={e => setFechaFactura(`${fechaFactura.slice(0, 10)}T${e.target.value}`)} /></Field>
              <Field label="PIN requerido"><Input type="password" maxLength={4} value={pinFecha} onChange={e => setPinFecha(e.target.value.replace(/\D/g, ""))} placeholder="0011" /></Field>
            </div>
          </Section>
        )}

        <Section title="4. Información de pago">
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Tipo de venta">
              <Select value={tipoPago} onChange={e => setTipoPago(e.target.value as never)}>
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
                <option value="tradein">Celular como parte de pago</option>
              </Select>
            </Field>
            <Field label="Forma de pago">
              <Select value={metodo} onChange={e => setMetodo(e.target.value as never)}>
                <option value="efectivo">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="transferencia">Transferencia</option>
                <option value="datafono">Datáfono</option>
              </Select>
            </Field>
            <Field label="Descuento (monto)"><Input type="number" value={descuentoOrden} onChange={e => setDescuentoOrden(Math.max(0, +e.target.value || 0))} placeholder="$ 0" /></Field>
          </div>

          {tipoPago === "credito" && (
            <div className="grid md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[var(--line)]">
              <Field label="Empresa de crédito"><Input value={empresaCredito} onChange={e => setEmpresaCredito(e.target.value)} placeholder="Ej: Addi, Sistecrédito..." /></Field>
              <Field label="Cuota inicial"><Input type="number" value={cInicial} onChange={e => setCInicial(+e.target.value || 0)} /></Field>
              <Field label="# Cuotas"><Input type="number" min={1} value={cCuotas} onChange={e => setCCuotas(Math.max(1, +e.target.value))} /></Field>
              <Field label="Valor por cuota"><div className="px-3 py-2 text-[var(--gold)] font-bold">{fmtCOP(cValorCuota)}</div></Field>
            </div>
          )}
          {tipoPago === "tradein" && (
            <div className="grid md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[var(--line)]">
              <Field label="Marca del cel"><Input value={tMarca} onChange={e => setTMarca(e.target.value)} /></Field>
              <Field label="Modelo"><Input value={tModelo} onChange={e => setTModelo(e.target.value)} /></Field>
              <Field label="IMEI (opcional)"><Input value={tImei} onChange={e => setTImei(e.target.value)} /></Field>
              <Field label="Valor del cel"><Input type="number" value={tValor} onChange={e => setTValor(+e.target.value || 0)} /></Field>
              <Field label="Restante"><div className="px-3 py-2 text-[var(--gold)] font-bold">{fmtCOP(tRestante)}</div></Field>
              <Field label="Método restante"><Select value={tMetodo} onChange={e => setTMetodo(e.target.value as never)}>
                <option value="efectivo">Efectivo</option><option value="nequi">Nequi</option>
                <option value="transferencia">Transferencia</option><option value="datafono">Datáfono</option>
              </Select></Field>
            </div>
          )}
          {(tipoPago === "credito" || tipoPago === "tradein") && !showCelular && !showCedula && (
            <p className="text-[11px] text-amber-600 mt-2">Para crédito o celular como pago necesitas registrar cédula y celular del cliente — actívalos en "2. Datos adicionales".</p>
          )}
        </Section>

        <Section title="Notas y local" defaultOpen={false}>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Observaciones"><Textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Notas internas..." /></Field>
            <Field label="Local">
              <Select value={local} onChange={e => setLocal(+e.target.value as 1 | 2)}>
                {cfg.local1activo && <option value={1}>{cfg.local1nombre}</option>}
                {cfg.local2activo && <option value={2}>{cfg.local2nombre}</option>}
              </Select>
            </Field>
          </div>
        </Section>
      </div>

      <div className="space-y-3 lg:sticky lg:top-20 self-start">
        <Card className="bg-gradient-to-br from-[var(--gold-dark)]/30 to-[var(--gold)]/10 border-[var(--gold)]/40">
          <div className="text-xs uppercase text-gray-400 tracking-widest">Factura actual</div>
          <div className="font-display text-4xl text-[var(--gold)]">{fmtFactura(num)}</div>
          <div className="text-xs text-gray-500 mt-1">Vendedor: {profile?.nombre} {profile?.apellido}</div>
        </Card>

        <Card>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{fmtCOP(itemsTotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Descuento</span><span className="text-red-600">− {fmtCOP(descuentoOrden + descuentoItems)}</span></div>
            <div className="flex justify-between items-center pt-1 border-t border-[var(--line)]"><span className="text-sm text-gray-400 uppercase tracking-widest">Total</span><span className="font-display text-3xl text-[var(--gold)]">{fmtCOP(total)}</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--line)] space-y-2">
            <Field label="Dinero recibido"><Input type="number" value={recibido} onChange={e => setRecibido(+e.target.value || 0)} /></Field>
            {recibido >= total ? (
              <div className="flex justify-between text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"><span className="text-emerald-700 font-semibold">Cambio a entregar</span><span className="font-bold text-emerald-700">{fmtCOP(cambio)}</span></div>
            ) : recibido > 0 ? (
              <div className="flex justify-between text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2"><span className="text-red-600 font-semibold">Falta por pagar</span><span className="font-bold text-red-600">{fmtCOP(faltante)}</span></div>
            ) : null}
          </div>
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
