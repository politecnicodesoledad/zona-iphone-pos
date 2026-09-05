import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Venta, ZIConfig } from "./types";
import { fmtCOP, fmtDateTime, maskCedula } from "./format";

export function facturaWhatsappText(venta: Venta, cfg: ZIConfig) {
  const productos = venta.productos.map(p => `• ${p.nombre} x${p.cantidad} — ${fmtCOP(p.subtotal)}`).join("\n");
  const pago = venta.tipo === "contado" ? `Contado (${venta.metodoPago || "—"})` : venta.tipo === "credito" ? `Crédito: inicial ${fmtCOP(venta.creditoCuotaInicial || 0)}, ${venta.creditoCuotas || 0} cuotas de ${fmtCOP(venta.creditoValorCuota || 0)}` : `Celular como pago${venta.tradeIn ? `: ${venta.tradeIn.marca} ${venta.tradeIn.modelo}` : ""}`;
  return `${cfg.storeName}\nFACTURA ${venta.factura}\nFecha: ${fmtDateTime(venta.fecha)}\n\nCliente: ${venta.cliente?.nombre || "—"}\nTel: ${venta.cliente?.telefono || "—"}\nCC/NIT: ${venta.cliente?.cedula || "—"}\n\n${productos}\n\nTOTAL: ${fmtCOP(venta.total)}\nPago: ${pago}\n${venta.observaciones ? `Observaciones: ${venta.observaciones}\n` : ""}\nGracias por tu compra.`;
}

async function loadImageAsDataURL(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch { return undefined; }
}

async function toBlackWhite(dataUrl: string): Promise<string> {
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0);
      const image = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < image.data.length; i += 4) {
        const g = image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = g > 175 ? 255 : 0;
      }
      ctx.putImageData(image, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ───────── FACTURA TÉRMICA (una venta) ─────────
export async function generarFacturaPDF(venta: Venta, cfg: ZIConfig) {
  const rawLogo = cfg.logoUrl ? await loadImageAsDataURL(cfg.logoUrl) : undefined;
  const logoData = rawLogo ? await toBlackWhite(rawLogo) : undefined;
  const estimatedProductLines = venta.productos.reduce((sum, producto) => sum + Math.max(1, Math.ceil(producto.nombre.length / 25)), 0);
  const estimatedHeight = 135 + estimatedProductLines * 4 + (venta.observaciones ? 10 : 0) + (venta.tipo === "credito" ? 9 : 0) + (venta.tipo === "tradein" ? 13 : 0);
  const receiptHeight = Math.max(165, Math.min(320, estimatedHeight));
  const doc = new jsPDF({ unit: "mm", format: [80, receiptHeight] });
  const w = 80;
  const left = 5;
  const right = w - 5;
  let y = 6;

  if (logoData) {
    try { doc.addImage(logoData, "PNG", (w - 15) / 2, y, 15, 15); y += 17; } catch { /* skip */ }
  }

  const center = (txt: string, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(txt, w / 2, y, { align: "center" });
    y += size * 0.42;
  };
  const rule = (heavy = false) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(heavy ? 0.45 : 0.18);
    doc.line(left, y, right, y);
    y += heavy ? 2.5 : 2;
  };
  const dash = () => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.18);
    doc.setLineDashPattern([0.7, 0.7], 0);
    doc.line(left, y, right, y);
    doc.setLineDashPattern([], 0);
    y += 2.5;
  };
  const row = (l: string, r: string, size = 8, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(l, left, y);
    doc.text(r, right, y, { align: "right" });
    y += size * 0.55;
  };

  center(cfg.storeName.toUpperCase(), 12, true);
  center("FACTURA DE VENTA", 7.5, true);
  center((cfg.facturaSubtitulo || "CELULARES & ACCESORIOS").toUpperCase(), 6);
  center("NIT: 1001882175", 6);
  const addressLines = doc.splitTextToSize(cfg.direccion, 62);
  doc.setFontSize(5.8); doc.setFont("courier", "normal"); doc.setTextColor(0, 0, 0);
  doc.text(addressLines, w / 2, y, { align: "center" }); y += addressLines.length * 2.8 + 1;
  center("+" + cfg.whatsapp, 6);
  center("zonaiphone23@gmail.com", 5.8);
  y += 1; dash();

  const fecha = new Date(venta.fecha).toLocaleDateString("es-CO");
  const hora = new Date(venta.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  row("Numero", venta.factura, 7, true);
  row("Fecha", `${fecha}  ${hora}`, 6.2);
  row("Sucursal", venta.local === 1 ? cfg.local1nombre : cfg.local2nombre, 7);
  row("Vendedor", venta.asesor || "—", 7, true);
  dash();

  if (venta.cliente?.nombre) {
    row("Cliente", venta.cliente.nombre.toUpperCase(), 7, true);
    if (venta.cliente.cedula) row("Identificacion", venta.cliente.cedula, 7);
    if (venta.cliente.telefono) row("Telefono", venta.cliente.telefono, 7);
    dash();
  }

  doc.setFontSize(7.5); doc.setFont("courier", "bold"); doc.setTextColor(0, 0, 0);
  doc.text("DETALLE", left, y); y += 4;

  venta.productos.forEach(p => {
    const lines = doc.splitTextToSize(p.nombre.toUpperCase(), 48);
    doc.setFont("courier", "bold"); doc.setFontSize(7); doc.setTextColor(0, 0, 0);
    doc.text(lines, left, y);
    y += lines.length * 3.2;
    row(`${p.cantidad} x ${fmtCOP(p.precioUnitario)}`, fmtCOP(p.subtotal), 7, true);
    if (p.descuento) row("Descuento", `- ${fmtCOP(p.descuento)}`, 6.5);
    if (p.color) row("Color", p.color, 6.5);
  });
  dash();
  row("Subtotal", fmtCOP(venta.total + (venta.descuentoTotal || 0)), 7);
  if (venta.descuentoTotal) row("Descuento", `- ${fmtCOP(venta.descuentoTotal)}`, 7);

  y += 1; rule(true);
  y += 4.5;
  doc.setTextColor(0, 0, 0); doc.setFont("courier", "bold"); doc.setFontSize(12);
  doc.text("TOTAL", left, y);
  doc.text(fmtCOP(venta.total), right, y, { align: "right" });
  y += 5;
  rule(true); y += 1;

  row("Forma de pago", venta.tipo === "contado" ? (venta.metodoPago || "Contado") : venta.tipo === "credito" ? "Credito" : "Trade-In", 7, true);
  if (venta.tipo === "contado" && venta.recibido) {
    row("Pago recibido", fmtCOP(venta.recibido), 7);
    row("Cambio", fmtCOP(Math.max(0, venta.recibido - venta.total)), 7, true);
  }
  if (venta.tipo === "credito") {
    row("Cuota inicial", fmtCOP(venta.creditoCuotaInicial || 0), 7);
    row("Cuotas", `${venta.creditoCuotas} x ${fmtCOP(venta.creditoValorCuota || 0)}`, 7);
  }
  if (venta.tipo === "tradein" && venta.tradeIn) {
    row("Equipo recibido", `${venta.tradeIn.marca} ${venta.tradeIn.modelo}`, 7);
    row("Valor equipo", fmtCOP(venta.tradeIn.valor), 7);
    row("Restante", `${fmtCOP(venta.tradeIn.restante)} (${venta.tradeIn.metodoRestante})`, 7);
  }
  if (venta.observaciones) {
    y += 1; doc.setFont("courier", "bold"); doc.setFontSize(6.5); doc.text("OBSERVACIONES", left, y); y += 3.5;
    doc.setFont("courier", "normal");
    const obs = doc.splitTextToSize(venta.observaciones, right - left);
    doc.text(obs, left, y); y += obs.length * 3;
  }
  y += 1; dash();

  doc.setFontSize(6.8); doc.setFont("courier", "bold"); doc.setTextColor(0, 0, 0);
  doc.text("GARANTIA", left, y); y += 4;
  doc.setFont("courier", "normal"); doc.setTextColor(0, 0, 0);
  const garantia = doc.splitTextToSize(venta.garantia || cfg.facturaGarantia, right - left);
  doc.text(garantia, left, y); y += garantia.length * 3.2;

  y += 2; dash();
  doc.setFontSize(9); doc.setFont("courier", "bold"); doc.setTextColor(0, 0, 0);
  doc.text("Gracias por su compra.", w / 2, y, { align: "center" }); y += 5;
  doc.setFontSize(6); doc.setFont("courier", "normal");
  const gracias = doc.splitTextToSize(cfg.facturaGracias, w - 8);
  doc.text(gracias, w / 2, y, { align: "center" });

  doc.save(`factura-${venta.factura.replace("#", "")}.pdf`);
}

// ───────── HISTORIAL DE VENTAS (A4 horizontal) ─────────
export async function exportarHistorialPDF(
  ventas: Venta[],
  cfg: ZIConfig,
  filtros: { periodo: string; tipo: string; local: string },
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  const logoData = cfg.logoUrl ? await loadImageAsDataURL(cfg.logoUrl) : undefined;

  const gold = [201, 168, 76] as [number, number, number];
  const ink = [10, 10, 10] as [number, number, number];

  doc.setFillColor(...ink);
  doc.rect(0, 0, pageW, 28, "F");

  if (logoData) {
    try { doc.addImage(logoData, "PNG", 10, 5, 18, 18); } catch { /* skip */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text(cfg.storeName.toUpperCase(), 32, 13);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.setTextColor(...gold);
  doc.text("HISTORIAL DE VENTAS · USO INTERNO", 32, 19);
  doc.setTextColor(220, 220, 220); doc.setFontSize(8);
  doc.text(cfg.direccion, 32, 24);

  doc.setTextColor(255, 255, 255); doc.setFontSize(8);
  const PERIODO_LABEL: Record<string, string> = {
    hoy: "Hoy", semana: "Esta semana", mes: "Este mes", anio: "Este año", custom: "Personalizado", todos: "Todos",
  };
  const TIPO_LABEL: Record<string, string> = {
    todos: "Todos los pagos", contado: "Contado", credito: "Crédito", tradein: "Celular como pago",
  };
  const localTxt = filtros.local === "todos" ? "Todos los locales" : `Local ${filtros.local}`;
  doc.text(`Período: ${PERIODO_LABEL[filtros.periodo] || filtros.periodo}`, pageW - 10, 10, { align: "right" });
  doc.text(`Pago: ${TIPO_LABEL[filtros.tipo] || filtros.tipo}`, pageW - 10, 15, { align: "right" });
  doc.text(`Local: ${localTxt}`, pageW - 10, 20, { align: "right" });
  doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, pageW - 10, 25, { align: "right" });

  const rows = ventas.map(v => [
    v.factura,
    new Date(v.fecha).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }),
    v.cliente?.nombre || "—",
    v.cliente?.cedula ? maskCedula(v.cliente.cedula) : "—",
    v.productos.map(p => p.nombre).join(", "),
    v.productos.reduce((s, p) => s + p.cantidad, 0).toString(),
    fmtCOP(v.total / Math.max(1, v.productos.reduce((s, p) => s + p.cantidad, 0))),
    fmtCOP(v.total),
    v.tipo === "contado" ? `Contado${v.metodoPago ? ` (${v.metodoPago})` : ""}` : v.tipo === "credito" ? "Crédito" : "Cel como pago",
    v.asesor || "—",
    v.cancelada ? "Cancelada" : "Activa",
  ]);

  autoTable(doc, {
    startY: 34,
    head: [["#Factura", "Fecha", "Cliente", "Cédula", "Producto(s)", "Cant.", "P. unit.", "Total", "Pago", "Asesor", "Estado"]],
    body: rows,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2, textColor: [30, 30, 30], lineColor: [232, 234, 238] },
    headStyles: { fillColor: ink, textColor: gold, fontStyle: "bold", fontSize: 8, halign: "center" },
    alternateRowStyles: { fillColor: [250, 248, 243] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: gold, cellWidth: 18 },
      1: { cellWidth: 24 },
      2: { cellWidth: 38 },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 60 },
      5: { cellWidth: 12, halign: "center" },
      6: { cellWidth: 24, halign: "right" },
      7: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      8: { cellWidth: 28 },
      9: { cellWidth: 22 },
      10: { cellWidth: 18, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 10) {
        const val = String(data.cell.raw);
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = val === "Cancelada" ? [185, 28, 28] : [21, 128, 61];
      }
    },
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(150);
      doc.text(`${cfg.storeName} · Reporte interno · ${new Date().toLocaleDateString("es-CO")}`, 10, pageH - 6);
      doc.text(`Página ${doc.getNumberOfPages()}`, pageW - 10, pageH - 6, { align: "right" });
    },
  });

  const activas = ventas.filter(v => !v.cancelada);
  const totalIngresos = activas.reduce((s, v) => s + v.total, 0);
  const totalCosto = activas.reduce((s, v) => s + v.productos.reduce((a, p) => a + p.costo * p.cantidad, 0), 0);
  const gananciaBruta = totalIngresos - totalCosto;

  // @ts-expect-error jspdf-autotable adds lastAutoTable
  const finalY = (doc.lastAutoTable?.finalY ?? 60) + 8;
  const pageH = doc.internal.pageSize.getHeight();
  let yy = finalY;
  if (yy > pageH - 40) { doc.addPage(); yy = 20; }

  doc.setFillColor(250, 248, 243);
  doc.roundedRect(10, yy, pageW - 20, 26, 2, 2, "F");
  doc.setDrawColor(...gold); doc.setLineWidth(0.5);
  doc.roundedRect(10, yy, pageW - 20, 26, 2, 2, "S");

  doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("RESUMEN DEL PERÍODO", 15, yy + 7);

  const cells: [string, string, [number, number, number]][] = [
    ["Total de ventas", `${ventas.length}`, ink],
    ["Ventas activas", `${activas.length}`, [21, 128, 61]],
    ["Ingresos totales", fmtCOP(totalIngresos), ink],
    ["Ganancia bruta", fmtCOP(gananciaBruta), [156, 130, 48]],
  ];
  const colW = (pageW - 30) / cells.length;
  cells.forEach(([label, value, color], i) => {
    const x = 15 + i * colW;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(110, 110, 110);
    doc.text(label.toUpperCase(), x, yy + 14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...color);
    doc.text(value, x, yy + 22);
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`historial-ventas-${stamp}.pdf`);
}
