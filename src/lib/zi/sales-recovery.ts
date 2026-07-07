import type { ProductoVendido, Venta } from "./types";

function recoveredFactura(key: string, first: ProductoVendido) {
  const raw = String(first.ventaId || first.id || key).replace(/[^a-z0-9]/gi, "").slice(-5).toUpperCase();
  return `#REC-${raw || "HIST"}`;
}

function recoveredId(key: string) {
  return `recuperada-${key.replace(/[^a-z0-9:_-]/gi, "")}`;
}

export function ordenarVentasPorFecha<T extends { fecha: number; factura?: string }>(ventas: T[]) {
  return [...ventas].sort((a, b) => (b.fecha || 0) - (a.fecha || 0) || String(b.factura || "").localeCompare(String(a.factura || "")));
}

export function ventasConArchivados(ventas: Venta[], vendidos: ProductoVendido[]) {
  const existentes = new Set(ventas.map((v) => v.id));
  const grupos = new Map<string, ProductoVendido[]>();

  vendidos.forEach((v) => {
    if (v.ventaId && existentes.has(v.ventaId)) return;
    const key = v.ventaId || `vendido:${v.id}`;
    grupos.set(key, [...(grupos.get(key) || []), v]);
  });

  const recuperadas: Venta[] = [...grupos.entries()].map(([key, grupo]) => {
    const first = grupo[0];
    const fecha = first.fechaVenta || first.fechaArchivado || Date.now();
    const productos = grupo.map((v) => {
      const cantidad = Math.max(1, Number(v.cantidad || 1));
      const precioUnitario = Number(v.precio || 0);
      return {
        productoId: v.original?.id || v.id,
        nombre: v.nombre,
        cantidad,
        precioUnitario,
        costo: Number(v.costo || 0),
        subtotal: precioUnitario * cantidad,
        esRapido: true,
      };
    });
    return {
      id: recoveredId(key),
      factura: recoveredFactura(key, first),
      fecha,
      registradaEn: first.fechaArchivado,
      fechaManual: true,
      tipo: "contado",
      local: first.original?.local || 1,
      productos,
      total: productos.reduce((s, p) => s + p.subtotal, 0),
      cliente: first.cliente ? { nombre: first.cliente } : undefined,
      observaciones: ["Recuperada desde Productos vendidos", first.observaciones].filter(Boolean).join(" · "),
    } satisfies Venta;
  });

  return ordenarVentasPorFecha([...ventas, ...recuperadas]);
}

export function isVentaRecuperada(v: Pick<Venta, "id">) {
  return v.id.startsWith("recuperada-");
}