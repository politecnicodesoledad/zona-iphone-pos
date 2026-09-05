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
// La altura del papel se calcula DIBUJANDO el contenido una vez en un
// documento de prueba (bien alto) y midiendo dónde terminó. Así el recibo
// nunca vuelve a "salir mocho": no importa si la garantía es más larga, si
// hay observaciones, crédito, etc. — la hoja siempre mide justo lo que el
// contenido necesita, más un margen de seguridad al final.
function dibujarFactura(doc: jsPDF, venta: Venta, cfg: ZIConfig, logoData: string | undefined): number {
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
    y += size * 0.46;
  };
  const rule = (heavy = false) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(heavy ? 0.45 : 0.18);
    doc.line(left, y, right, y);
    y += heavy ? 2.8 : 2.3;
  };
  const dash = () => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.18);
    doc.setLineDashPattern([0.7, 0.7], 0);
    doc.line(left, y, right, y);
    doc.setLineDashPattern([], 0);
    y += 2.8;
  };
  const row = (l: string, r: string, size = 8.3, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(l, left, y);
    doc.text(r, right, y, { align: "right" });
    y += size * 0.62;
  };

  center(cfg.storeName.toUpperCase().replace("ZONA IPHONE", "ZONA  IPHONE"), 14, true);
  center("FACTURA DE VENTA", 8.5, true);
  center((cfg.facturaSubtitulo || "CELULARES & ACCESORIOS").toUpperCase(), 7.5);
  center("NIT: 1001882175", 7.5);
  const addressLines = doc.splitTextToSize(cfg.direccion, 62);
  doc.setFontSize(7.3); doc.setFont("courier", "normal"); doc.setTextColor(0, 0, 0);
  doc.text(addressLines, w / 2, y, { align: "center" }); y += addressLines.length * 3.4 + 1.2;
  center("+" + cfg.whatsapp, 7.5);
  center("zonaiphone23@gmail.com", 7.3);
  y += 1.2; dash();

  const fecha = new Date(venta.fecha).toLocaleDateString("es-CO");
  const hora = new Date(venta.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  row("Numero", venta.factura, 8.5, true);
  row("Fecha", `${fecha}  ${hora}`, 7.7, false);
  row("Sucursal", venta.local === 1 ? cfg.local1nombre : cfg.local2nombre, 8.3, false);
  row("Vendedor", venta.asesor || "—", 8.3, false);
  y += 0.6; dash();

  if (venta.cliente?.nombre) {
    // Sin negrilla en el nombre del cliente (lo único que se pidió cambiar
    // aquí), un poco más grande que el resto de filas para que resalte.
    row("Cliente", venta.cliente.nombre.toUpperCase(), 8.6, false);
    if (venta.cliente.cedula) row("Identificacion", venta.cliente.cedula, 8.3, false);
    if (venta.cliente.telefono) row("Telefono", venta.cliente.telefono, 8.3, false);
    y += 0.6; dash();
  }

  doc.setFontSize(9); doc.setFont("courier", "bold"); doc.setTextColor(0, 0, 0);
  doc.text("DETALLE", left, y); y += 5;

  venta.productos.forEach(p => {
    const lines = doc.splitTextToSize(p.nombre.toUpperCase(), 48);
    doc.setFont("courier", "bold"); doc.setFontSize(8.3); doc.setTextColor(0, 0, 0);
    doc.text(lines, left, y);
    y += lines.length * 4;
    row(`${p.cantidad} x ${fmtCOP(p.precioUnitario)}`, fmtCOP(p.subtotal), 8.3, false);
    if (p.descuento) row("Descuento", `- ${fmtCOP(p.descuento)}`, 7.6, false);
    if (p.color) row("Color", p.color, 7.6, false);
  });
  y += 0.6; dash();
  row("Subtotal", fmtCOP(venta.total + (venta.descuentoTotal || 0)), 8.3, false);
  if (venta.descuentoTotal) row("Descuento", `- ${fmtCOP(venta.descuentoTotal)}`, 8.3, false);

  y += 1.3; rule(true);
  y += 5;
  doc.setTextColor(0, 0, 0); doc.setFont("courier", "bold"); doc.setFontSize(14);
  doc.text("TOTAL", left, y);
  doc.text(fmtCOP(venta.total), right, y, { align: "right" });
  y += 5.5;
  rule(true); y += 1.3;

  row("Forma de pago", venta.tipo === "contado" ? (venta.metodoPago || "Contado") : venta.tipo === "credito" ? "Credito" : "Trade-In", 8.3, false);
  if (venta.tipo === "contado" && venta.recibido) {
    row("Pago recibido", fmtCOP(venta.recibido), 8.3, false);
    row("Cambio", fmtCOP(Math.max(0, venta.recibido - venta.total)), 8.3, true);
  }
  if (venta.tipo === "credito") {
    row("Cuota inicial", fmtCOP(venta.creditoCuotaInicial || 0), 8.3, false);
    row("Cuotas", `${venta.creditoCuotas} x ${fmtCOP(venta.creditoValorCuota || 0)}`, 8.3, false);
  }
  if (venta.tipo === "tradein" && venta.tradeIn) {
    row("Equipo recibido", `${venta.tradeIn.marca} ${venta.tradeIn.modelo}`, 8.3, false);
    row("Valor equipo", fmtCOP(venta.tradeIn.valor), 8.3, false);
    row("Restante", `${fmtCOP(venta.tradeIn.restante)} (${venta.tradeIn.metodoRestante})`, 8.3, false);
  }
  if (venta.observaciones) {
    y += 1.3; doc.setFont("courier", "bold"); doc.setFontSize(7.8); doc.text("OBSERVACIONES", left, y); y += 4.3;
    doc.setFont("courier", "normal"); doc.setFontSize(7.8);
    const obs = doc.splitTextToSize(venta.observaciones, right - left);
    doc.text(obs, left, y); y += obs.length * 3.8;
  }
  y += 1.3; dash();

  doc.setFontSize(8.3); doc.setFont("courier", "bold"); doc.setTextColor(0, 0, 0);
  doc.text("GARANTIA", left, y); y += 5;
  doc.setFont("courier", "normal"); doc.setFontSize(7.7); doc.setTextColor(0, 0, 0);
  const garantia = doc.splitTextToSize(venta.garantia || cfg.facturaGarantia, right - left);
  doc.text(garantia, left, y); y += garantia.length * 4;

  y += 2.5;
  if (venta.asesor) { center(`Atendido por: ${venta.asesor}`, 7.5, false); }
  dash();
  doc.setFontSize(12.5); doc.setFont("courier", "bold"); doc.setTextColor(0, 0, 0);
  doc.text("¡Gracias por su compra!", w / 2, y, { align: "center" }); y += 6.3;
  doc.setFontSize(7.3); doc.setFont("courier", "normal");
  const gracias = doc.splitTextToSize(cfg.facturaGracias, w - 8);
  doc.text(gracias, w / 2, y, { align: "center" });
  y += gracias.length * 3.4;

  return y;
}

export async function generarFacturaPDF(venta: Venta, cfg: ZIConfig) {
  const rawLogo = cfg.logoUrl ? await loadImageAsDataURL(cfg.logoUrl) : undefined;
  const logoData = rawLogo ? await toBlackWhite(rawLogo) : undefined;

  // Pasada 1 (de medición): se dibuja todo en una hoja de prueba bien alta
  // (1000mm) solo para averiguar en qué "y" terminó el contenido real. No se
  // guarda ni se muestra al usuario.
  const medidor = new jsPDF({ unit: "mm", format: [80, 1000] });
  const finalY = dibujarFactura(medidor, venta, cfg, logoData);

  // Pasada 2 (la real): se crea la hoja del tamaño exacto que hizo falta
  // (+8mm de margen de seguridad al final) y se dibuja de nuevo, ya para
  // guardar de verdad.
  const receiptHeight = Math.max(120, finalY + 8);
  const doc = new jsPDF({ unit: "mm", format: [80, receiptHeight] });
  dibujarFactura(doc, venta, cfg, logoData);

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
