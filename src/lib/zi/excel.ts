import * as XLSX from "xlsx";
import type { Producto, ProductoVendido, Venta } from "./types";

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportarVentasExcel(ventas: Venta[], filename = "historial-ventas.xls") {
  const rows = ventas.map(v => {
    const costo = v.productos.reduce((s, p) => s + (p.costo || 0) * p.cantidad, 0);
    const d = new Date(v.fecha);
    return [
      d.toLocaleDateString("es-CO"),
      d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true }),
      v.cliente?.nombre || "—",
      v.cliente?.telefono || "—",
      v.cliente?.cedula || "—",
      `Local ${v.local}`,
      v.tipo === "contado" ? "Contado" : v.tipo === "credito" ? "Cuotas" : "Trade-In",
      v.metodoPago || v.tradeIn?.metodoRestante || "—",
      v.productos.map(p => `${p.nombre} x${p.cantidad}`).join(", "),
      v.total,
      costo,
      v.total - costo,
      v.observaciones || "—",
      v.factura,
      v.asesor || "—",
      v.fechaManual ? "Fecha manual" : "Normal",
      v.cancelada ? "Cancelada" : "Activa",
    ];
  });
  const head = ["Fecha", "Hora", "Cliente", "Teléfono", "Cédula", "Local", "Tipo pago", "Método", "Productos", "Total Venta", "Costo Total", "Ganancia", "Observaciones", "Factura", "Asesor", "Registro", "Estado"];
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportHtmlExcel(head: string[], rows: unknown[][], filename: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export function exportarProductosExcel(productos: Producto[], filename = "productos-inventario.xls") {
  exportHtmlExcel(
    ["Nombre", "Categoría", "Estado", "Stock", "Costo unitario", "Precio", "Inversión", "Ganancia potencial", "Local", "Proveedor", "IMEI/Serial"],
    productos.map(p => [p.nombre, p.categoria, p.estado, p.stock, p.costo, p.precio, p.costo * p.stock, (p.precio - p.costo) * p.stock, `Local ${p.local}`, p.proveedor || "—", p.imei || "—"]),
    filename,
  );
}

export function exportarVendidosExcel(vendidos: ProductoVendido[], filename = "productos-vendidos.xls") {
  exportHtmlExcel(
    ["Fecha venta", "Nombre", "Categoría", "Cantidad", "Cliente", "Costo", "Precio", "Ganancia", "Detalle extra", "Observaciones"],
    vendidos.map(v => [new Date(v.fechaVenta || v.fechaArchivado).toLocaleDateString("es-CO"), v.nombre, v.categoria, v.cantidad || 1, v.cliente || "—", v.costo, v.precio, v.gananciaPotencial, v.detalleExtra || "—", v.observaciones || "—"]),
    filename,
  );
}

function num(v: unknown) { return Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0; }
function clean(v: unknown) { const s = String(v ?? "").trim(); return s === "—" ? "" : s; }
function parseFecha(fecha: unknown, hora: unknown) {
  if (fecha instanceof Date) return fecha.getTime();
  const [d, m, y] = String(fecha || "").split(/[/-]/).map(Number);
  let hh = 12, mm = 0;
  const hs = String(hora || "").toLowerCase();
  const mt = hs.match(/(\d{1,2}):(\d{2})/);
  if (mt) { hh = Number(mt[1]); mm = Number(mt[2]); }
  if (hs.includes("p") && hh < 12) hh += 12;
  if (hs.includes("a") && hh === 12) hh = 0;
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1, hh, mm).getTime();
}

export async function importarVentasDesdeExcel(file: File): Promise<Venta[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets["Historial Ventas"] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  return rows
    .filter(r => clean(r["Cliente"]).toUpperCase() !== "DIOVANNYS")
    .map((r, idx) => {
      const productoTxt = clean(r["Productos"]);
      const qty = Math.max(1, Number(productoTxt.match(/x\s*(\d+)\s*$/i)?.[1] || 1));
      const nombre = productoTxt.replace(/\s*x\s*\d+\s*$/i, "").trim() || "Producto importado";
      const total = num(r["Total Venta"]);
      const costoTotal = num(r["Costo Total"]);
      const tipoTxt = clean(r["Tipo pago"]).toLowerCase();
      const factura = "#" + String(clean(r["Factura #"]) || idx + 1).replace(/^#/, "").padStart(5, "0");
      const obs = clean(r["Observaciones"]);
      return {
        id: `import-${factura.replace("#", "")}`,
        factura,
        fecha: parseFecha(r["Fecha"], r["Hora"]),
        registradaEn: Date.now(),
        fechaManual: true,
        tipo: tipoTxt.includes("trade") ? "tradein" : tipoTxt.includes("cr") ? "credito" : "contado",
        local: clean(r["Local"]).includes("2") ? 2 : 1,
        productos: [{ productoId: `importado-${factura.replace("#", "")}`, nombre, cantidad: qty, precioUnitario: total / qty, costo: costoTotal / qty, subtotal: total, esRapido: true }],
        total,
        metodoPago: clean(r["Método"]) as Venta["metodoPago"] || undefined,
        cliente: { nombre: clean(r["Cliente"]) || "Cliente importado", telefono: clean(r["Teléfono"]), cedula: clean(r["Cédula"]) },
        observaciones: obs || "Importado desde Excel histórico",
      } satisfies Venta;
    });
}