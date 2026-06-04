import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import type {
  Producto, Venta, Gasto, ClienteCRM, Proveedor, Empleado,
  ProductoVendido, ZIConfig,
} from "./types";

const KEYS = {
  config: "zi_config",
  productos: "zi_productos",
  otros: "zi_otros",
  ventas: "zi_ventas",
  gastos: "zi_gastos",
  clientes: "zi_clientes",
  proveedores: "zi_proveedores",
  empleados: "zi_empleados",
  vendidos: "zi_vendidos",
  facturaNum: "zi_facturaNum",
} as const;

export const DEFAULT_CONFIG: ZIConfig = {
  storeName: "Zona iPhone",
  storeSubtitle: "Celulares & Accesorios",
  whatsapp: "573233039179",
  instagram: "https://www.instagram.com/zona.iphonebq",
  facebook: "https://www.facebook.com/zona.iphonebq",
  mapsLink: "https://maps.app.goo.gl/1A4Cmb6BbMrHuTH69",
  mapsEmbed: "https://maps.google.com/maps?q=San+Andresito+El+Pupi+Barranquilla&output=embed",
  horario: "Lunes a Sábado · 9am – 6pm",
  direccion: "San Andresito El Pupi, Local 23, Barranquilla, Colombia",
  slogan: "Líderes en Exclusividad",
  misionQuote: "En Zona iPhone somos el lugar indicado para comprar tu iPhone en Barranquilla.",
  misionBadge: "✦ Tu tienda Apple de confianza en Barranquilla ✦",
  logoUrl: "https://i.ibb.co/1fkNNh5s/favicon-Zona-Iphone.png",
  faviconUrl: "https://i.ibb.co/1fkNNh5s/favicon-Zona-Iphone.png",
  videoUrl: "",
  cancelPin: "1234",
  adminPassword: "zonaiphone2025",
  facturaSubtitulo: "CELULARES & ACCESORIOS",
  facturaGarantia: "Garantía de 30 días en defectos de fábrica. No cubre daños por mal uso, líquidos o golpes.",
  facturaGracias: "¡Gracias por tu compra! Síguenos en @zona.iphonebq",
  local1nombre: "Local 1",
  local2nombre: "Local 2",
  local1activo: true,
  local2activo: true,
  techWhatsapp: "https://wa.me/573233039179?text=Hola!%20Necesito%20servicio%20t%C3%A9cnico%20para%20mi%20iPhone",
  heroTagline: "Tienda Apple en Barranquilla",
  heroImageUrl: "",
  eventActive: false,
  eventType: "christmas",
  eventEndDate: "",
  eventTitle: "",
  eventSubtitle: "",
  eventPromoProductId: "",
  eventPromoPrice: 0,
};

// --- raw helpers ---
const cache = new Map<string, { raw: string; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.value as T;
    const value = JSON.parse(raw) as T;
    cache.set(key, { raw, value });
    return value;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  const raw = JSON.stringify(value);
  cache.set(key, { raw, value });
  localStorage.setItem(key, raw);
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

let cloudBooted = false;
function cloudKey(key: string) { return key.startsWith("zi_") ? key.slice(3) : key === KEYS.facturaNum ? "facturaNum" : key; }
function queueCloudSync(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  if (!cloudBooted && key !== KEYS.config) return;
  const k = cloudKey(key);
  window.setTimeout(() => {
    import("./cloud-sync").then(({ pushConfigToCloud, pushCollectionToCloud }) => {
      if (k === "config") return pushConfigToCloud(value as ZIConfig);
      if (k === "facturaNum") return pushCollectionToCloud("facturaNum", value);
      return pushCollectionToCloud(k, Array.isArray(value) ? value : []);
    }).catch(() => {});
  }, 120);
}

// --- subscription system ---
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

function useKey<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const get = useCallback(() => read(key, fallback), [key]);
  const value = useSyncExternalStore(subscribe, get, () => fallback);
  const set = useCallback((v: T | ((p: T) => T)) => {
    const prev = read(key, fallback);
    const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
    write(key, next);
    queueCloudSync(key, next);
    emit();
  }, [key]);
  return [value, set];
}

export function useCloudBoot() {
  useEffect(() => {
    if (cloudBooted) return;
    cloudBooted = true;
    const sync = () => import("./cloud-sync").then(({ pullAllFromCloud }) => pullAllFromCloud({ merge: true, silent: true })).then(() => emit()).catch(() => {});
    sync();
    const i = window.setInterval(sync, 15000);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(i); window.removeEventListener("focus", onFocus); };
  }, []);
}

// --- typed hooks ---
export const useConfig = () => {
  const [c, setC] = useKey<ZIConfig>(KEYS.config, DEFAULT_CONFIG);
  // merge defaults for new fields
  const merged = { ...DEFAULT_CONFIG, ...c };
  return [merged, setC] as const;
};
export const useProductos = () => useKey<Producto[]>(KEYS.productos, []);
export const useOtros = () => useKey<Producto[]>(KEYS.otros, []);
export const useVentas = () => useKey<Venta[]>(KEYS.ventas, []);
export const useGastos = () => useKey<Gasto[]>(KEYS.gastos, []);
export const useClientes = () => useKey<ClienteCRM[]>(KEYS.clientes, []);
export const useProveedores = () => useKey<Proveedor[]>(KEYS.proveedores, []);
export const useEmpleados = () => useKey<Empleado[]>(KEYS.empleados, []);
export const useVendidos = () => useKey<ProductoVendido[]>(KEYS.vendidos, []);
export const useFacturaNum = () => useKey<number>(KEYS.facturaNum, 1);

// non-hook read for one-off operations
export const Store = {
  config: () => ({ ...DEFAULT_CONFIG, ...read<ZIConfig>(KEYS.config, DEFAULT_CONFIG) }),
  productos: () => read<Producto[]>(KEYS.productos, []),
  setProductos: (v: Producto[]) => { write(KEYS.productos, v); queueCloudSync(KEYS.productos, v); emit(); },
  otros: () => read<Producto[]>(KEYS.otros, []),
  setOtros: (v: Producto[]) => { write(KEYS.otros, v); queueCloudSync(KEYS.otros, v); emit(); },
  vendidos: () => read<ProductoVendido[]>(KEYS.vendidos, []),
  setVendidos: (v: ProductoVendido[]) => { write(KEYS.vendidos, v); queueCloudSync(KEYS.vendidos, v); emit(); },
  ventas: () => read<Venta[]>(KEYS.ventas, []),
  setVentas: (v: Venta[]) => { write(KEYS.ventas, v); queueCloudSync(KEYS.ventas, v); emit(); },
  gastos: () => read<Gasto[]>(KEYS.gastos, []),
  setGastos: (v: Gasto[]) => { write(KEYS.gastos, v); queueCloudSync(KEYS.gastos, v); emit(); },
  clientes: () => read<ClienteCRM[]>(KEYS.clientes, []),
  setClientes: (v: ClienteCRM[]) => { write(KEYS.clientes, v); queueCloudSync(KEYS.clientes, v); emit(); },
  facturaNum: () => read<number>(KEYS.facturaNum, 1),
  setFacturaNum: (v: number) => { write(KEYS.facturaNum, v); queueCloudSync(KEYS.facturaNum, v); emit(); },
};

// Session
export function useSession() {
  const [authed, setAuthed] = useState(() =>
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("zi_session") === "1");
  useEffect(() => {
    const handler = () => setAuthed(sessionStorage.getItem("zi_session") === "1");
    window.addEventListener("zi-session", handler);
    return () => window.removeEventListener("zi-session", handler);
  }, []);
  const login = (pw: string) => {
    if (pw === Store.config().adminPassword) {
      sessionStorage.setItem("zi_session", "1");
      window.dispatchEvent(new Event("zi-session"));
      return true;
    }
    return false;
  };
  const logout = () => {
    sessionStorage.removeItem("zi_session");
    window.dispatchEvent(new Event("zi-session"));
  };
  return { authed, login, logout };
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const fmtFactura = (n: number) => "#" + String(n).padStart(5, "0");
