import { jsPDF } from "jspdf";
import type { Venta, ZIConfig } from "./types";
import { fmtCOP, fmtDateTime, maskCedula } from "./format";

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
