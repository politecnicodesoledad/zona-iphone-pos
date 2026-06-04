import type { Venta } from "./types";

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
      v.productos.map(p => p.nombre).join(", "),
      v.cancelada ? "Cancelada" : "Activa",
    ];
  });
  const head = ["Fecha", "Hora", "Cliente", "Teléfono", "Cédula", "Local", "Tipo pago", "Método", "Productos", "Total Venta", "Costo Total", "Ganancia", "Observaciones", "Factura", "Asesor", "Registro", "Producto(s)", "Estado"];
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