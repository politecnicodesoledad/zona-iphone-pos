// All shared types for Zona iPhone
export type Categoria = "iphone" | "ipad" | "macbook" | "accesorio" | "otro";
export type EstadoProducto = "nuevo" | "usado" | "promocion" | "descuento" | "personalizado";
export type CostoOrigen = "ganancia_neta" | "capital_aparte";
export type EventType =
  | "christmas" | "halloween" | "love" | "carnival" | "mothers" | "independence" | "newyear";

export interface Variante {
  id: string;
  capacidad: string;
  precio: number;
  costo: number;
  stock: number;
}
export interface ColorOpt { nombre: string; hex: string; }

export interface Producto {
  id: string;
  nombre: string;
  categoria: Categoria;
  descripcion?: string;
  estado: EstadoProducto;
  colores: ColorOpt[];
  imagen?: string;
  precio: number;
  costo: number;
  stock: number;
  local: 1 | 2;
  proveedor?: string;
  imei?: string;
  costoOrigen: CostoOrigen;
  variantes?: Variante[];
  creadoEn: number;
}

export interface VentaProducto {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  costo: number;
  subtotal: number;
  descuento?: number;
  esRapido?: boolean;
  varianteId?: string;
  color?: string;
}

export interface Venta {
  id: string;
  factura: string; // #00001
  fecha: number;
  registradaEn?: number;
  fechaManual?: boolean;
  tipo: "contado" | "credito" | "tradein";
  local: 1 | 2;
  asesor?: string;       // nombre del asesor, solo informativo/visual
  asesorId?: string;     // id real de auth.users — esto es lo que se valida en RLS
  productos: VentaProducto[];
  total: number;
  descuentoTotal?: number;   // suma de descuentos por producto (legado)
  descuentoOrden?: number;   // descuento en $ aplicado sobre el total de la venta
  metodoPago?: "efectivo" | "nequi" | "transferencia" | "datafono";
  recibido?: number;
  imei?: string;
  cliente?: { nombre: string; cedula?: string; telefono?: string; direccion?: string };
  empresaCredito?: string;
  creditoCuotas?: number;
  creditoCuotaInicial?: number;
  creditoValorCuota?: number;
  tradeIn?: { marca: string; modelo: string; imei?: string; valor: number; restante: number; metodoRestante: string };
  observaciones?: string;
  garantia?: string;               // texto legal para la factura
  garantiaMeses?: 0 | 6 | 12;       // duración estructurada
  garantiaVencimiento?: number;     // timestamp — se calcula a partir de fecha + garantiaMeses
  cancelada?: boolean;
  canceladaEn?: number;
  razonCancelacion?: string;
}

export interface Gasto {
  id: string;
  descripcion: string;
  monto: number;
  categoria: string;
  local: 1 | 2;
  fecha: number;
  tipo: "operativo" | "compra_inventario";
}

export interface CuotaCRM {
  numero: number;
  fechaPago: number;
  monto: number;
  estado: "pendiente" | "pagada" | "mora";
  pagadaEn?: number;
}
export interface ClienteCRM {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  producto: string;
  total: number;
  cuotaInicial: number;
  cuotas: number;
  cuotasPagadas: number;
  valorCuota: number;
  estado: "al_dia" | "mora" | "pagado" | "solicitud";
  proximoPago: number;
  cuotasDetalle: CuotaCRM[];
  historialAbonos: { fecha: number; monto: number; nota?: string }[];
  pin?: string;
  ventaId?: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  telefono: string;
  banco: string;
  cuenta: string;
  totalDeuda: number;
  abonado: number;
  fechaLimite: number;
  historialAbonos: { fecha: number; monto: number }[];
}

export interface Empleado {
  id: string;
  nombre: string;
  local: 1 | 2;
  tipoPago: "diario" | "mensual";
  monto: number;
  activoHoy: boolean;
  historialPagos: { fecha: number; monto: number; descripcion?: string }[];
}

export interface ProductoVendido {
  id: string;
  nombre: string;
  categoria: Categoria;
  cantidad?: number;
  costo: number;
  precio: number;
  gananciaPotencial: number;
  fechaArchivado: number;
  fechaVenta?: number;
  ventaId?: string;
  cliente?: string;
  detalleExtra?: string;
  observaciones?: string;
  original: Producto;
}

export interface ZIConfig {
  storeName: string;
  storeSubtitle: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  mapsLink: string;
  mapsEmbed: string;
  horario: string;
  direccion: string;
  slogan: string;
  misionQuote: string;
  misionBadge: string;
  logoUrl: string;
  faviconUrl: string;
  videoUrl: string;
  cancelPin: string;
  adminPassword: string;
  facturaSubtitulo: string;
  facturaGarantia: string;
  facturaGracias: string;
  local1nombre: string;
  local2nombre: string;
  local1activo: boolean;
  local2activo: boolean;
  techWhatsapp: string;
  // hero
  heroTagline: string;
  heroImageUrl: string;
  heroMediaType?: "image" | "video";
  heroMediaUrl?: string;
  // event
  eventActive: boolean;
  eventType: EventType;
  eventEndDate: string;
  eventTitle: string;
  eventSubtitle: string;
  eventPromoProductId: string;
  eventPromoPrice: number;
}
