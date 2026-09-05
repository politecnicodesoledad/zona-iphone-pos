import { useState, useMemo } from "react";
import { useProductos, useOtros } from "@/lib/zi/store";
import { fmtCOP } from "@/lib/zi/format";
import { Card, Input, Select, Field } from "./ui";
import { Search, Package } from "lucide-react";

// Catálogo de solo lectura para el ASESOR: puede consultar qué hay
// disponible y a qué precio se vende, pero nunca costo, margen ni
// controles de edición — eso sigue siendo exclusivo de Inventario (admin).
export function ProductosAsesor() {
  const [productos] = useProductos();
  const [otros] = useOtros();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("todos");

  const todos = useMemo(() => [...productos, ...otros], [productos, otros]);
  const categorias = useMemo(() => Array.from(new Set(todos.map(p => p.categoria))), [todos]);
  const filtrados = useMemo(() => {
    let base = todos;
    if (cat !== "todos") base = base.filter(p => p.categoria === cat);
    if (search) base = base.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));
    return base.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [todos, search, cat]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Field label="Buscar">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre del producto..." className="pl-9" />
          </div>
        </Field>
        <Field label="Categoría">
          <Select value={cat} onChange={e => setCat(e.target.value)}>
            <option value="todos">Todas</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtrados.map(p => (
          <Card key={p.id} className="!p-0 overflow-hidden">
            <div className="aspect-square bg-[var(--mist)] flex items-center justify-center overflow-hidden">
              {p.imagen ? <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" /> : <Package className="w-10 h-10 text-gray-300" />}
            </div>
            <div className="p-3">
              <div className="font-semibold text-sm text-[var(--ink)] leading-tight line-clamp-2">{p.nombre}</div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wide mt-0.5">{p.categoria}</div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${p.stock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                  {p.stock > 0 ? `${p.stock} disp.` : "Agotado"}
                </span>
                <span className="font-display text-lg text-[var(--gold)]">{fmtCOP(p.precio)}</span>
              </div>
            </div>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-10">No hay productos que coincidan con la búsqueda.</div>
        )}
      </div>
    </div>
  );
}
