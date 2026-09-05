import { useState, useMemo } from "react";
import { useVentas } from "@/lib/zi/store";
import { fmtCOP, fmtDate, maskCedula } from "@/lib/zi/format";
import { Card, Input, Modal } from "./ui";
import { Search, MessageCircle, CreditCard } from "lucide-react";
import type { Venta } from "@/lib/zi/types";

// "Clientes" simplificado: se arma directo del historial de ventas, no de un
// CRM aparte. Lo único que realmente se usa del negocio es: nombre, cédula,
// teléfono, dirección, historial de compras, y — cuando la venta fue a
// crédito — con qué empresa se hizo. Nada de cuotas, mora ni proveedores.
type ClienteAgregado = {
  key: string;
  nombre: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  compras: Venta[];
  total: number;
  empresasCredito: string[];
  ultimaCompra: number;
};

function claveCliente(v: Venta) {
  const c = v.cliente;
  if (!c) return null;
  return (c.cedula || c.telefono || c.nombre || "").trim().toLowerCase() || null;
}

export function Clientes() {
  const [ventas] = useVentas();
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<ClienteAgregado | null>(null);

  const clientes = useMemo(() => {
    const map = new Map<string, ClienteAgregado>();
    [...ventas].filter(v => !v.cancelada).sort((a, b) => a.fecha - b.fecha).forEach(v => {
      const key = claveCliente(v);
      if (!key) return;
      const cur = map.get(key) || {
        key, nombre: v.cliente!.nombre, cedula: v.cliente!.cedula, telefono: v.cliente!.telefono,
        direccion: v.cliente!.direccion, compras: [], total: 0, empresasCredito: [], ultimaCompra: 0,
      };
      cur.nombre = v.cliente!.nombre || cur.nombre;
      cur.cedula = v.cliente!.cedula || cur.cedula;
      cur.telefono = v.cliente!.telefono || cur.telefono;
      cur.direccion = v.cliente!.direccion || cur.direccion;
      cur.compras.push(v);
      cur.total += v.total;
      cur.ultimaCompra = Math.max(cur.ultimaCompra, v.fecha);
      if (v.tipo === "credito" && v.empresaCredito && !cur.empresasCredito.includes(v.empresaCredito)) {
        cur.empresasCredito.push(v.empresaCredito);
      }
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.ultimaCompra - a.ultimaCompra);
  }, [ventas]);

  const filtrados = useMemo(() => {
    if (!q.trim()) return clientes;
    const s = q.toLowerCase();
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(s) || (c.cedula || "").includes(s) || (c.telefono || "").includes(s));
  }, [clientes, q]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, cédula o teléfono..." className="pl-9" />
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {filtrados.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No hay clientes registrados todavía. Se agregan automáticamente al hacer una venta con datos de cliente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-gray-500 bg-[var(--mist)]">
                <tr>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Teléfono</th>
                  <th className="text-right px-4 py-3">Compras</th>
                  <th className="text-right px-4 py-3">Total comprado</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Crédito con</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Última compra</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.key} onClick={() => setDetail(c)} className="border-t border-[var(--line)] hover:bg-[var(--mist)] cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--ink)]">{c.nombre}</div>
                      {c.cedula && <div className="text-xs text-gray-400">{maskCedula(c.cedula)}</div>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-500">{c.telefono || "—"}</td>
                    <td className="px-4 py-3 text-right">{c.compras.length}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--gold-dark)]">{fmtCOP(c.total)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {c.empresasCredito.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                          <CreditCard className="w-3 h-3" /> {c.empresasCredito.join(", ")}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-400">{fmtDate(c.ultimaCompra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.nombre} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm bg-[var(--mist)] rounded-xl p-3">
              {detail.cedula && <div><div className="text-xs text-gray-400">Cédula</div><div className="font-medium">{maskCedula(detail.cedula)}</div></div>}
              {detail.telefono && <div><div className="text-xs text-gray-400">Teléfono</div><div className="font-medium flex items-center gap-2">{detail.telefono}
                <a target="_blank" rel="noreferrer" href={`https://wa.me/${detail.telefono.replace(/\D/g, "")}`} className="text-emerald-600"><MessageCircle className="w-4 h-4" /></a>
              </div></div>}
              {detail.direccion && <div className="col-span-2"><div className="text-xs text-gray-400">Dirección</div><div className="font-medium">{detail.direccion}</div></div>}
              {detail.empresasCredito.length > 0 && (
                <div className="col-span-2"><div className="text-xs text-gray-400">Crédito gestionado con</div><div className="font-medium">{detail.empresasCredito.join(", ")}</div></div>
              )}
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-2">Historial de compras ({detail.compras.length})</h4>
              <div className="divide-y divide-[var(--line)] max-h-72 overflow-y-auto scrollbar-thin">
                {[...detail.compras].sort((a, b) => b.fecha - a.fecha).map(v => (
                  <div key={v.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold text-[var(--gold-dark)]">{v.factura}</div>
                      <div className="text-xs text-gray-400">{fmtDate(v.fecha)} · {v.tipo}{v.tipo === "credito" && v.empresaCredito ? ` (${v.empresaCredito})` : ""}</div>
                    </div>
                    <div className="font-display text-lg text-[var(--ink)]">{fmtCOP(v.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
