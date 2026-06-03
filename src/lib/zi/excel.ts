import type { Venta } from "./types";
import { fmtDateTime } from "./format";

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportarVentasExcel(ventas: Venta[], filename = "historial-ventas.xls") {
  const rows = ventas.map(v => {
    const costo = v.productos.reduce((s, p) => s + (p.costo || 0) * p.cantidad, 0);
    const cantidad = v.productos.reduce((s, p) => s + p.cantidad, 0);
    return [
      v.factura,
      fmtDateTime(v.fecha),
      v.cliente?.nombre || "—",
      v.cliente?.cedula || "—",
      v.cliente?.telefono || "—",
      v.productos.map(p => p.nombre).join(", "),
      cantidad,
      v.descuentoTotal || 0,
      v.total,
      costo,
      v.total - costo,
      v.tipo,
      v.metodoPago || "—",
      v.asesor || "—",
      `Local ${v.local}`,
      v.cancelada ? "Cancelada" : "Activa",
    ];
  });
  const head = ["Factura", "Fecha", "Cliente", "Cédula", "Teléfono", "Producto(s)", "Cant.", "Descuento", "Total", "Costo", "Ganancia", "Pago", "Método", "Asesor", "Local", "Estado"];
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