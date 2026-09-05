import { useState, useMemo } from "react";
import { useProductos, useOtros } from "@/lib/zi/store";
import { fmtCOP } from "@/lib/zi/format";
import { Card, Input, Select, Field, Modal } from "./ui";
import { Search, Smartphone } from "lucide-react";
import type { Producto } from "@/lib/zi/types";

const CATEGORIA_LABEL: Record<string, string> = {
  iphone: "iPhone", ipad: "iPad", macbook: "MacBook", accesorio: "Accesorio", otro: "Otro",
};
const ESTADO_LABEL: Record<string, string> = {
  nuevo: "Nuevo", usado: "Usado", promocion: "Promoción", descuento: "Descuento", personalizado: "Personalizado",
};

// Catálogo de solo lectura para el ASESOR: qué hay disponible y a qué precio
// se vende. Nunca costo ni margen — eso sigue siendo exclusivo de Inventario
// (admin). Sin imágenes ni tarjetas grandes: una lista compacta, filtrable,
// y el detalle completo del equipo se ve al seleccionarlo (no todo abierto
// a la vez).
export function ProductosAsesor() {
  const [productos] = useProductos();
  const [otros] = useOtros();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [detail, setDetail] = useState<Producto | null>(null);

  const todos = useMemo(() => [...productos, ...otros], [productos, otros]);
  const categorias = useMemo(() => Array.from(new Set(todos.map(p => p.categoria))), [todos]);
  const filtrados = useMemo(() => {
    let base = todos;
    if (cat !== "todos") base = base.filter(p => p.categoria === cat);
    if (estado !== "todos") base = base.filter(p => p.estado === estado);
    if (search) {
      const s = search.trim().toLowerCase();
      base = base.filter(p => p.nombre.toLowerCase().includes(s) || (p.imei || "").toLowerCase().includes(s));
    }
    return base.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [todos, search, cat, estado]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-3">
          <Field label="Buscar">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o código..." className="pl-9 w-56" />
            </div>
          </Field>
          <Field label="Categoría">
            <Select value={cat} onChange={e => setCat(e.target.value)} className="w-40">
              <option value="todos">Todas</option>
              {categorias.map(c => <option key={c} value={c}>{CATEGORIA_LABEL[c] || c}</option>)}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={estado} onChange={e => setEstado(e.target.value)} className="w-40">
              <option value="todos">Todos</option>
              {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {filtrados.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No hay equipos que coincidan con la búsqueda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-gray-500 bg-[var(--mist)]">
                <tr>
                  <th className="text-left px-4 py-3">Equipo</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Categoría</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Estado</th>
                  <th className="text-right px-4 py-3">Stock</th>
                  <th className="text-right px-4 py-3">Precio</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id} onClick={() => setDetail(p)} className="border-t border-[var(--line)] hover:bg-[var(--mist)] cursor-pointer">
                    <td className="px-4 py-3 font-medium text-[var(--ink)]">{p.nombre}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-500">{CATEGORIA_LABEL[p.categoria] || p.categoria}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">{ESTADO_LABEL[p.estado] || p.estado}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${p.stock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        {p.stock > 0 ? p.stock : "Agotado"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-display text-[var(--gold-dark)]">{fmtCOP(p.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.nombre} size="md">
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Smartphone className="w-5 h-5" />
              <span className="text-xs uppercase tracking-widest">{CATEGORIA_LABEL[detail.categoria] || detail.categoria} · {ESTADO_LABEL[detail.estado] || detail.estado}</span>
            </div>

            {detail.descripcion && <p className="text-sm text-gray-600">{detail.descripcion}</p>}

            <div className="grid grid-cols-2 gap-3 text-sm bg-[var(--mist)] rounded-xl p-3">
              <div><div className="text-xs text-gray-400">Stock disponible</div>
                <div className={`font-semibold ${detail.stock > 0 ? "text-emerald-600" : "text-red-600"}`}>{detail.stock > 0 ? `${detail.stock} unidad(es)` : "Agotado"}</div>
              </div>
              <div><div className="text-xs text-gray-400">Precio de venta</div><div className="font-display text-xl text-[var(--gold)]">{fmtCOP(detail.precio)}</div></div>
              {detail.imei && <div className="col-span-2"><div className="text-xs text-gray-400">IMEI / Serial</div><div className="font-mono text-xs">{detail.imei}</div></div>}
            </div>

            {detail.colores?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Colores disponibles</div>
                <div className="flex flex-wrap gap-2">
                  {detail.colores.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-white border border-[var(--line)] rounded-full px-2.5 py-1">
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.hex }} /> {c.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail.variantes && detail.variantes.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Capacidades</div>
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase text-gray-400">
                    <tr><th className="text-left py-1">Capacidad</th><th className="text-right">Precio</th><th className="text-right">Stock</th></tr>
                  </thead>
                  <tbody>
                    {detail.variantes.map(v => (
                      <tr key={v.id} className="border-t border-[var(--line)]">
                        <td className="py-1.5">{v.capacidad}</td>
                        <td className="text-right text-[var(--gold-dark)]">{fmtCOP(v.precio)}</td>
                        <td className="text-right">{v.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
