import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Venta, ZIConfig } from "./types";
import { fmtCOP, fmtDateTime, maskCedula } from "./format";

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
  const doc = new jsPDF({ unit: "mm", format: [80, 297] });
  let y = 6;
  const w = 80;

  // intentar logo
  const rawLogo = cfg.logoUrl ? await loadImageAsDataURL(cfg.logoUrl) : undefined;
  const logoData = rawLogo ? await toBlackWhite(rawLogo) : undefined;
  if (logoData) {
    try { doc.addImage(logoData, "PNG", (w - 16) / 2, y, 16, 16); y += 17; } catch { /* skip */ }
  }

  const center = (txt: string, size: number, bold = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    doc.text(txt, w / 2, y, { align: "center" });
    y += size * 0.45;
  };
  const line = (heavy = false) => { doc.setDrawColor(0); doc.setLineWidth(heavy ? 0.45 : 0.15); doc.line(4, y, w - 4, y); y += heavy ? 2.2 : 1.8; };
  const row = (l: string, r: string, size = 8, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(l, 4, y); doc.text(r, w - 4, y, { align: "right" });
    y += size * 0.55;
  };

  center(cfg.storeName.toUpperCase(), 12, true, [0, 0, 0]);
  center(cfg.facturaSubtitulo, 6, false, [0, 0, 0]);
  y += 1;
  doc.setFontSize(5.8); doc.setFont("courier", "normal"); doc.setTextColor(0, 0, 0);
  doc.text(doc.splitTextToSize(cfg.direccion, 58), w / 2, y, { align: "center" }); y += 6;
  center("+" + cfg.whatsapp, 6);
  y += 1; line(true);

  // bloque factura
  center("FACTURA # " + venta.factura.replace("#", ""), 10, true, [0, 0, 0]);
  line();
  row("Fecha:", fmtDateTime(venta.fecha), 6.5);
  line();

  if (venta.cliente?.nombre) {
    row("Cliente:", venta.cliente.nombre);
    if (venta.cliente.cedula) row("Cédula:", maskCedula(venta.cliente.cedula));
    if (venta.cliente.telefono) row("Tel:", venta.cliente.telefono);
    y += 1; line(true);
  }

  doc.setFontSize(6.8); doc.setFont("courier", "bold");
  doc.text("DESC", 4, y); doc.text("CANT", 33, y); doc.text("VR.", 46, y); doc.text("TOTAL", w - 4, y, { align: "right" });
  y += 2.5; line();

  venta.productos.forEach(p => {
    const name = p.nombre.length > 25 ? p.nombre.slice(0, 25) + "…" : p.nombre;
    doc.setFont("courier", "bold"); doc.setFontSize(6.6); doc.setTextColor(0, 0, 0);
    doc.text(name, 4, y); doc.text(String(p.cantidad), 35, y, { align: "center" }); doc.text(fmtCOP(p.precioUnitario), 57, y, { align: "right" }); doc.text(fmtCOP(p.subtotal), w - 4, y, { align: "right" }); y += 3.5;
    if (p.descuento) { doc.setFont("courier", "normal"); doc.setTextColor(90); doc.text("DESC - " + fmtCOP(p.descuento), 4, y); doc.text("-" + fmtCOP(p.descuento), w - 4, y, { align: "right" }); y += 3; }
  });
  line(true);

  // total destacado
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("TOTAL", 4, y + 4);
  doc.setFontSize(13);
  doc.text(fmtCOP(venta.total), w - 4, y + 4.5, { align: "right" });
  y += 8; line(true);

  doc.setTextColor(0, 0, 0);
  row("Pago:", venta.tipo === "contado" ? `Contado (${venta.metodoPago})` : venta.tipo === "credito" ? "Crédito" : "Celular como pago");
  if (venta.tipo === "credito") {
    row("Cuota inicial:", fmtCOP(venta.creditoCuotaInicial || 0));
    row("Cuotas:", `${venta.creditoCuotas} × ${fmtCOP(venta.creditoValorCuota || 0)}`);
  }
  if (venta.tipo === "tradein" && venta.tradeIn) {
    row("Recibido:", `${venta.tradeIn.marca} ${venta.tradeIn.modelo}`);
    row("Valor cel:", fmtCOP(venta.tradeIn.valor));
    row("Restante:", `${fmtCOP(venta.tradeIn.restante)} (${venta.tradeIn.metodoRestante})`);
  }
  if (venta.asesor) row("Atendió:", venta.asesor);
  y += 1; line();

  doc.setFontSize(6.8); doc.setFont("courier", "bold");
  doc.setTextColor(0, 0, 0); doc.text("GARANTIA", 4, y); y += 3;
  doc.setFont("courier", "normal"); doc.setTextColor(0, 0, 0);
  const garantia = doc.splitTextToSize(cfg.facturaGarantia, w - 8);
  doc.text(garantia, 4, y); y += garantia.length * 3;

  if (venta.observaciones) {
    y += 1;
    doc.setFont("helvetica", "bold"); doc.setTextColor(156, 130, 48);
    doc.text("OBSERVACIONES", 4, y); y += 3;
    doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
    const obs = doc.splitTextToSize(venta.observaciones, w - 8);
    doc.text(obs, 4, y); y += obs.length * 3;
  }

  y += 2; line();
  doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(10, 10, 10);
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
