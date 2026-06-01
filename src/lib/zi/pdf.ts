import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Venta, ZIConfig } from "./types";
import { fmtCOP, fmtDateTime, maskCedula } from "./format";

// ───────── FACTURA TÉRMICA (una venta) ─────────
export function generarFacturaPDF(venta: Venta, cfg: ZIConfig) {
  const doc = new jsPDF({ unit: "mm", format: [80, 297] });
  let y = 8;
  const w = 80;
  const center = (txt: string, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(txt, w / 2, y, { align: "center" });
    y += size * 0.45;
  };
  const line = () => { doc.setLineWidth(0.2); doc.line(4, y, w - 4, y); y += 3; };
  const row = (l: string, r: string, size = 8) => {
    doc.setFontSize(size); doc.setFont("helvetica", "normal");
    doc.text(l, 4, y); doc.text(r, w - 4, y, { align: "right" });
    y += size * 0.55;
  };

  center(cfg.storeName.toUpperCase(), 14, true);
  center(cfg.facturaSubtitulo, 8);
  y += 1;
  center(cfg.direccion, 7);
  center("WhatsApp: " + cfg.whatsapp, 7);
  y += 2; line();

  center("FACTURA " + venta.factura, 10, true);
  center(fmtDateTime(venta.fecha), 7);
  y += 2; line();

  if (venta.cliente?.nombre) {
    row("Cliente:", venta.cliente.nombre);
    if (venta.cliente.cedula) row("Cédula:", maskCedula(venta.cliente.cedula));
    if (venta.cliente.telefono) row("Tel:", venta.cliente.telefono);
    y += 1; line();
  }

  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("Producto", 4, y); doc.text("Total", w - 4, y, { align: "right" });
  y += 4;
  doc.setFont("helvetica", "normal");
  venta.productos.forEach(p => {
    const name = p.nombre.length > 26 ? p.nombre.slice(0, 26) + "…" : p.nombre;
    doc.text(name, 4, y); y += 3.5;
    doc.setFontSize(7);
    doc.text(`${p.cantidad} x ${fmtCOP(p.precioUnitario)}`, 4, y);
    doc.text(fmtCOP(p.subtotal), w - 4, y, { align: "right" });
    y += 4;
    doc.setFontSize(8);
  });
  line();
  row("TOTAL", fmtCOP(venta.total), 11);
  line();

  row("Pago:", venta.tipo === "contado" ? `Contado (${venta.metodoPago})` : venta.tipo === "credito" ? "Crédito" : "Celular como pago");
  if (venta.tipo === "credito") {
    row("Cuota inicial:", fmtCOP(venta.creditoCuotaInicial || 0));
    row("Cuotas:", `${venta.creditoCuotas} x ${fmtCOP(venta.creditoValorCuota || 0)}`);
  }
  if (venta.tipo === "tradein" && venta.tradeIn) {
    row("Recibido:", `${venta.tradeIn.marca} ${venta.tradeIn.modelo}`);
    row("Valor cel:", fmtCOP(venta.tradeIn.valor));
    row("Restante:", `${fmtCOP(venta.tradeIn.restante)} (${venta.tradeIn.metodoRestante})`);
  }
  if (venta.asesor) row("Atendió:", venta.asesor);
  y += 1; line();

  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.text("GARANTÍA", 4, y); y += 3;
  doc.setFont("helvetica", "normal");
  const garantia = doc.splitTextToSize(cfg.facturaGarantia, w - 8);
  doc.text(garantia, 4, y); y += garantia.length * 3;

  if (venta.observaciones) {
    y += 1; doc.setFont("helvetica", "bold"); doc.text("OBSERVACIONES", 4, y); y += 3;
    doc.setFont("helvetica", "normal");
    const obs = doc.splitTextToSize(venta.observaciones, w - 8);
    doc.text(obs, 4, y); y += obs.length * 3;
  }

  y += 2; line();
  doc.setFontSize(8); doc.setFont("helvetica", "italic");
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

  // intentar cargar logo
  let logoData: string | undefined;
  try {
    if (cfg.logoUrl) {
      const res = await fetch(cfg.logoUrl);
      const blob = await res.blob();
      logoData = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
  } catch { /* sin logo */ }

  // ───── HEADER ─────
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

  // meta derecha
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

  // ───── TABLA ─────
  const rows = ventas.map(v => [
    v.factura,
    new Date(v.fecha).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }),
    v.cliente?.nombre || "—",
    v.cliente?.cedula ? maskCedula(v.cliente.cedula) : "—",
    v.productos.map(p => p.nombre).join(", "),
    v.productos.reduce((s, p) => s + p.cantidad, 0).toString(),
    fmtCOP(v.productos.reduce((s, p) => s + (p.precioUnitario * p.cantidad), 0) / Math.max(1, v.productos.reduce((s, p) => s + p.cantidad, 0))),
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
        if (val === "Cancelada") {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [21, 128, 61];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    didDrawPage: () => {
      // pie con paginación
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(150);
      doc.text(`${cfg.storeName} · Reporte interno · ${new Date().toLocaleDateString("es-CO")}`, 10, pageH - 6);
      doc.text(`Página ${doc.getNumberOfPages()}`, pageW - 10, pageH - 6, { align: "right" });
    },
  });

  // ───── TOTALES ─────
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
