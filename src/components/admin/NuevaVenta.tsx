import { useState, useMemo } from "react";
import { useProductos, useVentas, useGastos, useClientes, useFacturaNum, useConfig, useVendidos, Store, uid, fmtFactura } from "@/lib/zi/store";
import { fmtCOP } from "@/lib/zi/format";
import { generarFacturaPDF } from "@/lib/zi/pdf";
import { Card, Btn, Input, Select, Textarea, Tabs, Field } from "./ui";
import type { VentaProducto, Venta, Producto } from "@/lib/zi/types";
import { Trash2, Search, Plus } from "lucide-react";

interface Item extends VentaProducto { id: string; precioBase: number; }

export function NuevaVenta() {
  const [productos] = useProductos();
  const [, setVentas] = useVentas();
  const [, setGastos] = useGastos();
  const [, setClientes] = useClientes();
  const [num, setNum] = useFacturaNum();
  const [cfg] = useConfig();

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Item[]>([]);
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
  const [ultimaVenta, setUltima] = useState<Venta | null>(null);

  const matches = useMemo(() => search ? productos.filter(p => p.stock > 0 && p.nombre.toLowerCase().includes(search.toLowerCase())).slice(0, 6) : [], [productos, search]);
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const cValorCuota = cCuotas > 0 ? (total - cInicial) / cCuotas : 0;
  const tRestante = total - tValor;

  function add(p: Producto) {
    setItems(prev => [...prev, {
      id: uid(), productoId: p.id, nombre: p.nombre, cantidad: 1,
      precioUnitario: p.precio, precioBase: p.precio, costo: p.costo, subtotal: p.precio,
    }]);
    setSearch("");
  }
  function updateItem(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch, subtotal: (patch.precioUnitario ?? i.precioUnitario) * (patch.cantidad ?? i.cantidad) } : i));
  }
  function removeItem(id: string) { setItems(prev => prev.filter(i => i.id !== id)); }

  function finalizar() {
    if (items.length === 0) { alert("Agrega al menos un producto"); return; }
    const factura = fmtFactura(num);
    const venta: Venta = {
      id: uid(), factura, fecha: Date.now(), tipo: tipoPago, local, asesor,
      productos: items.map(({ id: _id, precioBase: _pb, ...rest }) => rest),
      total, observaciones: obs,
      ...(tipoPago === "contado" && { metodoPago: metodo, recibido }),
      ...(tipoPago === "credito" && {
        cliente: { nombre: cNombre, cedula: cCedula, telefono: cTel },
        creditoCuotas: cCuotas, creditoCuotaInicial: cInicial, creditoValorCuota: cValorCuota,
      }),
      ...(tipoPago === "tradein" && {
        cliente: { nombre: cNombre },
        tradeIn: { marca: tMarca, modelo: tModelo, imei: tImei, valor: tValor, restante: tRestante, metodoRestante: tMetodo },
      }),
    };
    // descontar stock + archivar si llega a 0
    const ps = Store.productos();
    const vendidosArr = Store.vendidos();
    const psNew = [...ps];
    items.forEach(it => {
      const idx = psNew.findIndex(p => p.id === it.productoId);
      if (idx >= 0) {
        psNew[idx] = { ...psNew[idx], stock: Math.max(0, psNew[idx].stock - it.cantidad) };
        if (psNew[idx].stock <= 0) {
          const p = psNew[idx];
          vendidosArr.push({
            id: uid(), nombre: p.nombre, categoria: p.categoria, costo: p.costo, precio: p.precio,
            gananciaPotencial: (p.precio - p.costo), fechaArchivado: Date.now(), original: p,
          });
          psNew.splice(idx, 1);
        }
      }
    });
    Store.setProductos(psNew);
    Store.setVendidos(vendidosArr);

    setVentas(prev => [...prev, venta]);
    setNum(num + 1);

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
    setItems([]); setObs(""); setRecibido(0);
    setCNombre(""); setCCedula(""); setCTel(""); setCInicial(0); setCCuotas(3);
    setTMarca(""); setTModelo(""); setTImei(""); setTValor(0);
    alert(`Venta ${factura} guardada ✓`);
  }

  function imprimir() {
    if (!ultimaVenta) return alert("Primero finaliza una venta");
    generarFacturaPDF(ultimaVenta, cfg);
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
          {matches.length > 0 && (
            <div className="mt-2 border border-white/10 rounded-lg divide-y divide-white/5">
              {matches.map(p => (
                <button key={p.id} onClick={() => add(p)} className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex justify-between items-center">
                  <span>{p.nombre} <span className="text-gray-500 text-xs">({p.stock} disp.)</span></span>
                  <span className="text-[var(--gold)] font-display text-lg">{fmtCOP(p.precio)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-display text-xl text-[var(--gold)] mb-3">Carrito ({items.length})</h3>
          {items.length === 0 ? <p className="text-sm text-gray-500">No hay productos agregados.</p> : (
            <div className="space-y-3">
              {items.map(i => {
                const ganancia = i.precioUnitario - i.costo;
                const margen = i.precioUnitario > 0 ? (ganancia / i.precioUnitario) * 100 : 0;
                return (
                  <div key={i.id} className="border border-white/10 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm">{i.nombre}</div>
                      <button onClick={() => removeItem(i.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Field label="Precio unit."><Input type="number" value={i.precioUnitario} onChange={e => updateItem(i.id, { precioUnitario: +e.target.value || 0 })} /></Field>
                      <Field label="Cantidad"><Input type="number" min={1} value={i.cantidad} onChange={e => updateItem(i.id, { cantidad: Math.max(1, +e.target.value || 1) })} /></Field>
                      <Field label="Subtotal"><div className="px-3 py-2 font-display text-2xl text-[var(--gold)]">{fmtCOP(i.subtotal)}</div></Field>
                    </div>
                    <div className={`text-xs mt-1 ${ganancia >= 0 ? "text-green-400" : "text-red-400"}`}>
                      Ganancia: {fmtCOP(ganancia)} ({margen.toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 border-t border-white/10 pt-3 flex justify-between items-center">
            <span className="text-sm text-gray-400 uppercase tracking-widest">Total</span>
            <span className="font-display text-4xl text-[var(--gold)]">{fmtCOP(total)}</span>
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
              <Field label="Nombre"><Input value={cNombre} onChange={e => setCNombre(e.target.value)} /></Field>
              <Field label="Cédula"><Input value={cCedula} onChange={e => setCCedula(e.target.value)} /></Field>
              <Field label="Teléfono"><Input value={cTel} onChange={e => setCTel(e.target.value.replace(/\D/g,""))} /></Field>
              <Field label="Cuota inicial"><Input type="number" value={cInicial} onChange={e => setCInicial(+e.target.value || 0)} /></Field>
              <Field label="# Cuotas"><Input type="number" min={1} value={cCuotas} onChange={e => setCCuotas(Math.max(1, +e.target.value))} /></Field>
              <Field label="Valor por cuota"><div className="px-3 py-2 text-[var(--gold)] font-bold">{fmtCOP(cValorCuota)}</div></Field>
              <Field label="Asesor"><Input value={asesor} onChange={e => setAsesor(e.target.value)} /></Field>
            </div>
          )}
          {tipoPago === "tradein" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cliente"><Input value={cNombre} onChange={e => setCNombre(e.target.value)} /></Field>
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
          <Field label="Observaciones / Garantía"><Textarea rows={3} value={obs} onChange={e => setObs(e.target.value)} /></Field>
          <Field label="Local">
            <Select value={local} onChange={e => setLocal(+e.target.value as 1 | 2)}>
              <option value={1}>{cfg.local1nombre}</option>
              <option value={2}>{cfg.local2nombre}</option>
            </Select>
          </Field>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-[var(--gold-dark)]/30 to-[var(--gold)]/10 border-[var(--gold)]/40">
          <div className="text-xs uppercase text-gray-400 tracking-widest">Factura actual</div>
          <div className="font-display text-5xl text-[var(--gold)]">{fmtFactura(num)}</div>
        </Card>
        <Btn onClick={finalizar} className="w-full py-4 text-base"><Plus className="inline w-4 h-4 -mt-0.5" /> Finalizar venta</Btn>
        <Btn variant="ghost" onClick={imprimir} className="w-full">🖨 Imprimir factura</Btn>
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
