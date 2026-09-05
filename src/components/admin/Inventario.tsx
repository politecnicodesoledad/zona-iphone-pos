import { useState, useMemo, useEffect } from "react";
import { useProductos, useOtros, useGastos, useVendidos, useConfig, uid } from "@/lib/zi/store";
import { fmtCOP, fmtDate } from "@/lib/zi/format";
import { Card, Btn, Input, Select, Textarea, Tabs, Field, Modal, Stat } from "./ui";
import type { Producto, Categoria, EstadoProducto, CostoOrigen, ColorOpt } from "@/lib/zi/types";
import { Trash2, Plus, RotateCcw, Edit, ImagePlus, Link as LinkIcon, Upload, Download } from "lucide-react";
import { GALERIA_IPHONE } from "@/lib/zi/galeria-iphone";
import { addCustomGallery, pullCustomGallery, readCustomGallery, removeCustomGallery } from "@/lib/zi/gallery-store";
import { exportarProductosExcel, exportarVendidosExcel } from "@/lib/zi/excel";

export function Inventario() {
  const [tab, setTab] = useState("productos");
  return (
    <div>
      <Tabs tabs={[
        { id: "productos", label: "📱 Productos" },
        { id: "accesorios", label: "🛒 Accesorios" },
        { id: "analisis", label: "💎 Análisis" },
        { id: "vendidos", label: "📦 Vendidos" },
      ]} active={tab} onChange={setTab} />
      {tab === "productos" && <ProductosTab modo="productos" />}
      {tab === "accesorios" && <ProductosTab modo="accesorios" />}
      {tab === "analisis" && <AnalisisTab />}
      {tab === "vendidos" && <VendidosTab />}
    </div>
  );
}

function emptyP(): Producto {
  return {
    id: "", nombre: "", categoria: "iphone", descripcion: "", estado: "nuevo",
    colores: [], imagen: "", precio: 0, costo: 0, stock: 1, local: 1,
    proveedor: "", imei: "", costoOrigen: "capital_aparte", creadoEn: Date.now(),
  };
}

function ProductosTab({ modo }: { modo: "productos" | "accesorios" }) {
  const [productos, setProductos] = useProductos();
  const [otros, setOtros] = useOtros();
  const [, setGastos] = useGastos();
  const data = modo === "productos" ? productos : otros;
  const setData = modo === "productos" ? setProductos : setOtros;
  const visibleData = data.filter(p => p.stock > 0);

  const [editing, setEditing] = useState<Producto | null>(null);
  const [open, setOpen] = useState(false);

  const totalStock = data.reduce((s, p) => s + p.stock, 0);
  const valorTotal = data.reduce((s, p) => s + p.costo * p.stock, 0);
  const gananciaPot = data.reduce((s, p) => s + (p.precio - p.costo) * p.stock, 0);

  function save(p: Producto) {
    const isNew = !p.id;
    const final = { ...p, id: p.id || uid() };
    if (isNew) {
      setData(prev => [...prev, final]);
      // si costoOrigen ganancia_neta → registrar gasto compra_inventario (auditoría)
      if (modo === "productos" && p.costoOrigen === "ganancia_neta" && p.costo > 0) {
        setGastos(prev => [...prev, {
          id: uid(), descripcion: `Compra inventario: ${p.nombre}`, monto: p.costo * p.stock,
          categoria: "Inventario", local: p.local, fecha: Date.now(), tipo: "compra_inventario",
        }]);
      }
    } else {
      setData(prev => prev.map(x => x.id === final.id ? final : x));
    }
    setOpen(false); setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="📦 Total en stock" value={totalStock} />
        <Stat label="💰 Valor inventario (costo)" value={fmtCOP(valorTotal)} />
        <Stat label="📈 Ganancia potencial" value={fmtCOP(gananciaPot)} color="#22c55e" />
      </div>

      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-xl text-[var(--gold)]">{modo === "productos" ? "Productos" : "Accesorios"}</h3>
          <div className="flex gap-2"><Btn variant="ghost" onClick={() => exportarProductosExcel(data, `${modo}-inventario.xls`)} disabled={data.length === 0}><Download className="inline w-3 h-3" /> Excel</Btn><Btn onClick={() => { setEditing(emptyP()); setOpen(true); }}><Plus className="inline w-3 h-3" /> Agregar</Btn></div>
        </div>
        {visibleData.length === 0 ? <p className="text-sm text-gray-500">Sin productos.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-gray-500 border-b border-[var(--line)]">
                <tr><th className="text-left py-2">Producto</th><th>Cat</th><th>Estado</th><th className="text-right">Stock</th><th className="text-right">Costo</th><th className="text-right">Precio</th><th className="text-right">Ganancia</th><th></th></tr>
              </thead>
              <tbody>
                {visibleData.map(p => (
                  <tr key={p.id} className="border-b border-[var(--line)]">
                    <td className="py-2"><div className="flex items-center gap-2">{p.imagen ? <img src={p.imagen} className="w-8 h-8 object-contain bg-[var(--mist)] rounded" /> : <span>📱</span>}<span>{p.nombre}</span></div></td>
                    <td className="text-xs text-gray-400 uppercase">{p.categoria}</td>
                    <td className="text-xs">{p.estado}</td>
                    <td className="text-right">{p.stock}</td>
                    <td className="text-right text-gray-400">{fmtCOP(p.costo)}</td>
                    <td className="text-right text-[var(--gold)]">{fmtCOP(p.precio)}</td>
                    <td className="text-right text-emerald-600">{fmtCOP(p.precio - p.costo)}</td>
                    <td className="text-right">
                      <button onClick={() => { setEditing(p); setOpen(true); }} className="text-blue-600 px-2"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm("¿Eliminar?")) setData(prev => prev.filter(x => x.id !== p.id)); }} className="text-red-600 px-2"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing?.id ? "Editar producto" : "Agregar producto"} size="xl">
        {editing && <ProductForm value={editing} onChange={setEditing} onSave={save} hideImei={modo === "accesorios"} />}
      </Modal>
    </div>
  );
}

function ProductForm({ value, onChange, onSave, hideImei }: { value: Producto; onChange: (p: Producto) => void; onSave: (p: Producto) => void; hideImei?: boolean }) {
  const [cfg] = useConfig();
  const [imageMode, setImageMode] = useState<"galeria" | "link" | "archivo">("galeria");
  const [galleryQ, setGalleryQ] = useState(value.nombre || "");
  const [customGallery, setCustomGallery] = useState(readCustomGallery());
  const [newImg, setNewImg] = useState({ modelo: "", color: "", url: "" });
  const ganancia = value.precio - value.costo;
  const margen = value.precio > 0 ? (ganancia / value.precio) * 100 : 0;
  const showImei = !hideImei && ["iphone", "ipad", "macbook"].includes(value.categoria);
  const galleryItems = [...customGallery, ...GALERIA_IPHONE].filter(g => `${g.modelo} ${g.color}`.toLowerCase().includes(galleryQ.toLowerCase())).slice(0, 24);

  useEffect(() => { pullCustomGallery().then(setCustomGallery); }, []);

  function addColor() {
    onChange({ ...value, colores: [...(value.colores || []), { nombre: "Color", hex: "#000000" }] });
  }
  function updateColor(i: number, c: Partial<ColorOpt>) {
    const arr = [...value.colores]; arr[i] = { ...arr[i], ...c }; onChange({ ...value, colores: arr });
  }
  function uploadImage(f: File) {
    const reader = new FileReader();
    reader.onload = () => onChange({ ...value, imagen: reader.result as string });
    reader.readAsDataURL(f);
  }
  async function addGalleryImage() {
    if (!newImg.modelo.trim() || !newImg.url.trim()) return alert("Escribe modelo y URL de imagen");
    await addCustomGallery({ modelo: newImg.modelo.trim(), color: newImg.color.trim(), url: newImg.url.trim() });
    setCustomGallery(readCustomGallery()); setNewImg({ modelo: "", color: "", url: "" });
  }
  async function delGalleryImage(id?: string) {
    if (!id || !confirm("¿Eliminar esta imagen de la galería personalizada?")) return;
    await removeCustomGallery(id); setCustomGallery(readCustomGallery());
  }

  return (
    <div className="grid xl:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-4 min-w-0">
      <h4 className="text-xs uppercase tracking-widest text-gray-500 border-b border-[var(--line)] pb-2">Datos básicos</h4>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Nombre"><Input value={value.nombre} onChange={e => { onChange({ ...value, nombre: e.target.value }); setGalleryQ(e.target.value); }} /></Field>
        <Field label="Categoría"><Select value={value.categoria} onChange={e => onChange({ ...value, categoria: e.target.value as Categoria })}>
          <option value="iphone">iPhone</option><option value="ipad">iPad</option><option value="macbook">MacBook</option>
          <option value="accesorio">Accesorios</option><option value="otro">Otro</option>
        </Select></Field>
        <Field label="Descripción / capacidad"><Input value={value.descripcion || ""} onChange={e => onChange({ ...value, descripcion: e.target.value })} /></Field>
        <Field label="Estado"><Select value={value.estado} onChange={e => onChange({ ...value, estado: e.target.value as EstadoProducto })}>
          <option value="nuevo">Nuevo</option><option value="usado">Usado</option><option value="promocion">Promoción</option>
          <option value="descuento">Descuento</option><option value="personalizado">Personalizado</option>
        </Select></Field>
        <Field label="Precio"><Input type="number" value={value.precio} onChange={e => onChange({ ...value, precio: +e.target.value || 0 })} /></Field>
        <Field label="Stock"><Input type="number" value={value.stock} onChange={e => onChange({ ...value, stock: +e.target.value || 0 })} /></Field>
        <Field label="Local"><Select value={value.local} onChange={e => onChange({ ...value, local: +e.target.value as 1 | 2 })}>{cfg.local1activo && <option value={1}>{cfg.local1nombre}</option>}{cfg.local2activo && <option value={2}>{cfg.local2nombre}</option>}</Select></Field>
      </div>

      <Field label="Imagen del producto">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--mist)] p-3">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {([{ id: "galeria", label: "Galería", Icon: ImagePlus }, { id: "archivo", label: "Archivo", Icon: Upload }, { id: "link", label: "Link", Icon: LinkIcon }] as const).map(({ id, label, Icon }) => (
              <button key={id} type="button" onClick={() => setImageMode(id)} className={`h-10 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${imageMode === id ? "bg-[var(--ink)] text-white" : "bg-white text-gray-600 border border-[var(--line)] hover:border-[var(--gold)]"}`}><Icon className="w-3.5 h-3.5" /> {label}</button>
            ))}
          </div>
          {imageMode === "link" && <Input value={value.imagen || ""} onChange={e => onChange({ ...value, imagen: e.target.value })} placeholder="https://..." />}
          {imageMode === "archivo" && <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--gold)] bg-white text-center text-xs text-gray-500 hover:bg-[var(--cream)]"><Upload className="mb-2 h-5 w-5 text-[var(--gold-dark)]" />Subir imagen desde archivos<input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} /></label>}
          {imageMode === "galeria" && <div className="space-y-3"><Input value={galleryQ} onChange={e => setGalleryQ(e.target.value)} placeholder="Buscar modelo/color" /><div className="grid md:grid-cols-[1fr_120px] gap-2"><Input value={newImg.modelo} onChange={e => setNewImg({ ...newImg, modelo: e.target.value })} placeholder="Modelo nuevo" /><Input value={newImg.color} onChange={e => setNewImg({ ...newImg, color: e.target.value })} placeholder="Color" /><Input value={newImg.url} onChange={e => setNewImg({ ...newImg, url: e.target.value })} placeholder="URL de imagen" className="md:col-span-1" /><Btn type="button" variant="ghost" onClick={addGalleryImage}>Agregar foto</Btn></div><div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">{galleryItems.map(g => { const customId = (g as any).id as string | undefined; return <div key={`${g.modelo}-${g.color}-${g.url}`} className="relative group"><button type="button" onClick={() => onChange({ ...value, imagen: g.url, nombre: value.nombre || g.modelo })} className={`w-full rounded-xl border bg-white p-2 text-left hover:border-[var(--gold)] hover:shadow-soft transition ${value.imagen === g.url ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/20" : "border-[var(--line)]"}`}><div className="h-16 w-full rounded-lg bg-[var(--mist)] flex items-center justify-center overflow-hidden"><img src={g.url} alt={`${g.modelo} ${g.color}`} className="h-full w-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} /><ImagePlus className="absolute h-6 w-6 text-gray-300" /></div><div className="mt-1 truncate text-[10px] font-bold">{g.modelo}</div><div className="truncate text-[9px] text-gray-500">{g.color}</div></button>{customId && <button type="button" onClick={() => delGalleryImage(customId)} className="absolute -right-1 -top-1 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow"><Trash2 className="h-3 w-3" /></button>}</div>; })}</div></div>}
        </div>
      </Field>

      <Field label="Colores disponibles">
        <div className="space-y-2">
          {value.colores.map((c, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="color" value={c.hex} onChange={e => updateColor(i, { hex: e.target.value })} className="w-10 h-9 rounded border border-[var(--line)]" />
              <Input value={c.nombre} onChange={e => updateColor(i, { nombre: e.target.value })} placeholder="Nombre" />
              <button onClick={() => onChange({ ...value, colores: value.colores.filter((_, idx) => idx !== i) })} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <Btn variant="ghost" onClick={addColor}>+ Agregar color</Btn>
        </div>
      </Field>

      <h4 className="text-xs uppercase tracking-widest text-gray-500 border-b border-[var(--line)] pb-2 mt-4">Info de compra</h4>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Proveedor"><Input value={value.proveedor || ""} onChange={e => onChange({ ...value, proveedor: e.target.value })} /></Field>
        <Field label="Costo de compra"><Input type="number" value={value.costo} onChange={e => onChange({ ...value, costo: +e.target.value || 0 })} /></Field>
        {showImei && (
          <Field label="📱 IMEI / Serial"><Input value={value.imei || ""} onChange={e => onChange({ ...value, imei: e.target.value })} /></Field>
        )}
        <Field label="Origen del costo">
          <Select value={value.costoOrigen} onChange={e => onChange({ ...value, costoOrigen: e.target.value as CostoOrigen })}>
            <option value="capital_aparte">📦 Capital aparte (no afecta ganancias)</option>
            <option value="ganancia_neta">📈 Salió de la ganancia neta</option>
          </Select>
        </Field>
      </div>
      {value.costoOrigen === "ganancia_neta" && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          ⚠️ Este costo se registrará en auditoría como `compra_inventario` (no se mezcla con gastos operativos).
        </div>
      )}

      </div>
      <aside className="xl:sticky xl:top-4 h-fit space-y-4">
      <Card className="bg-[var(--cream)] border-[var(--gold)]/40">
        <div className="aspect-[4/3] rounded-2xl bg-white border border-[var(--line)] mb-4 flex items-center justify-center p-5 overflow-hidden">
          {value.imagen ? <img src={value.imagen} alt={value.nombre} className="max-h-full object-contain" /> : <ImagePlus className="w-16 h-16 text-gray-300" />}
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-widest">Vista previa</div>
        <div className="font-bold text-[var(--ink)] mt-1">{value.nombre || "Producto sin nombre"}</div>
        <div className="font-display text-3xl text-[var(--gold)]">{fmtCOP(ganancia)} <span className="text-sm text-gray-500">({margen.toFixed(1)}%)</span></div>
        <div className="text-xs text-gray-500">Ganancia por unidad · Inversión {fmtCOP(value.costo * value.stock)}</div>
      </Card>

      <Btn onClick={() => onSave(value)} className="w-full py-3">💾 Guardar producto</Btn>
      </aside>
    </div>
  );
}

function AnalisisTab() {
  const [productos] = useProductos();
  const [filter, setFilter] = useState("todos");
  const cats: { id: string; label: string }[] = [
    { id: "todos", label: "Todos" }, { id: "iphone", label: "iPhone" }, { id: "ipad", label: "iPad" },
    { id: "macbook", label: "MacBook" }, { id: "accesorio", label: "Accesorios" },
  ];
  const list = filter === "todos" ? productos : productos.filter(p => p.categoria === filter);
  const resumen = useMemo(() => {
    const m = new Map<string, { count: number; costo: number; ganancia: number }>();
    productos.forEach(p => {
      const cur = m.get(p.categoria) || { count: 0, costo: 0, ganancia: 0 };
      cur.count += p.stock;
      cur.costo += p.costo * p.stock;
      cur.ganancia += (p.precio - p.costo) * p.stock;
      m.set(p.categoria, cur);
    });
    return [...m.entries()];
  }, [productos]);
  const maxCosto = Math.max(1, ...resumen.map(([, d]) => d.costo));

  return (
    <div className="space-y-4">
      <Tabs tabs={cats} active={filter} onChange={setFilter} />
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-display text-xl text-[var(--gold)] mb-3">Distribución por categoría</h3>
          {resumen.map(([k, d]) => (
            <div key={k} className="mb-2">
              <div className="flex justify-between text-xs"><span className="uppercase">{k}</span><span className="text-[var(--gold)]">{fmtCOP(d.costo)}</span></div>
              <div className="h-2 bg-[var(--mist)] rounded-full overflow-hidden mt-1"><div className="h-full bg-[var(--gold)]" style={{ width: `${(d.costo/maxCosto)*100}%` }} /></div>
            </div>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl text-[var(--gold)] mb-3">Resumen</h3>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-gray-500">
              <tr><th className="text-left">Cat.</th><th className="text-right">Unidades</th><th className="text-right">Costo</th><th className="text-right">Ganancia pot.</th></tr>
            </thead>
            <tbody>
              {resumen.map(([k, d]) => (
                <tr key={k} className="border-t border-[var(--line)]"><td className="py-1.5 uppercase">{k}</td><td className="text-right">{d.count}</td><td className="text-right text-gray-400">{fmtCOP(d.costo)}</td><td className="text-right text-emerald-600">{fmtCOP(d.ganancia)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <Card>
        <h3 className="font-display text-xl text-[var(--gold)] mb-3">Productos ({list.length})</h3>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase text-gray-500 border-b border-[var(--line)]"><tr><th className="text-left py-2">Nombre</th><th className="text-right">Stock</th><th className="text-right">Costo</th><th className="text-right">Precio</th><th className="text-right">Margen</th></tr></thead>
          <tbody>
            {list.map(p => { const g = p.precio - p.costo; const m = p.precio > 0 ? (g/p.precio)*100 : 0;
              return <tr key={p.id} className="border-b border-[var(--line)]"><td className="py-1.5">{p.nombre}</td><td className="text-right">{p.stock}</td><td className="text-right text-gray-400">{fmtCOP(p.costo)}</td><td className="text-right text-[var(--gold)]">{fmtCOP(p.precio)}</td><td className="text-right text-emerald-600">{m.toFixed(1)}%</td></tr>;
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function VendidosTab() {
  const [vendidos, setVendidos] = useVendidos();
  const [, setProductos] = useProductos();
  const [edit, setEdit] = useState<typeof vendidos[number] | null>(null);

  const total = vendidos.length;
  const ingresos = vendidos.reduce((s, v) => s + v.precio, 0);
  const ganancia = vendidos.reduce((s, v) => s + v.gananciaPotencial, 0);

  function restaurar(id: string) {
    const v = vendidos.find(x => x.id === id); if (!v) return;
    setProductos(prev => [...prev, { ...v.original, stock: 1 }]);
    setVendidos(prev => prev.filter(x => x.id !== id));
  }
  function restaurarTodos() {
    setProductos(prev => [...prev, ...vendidos.map(v => ({ ...v.original, stock: 1 }))]);
    setVendidos([]);
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Vendidos" value={total} />
        <Stat label="Ingresos generados" value={fmtCOP(ingresos)} />
        <Stat label="Ganancia generada" value={fmtCOP(ganancia)} color="#22c55e" />
      </div>
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-xl text-[var(--gold)]">Dispositivos vendidos</h3>
          <div className="flex gap-2">
            {vendidos.length > 0 && <Btn variant="ghost" onClick={() => exportarVendidosExcel(vendidos)}><Download className="inline w-3 h-3" /> Excel</Btn>}
            {vendidos.length > 0 && <Btn variant="ghost" onClick={restaurarTodos}><RotateCcw className="inline w-3 h-3" /> Restaurar todos</Btn>}
            {vendidos.length > 0 && <Btn variant="danger" onClick={() => { if (confirm("¿Vaciar vendidos?")) setVendidos([]); }}>🗑 Vaciar</Btn>}
          </div>
        </div>
        {vendidos.length === 0 ? <p className="text-sm text-gray-500">Sin dispositivos vendidos.</p> : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-gray-500 border-b border-[var(--line)]"><tr><th className="text-left py-2">Nombre</th><th>Cat.</th><th className="text-right">Costo</th><th className="text-right">Precio</th><th className="text-right">Ganancia</th><th>Archivo</th><th></th></tr></thead>
            <tbody>
              {vendidos.map(v => (
                <tr key={v.id} className="border-b border-[var(--line)]"><td className="py-2">{v.nombre}</td><td className="text-xs uppercase text-gray-400">{v.categoria}</td><td className="text-right text-gray-400">{fmtCOP(v.costo)}</td><td className="text-right text-[var(--gold)]">{fmtCOP(v.precio)}</td><td className="text-right text-emerald-600">{fmtCOP(v.gananciaPotencial)}</td><td className="text-xs text-gray-400">{fmtDate(v.fechaVenta || v.fechaArchivado)}</td><td className="text-right"><button onClick={() => setEdit(v)} className="text-[var(--gold)] px-2"><Edit className="w-4 h-4" /></button><button onClick={() => restaurar(v.id)} className="text-blue-600 px-2"><RotateCcw className="w-4 h-4" /></button></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Editar producto vendido" size="md">
        {edit && <div className="space-y-3"><Field label="Nombre"><Input value={edit.nombre} onChange={e => setEdit({ ...edit, nombre: e.target.value })} /></Field><Field label="Cantidad"><Input type="number" value={edit.cantidad || 1} onChange={e => setEdit({ ...edit, cantidad: Math.max(1, +e.target.value || 1) })} /></Field><Field label="Detalle extra"><Input value={edit.detalleExtra || ""} onChange={e => setEdit({ ...edit, detalleExtra: e.target.value })} placeholder="Color, IMEI, capacidad, estado..." /></Field><Field label="Observaciones"><Textarea rows={3} value={edit.observaciones || ""} onChange={e => setEdit({ ...edit, observaciones: e.target.value })} /></Field><Btn className="w-full" onClick={() => { setVendidos(prev => prev.map(v => v.id === edit.id ? edit : v)); setEdit(null); }}>💾 Guardar vendido</Btn></div>}
      </Modal>
    </div>
  );
}
