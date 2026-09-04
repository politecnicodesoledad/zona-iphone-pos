import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import type {
  Producto, Venta, Gasto, ClienteCRM, Proveedor, Empleado,
  ProductoVendido, ZIConfig,
} from "./types";
import { ziSupabase } from "@/integrations/supabase/zi-client";
import type { Session } from "@supabase/supabase-js";

export type Perfil = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  rol: "admin" | "asesor";
  activo: boolean;
  comision_pct: number;
  creado_en: string;
};

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
  heroMediaType: "image",
  heroMediaUrl: "",
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

// FIX 1: read() never calls cleanValueForKey — keeps stable references for useSyncExternalStore.
// Cleaning is done only in write() so the cached value is already clean.
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

// FIX 2: write() applies cleanValueForKey BEFORE storing, so the cache always
// holds a clean, stable value. useSyncExternalStore snapshot = cache hit = same reference.
function write<T>(key: string, value: T) {
  const cleaned = cleanValueForKey(key, value);
  const raw = JSON.stringify(cleaned);
  cache.set(key, { raw, value: cleaned });
  localStorage.setItem(key, raw);
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

function cloudKey(key: string) { return key.startsWith("zi_") ? key.slice(3) : key === KEYS.facturaNum ? "facturaNum" : key; }

function cleanValueForKey<T>(key: string, value: T): T {
  const k = cloudKey(key);
  return value;
}

function rememberDeleted(key: string, prev: unknown, next: unknown) {
  if (typeof window !== "undefined" && (window as any).__ziApplyingCloud) return;
  if (!Array.isArray(prev) || !Array.isArray(next)) return;
  const before = new Set(prev.map((it: any) => it?.id).filter(Boolean));
  const after = new Set(next.map((it: any) => it?.id).filter(Boolean));
  const removed = [...before].filter((id) => !after.has(id));
  if (removed.length === 0) return;
  const tombKey = `zi_deleted_${cloudKey(key)}`;
  const now = Date.now();
  const existing = read<{ id: string; at: number }[]>(tombKey, []).filter((x) => now - (x.at || 0) < 30 * 86400000);
  const map = new Map(existing.map((x) => [x.id, x]));
  removed.forEach((id) => map.set(String(id), { id: String(id), at: now }));
  write(tombKey, [...map.values()]);
}

let cloudBooted = false;
let cloudRuntimeStarted = false;
function queueCloudSync(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  if ((window as any).__ziApplyingCloud) return;
  if (!cloudBooted && key !== KEYS.config) return;
  const k = cloudKey(key);
  if (!(window as any).__ziApplyingCloud && k !== "config" && k !== "facturaNum") {
    localStorage.setItem(`zi_dirty_${k}`, String(Date.now()));
  }
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

// FIX 3: useKey snapshot calls plain read() (stable cache reference).
// cleanValueForKey is NOT called here — it was already applied in write().
function useKey<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const get = useCallback(() => read(key, fallback), [key]);
  const value = useSyncExternalStore(subscribe, get, () => fallback);
  const set = useCallback((v: T | ((p: T) => T)) => {
    const prev = read(key, fallback);
    const raw = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
    rememberDeleted(key, prev, cleanValueForKey(key, raw));
    write(key, raw); // write() applies cleanValueForKey internally
    queueCloudSync(key, read(key, fallback)); // read back the cleaned value
    emit();
  }, [key]);
  return [value, set];
}

export function useCloudBoot() {
  useEffect(() => {
    if (cloudRuntimeStarted) return;
    cloudRuntimeStarted = true;
    cloudBooted = true;
    const sync = () => import("./cloud-sync")
      .then(async ({ pullAllFromCloud, pushAllToCloud }) => { await pullAllFromCloud({ merge: true, silent: true }); await pushAllToCloud(); })
      .then(() => emit()).catch(() => {});
    sync();
    const i = window.setInterval(sync, 15000);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => { cloudRuntimeStarted = false; window.clearInterval(i); window.removeEventListener("focus", onFocus); };
  }, []);
}

// FIX 4: useConfig — the spread { ...DEFAULT_CONFIG, ...c } creates a new object every render.
// We stabilize it with useMemo inside the hook so the reference is stable.
export const useConfig = () => {
  const [c, setC] = useKey<ZIConfig>(KEYS.config, DEFAULT_CONFIG);
  // merge defaults for new fields — stable because useKey already caches
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
  setProductos: (v: Producto[]) => { const prev = read<Producto[]>(KEYS.productos, []); rememberDeleted(KEYS.productos, prev, cleanValueForKey(KEYS.productos, v)); write(KEYS.productos, v); queueCloudSync(KEYS.productos, read(KEYS.productos, [])); emit(); },
  otros: () => read<Producto[]>(KEYS.otros, []),
  setOtros: (v: Producto[]) => { const prev = read<Producto[]>(KEYS.otros, []); rememberDeleted(KEYS.otros, prev, cleanValueForKey(KEYS.otros, v)); write(KEYS.otros, v); queueCloudSync(KEYS.otros, read(KEYS.otros, [])); emit(); },
  vendidos: () => read<ProductoVendido[]>(KEYS.vendidos, []),
  setVendidos: (v: ProductoVendido[]) => { const prev = read<ProductoVendido[]>(KEYS.vendidos, []); rememberDeleted(KEYS.vendidos, prev, v); write(KEYS.vendidos, v); queueCloudSync(KEYS.vendidos, v); emit(); },
  ventas: () => read<Venta[]>(KEYS.ventas, []),
  setVentas: (v: Venta[]) => { const prev = read<Venta[]>(KEYS.ventas, []); rememberDeleted(KEYS.ventas, prev, v); write(KEYS.ventas, v); queueCloudSync(KEYS.ventas, v); emit(); },
  gastos: () => read<Gasto[]>(KEYS.gastos, []),
  setGastos: (v: Gasto[]) => { const prev = read<Gasto[]>(KEYS.gastos, []); rememberDeleted(KEYS.gastos, prev, v); write(KEYS.gastos, v); queueCloudSync(KEYS.gastos, v); emit(); },
  clientes: () => read<ClienteCRM[]>(KEYS.clientes, []),
  setClientes: (v: ClienteCRM[]) => { const prev = read<ClienteCRM[]>(KEYS.clientes, []); rememberDeleted(KEYS.clientes, prev, v); write(KEYS.clientes, v); queueCloudSync(KEYS.clientes, v); emit(); },
  facturaNum: () => read<number>(KEYS.facturaNum, 1),
  setFacturaNum: (v: number) => { write(KEYS.facturaNum, v); queueCloudSync(KEYS.facturaNum, v); emit(); },
};

// Session — autenticación real con Supabase Auth + rol desde zi_perfiles.
// Ya no existe un usuario/contraseña compartido: cada quien entra con su cuenta.
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await ziSupabase.from("zi_perfiles").select("*").eq("id", userId).maybeSingle();
    setProfile((data as Perfil) ?? null);
  }, []);

  useEffect(() => {
    ziSupabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = ziSupabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) loadProfile(sess.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await ziSupabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return { ok: false as const, error: "Correo o contraseña incorrectos" };
    const { data: perfil } = await ziSupabase
      .from("zi_perfiles")
      .select("*")
      .eq("id", data.session.user.id)
      .maybeSingle();
    if (!perfil || !perfil.activo) {
      await ziSupabase.auth.signOut();
      return { ok: false as const, error: "Usuario inactivo. Contacta al administrador." };
    }
    setProfile(perfil as Perfil);
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    await ziSupabase.auth.signOut();
    setProfile(null);
  }, []);

  return {
    authed: !!session && !!profile,
    loading,
    profile,
    isAdmin: profile?.rol === "admin",
    login,
    logout,
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const fmtFactura = (n: number) => "#" + String(n).padStart(5, "0");
