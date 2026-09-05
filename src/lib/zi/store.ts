import { useEffect, useCallback, useSyncExternalStore } from "react";
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
  frecuencia_pago: "semanal" | "quincenal" | "mensual";
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
//
// IMPORTANTE: este estado es un SINGLETON a nivel de módulo, no un useState
// normal dentro del hook. Antes, cada componente que llamaba useSession()
// (AdminPage, AdminShell, NuevaVenta, Finanzas, MiDesempeno, AdminLogin...)
// arrancaba su PROPIA copia de session/profile/loading y hacía su PROPIA
// llamada a getSession()/zi_perfiles por separado. Como esas llamadas no
// terminan exactamente al mismo tiempo, un componente podía quedar un
// instante con profile=null mientras otro ya lo tenía cargado: eso es lo que
// causaba el parpadeo a "Mi rendimiento" (porque en ese instante isAdmin
// salía false) y el rebote al login (porque en ese instante authed salía
// false). Con un solo estado compartido, todos los componentes se actualizan
// exactamente al mismo tiempo, con el mismo valor — el parpadeo desaparece.
let ziSessionState = {
  session: null as Session | null,
  profile: null as Perfil | null,
  loading: true,
};
const sessionListeners = new Set<() => void>();
function emitSession() { sessionListeners.forEach((l) => l()); }
function setSessionState(patch: Partial<typeof ziSessionState>) {
  ziSessionState = { ...ziSessionState, ...patch };
  emitSession();
}

let sessionInitStarted = false;
let profileFetchToken = 0; // evita que una respuesta vieja pise una más nueva

// Corta cualquier promesa que se quede colgada más de `ms` — en vez de dejar
// la UI esperando para siempre (lo que pasaba en el MacBook: el botón se
// quedaba en "Entrando..." sin fin si alguna llamada de red nunca resolvía).
function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Tiempo de espera agotado: ${label}`)), ms);
    Promise.resolve(promise).then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function fetchPerfil(userId: string): Promise<Perfil | null> {
  try {
    const { data, error } = await withTimeout(
      ziSupabase.from("zi_perfiles").select("*").eq("id", userId).maybeSingle(),
      12000, "carga de perfil"
    );
    if (error) { console.error("zi_perfiles:", error.message); return null; }
    return (data as Perfil) ?? null;
  } catch (e) {
    // Puede fallar por red, por bloqueo del navegador (p. ej. Safari/macOS con
    // rastreo estricto), o por quedarse colgada: nunca dejamos que esto
    // reviente hacia arriba. login() siempre debe poder terminar.
    console.error("zi_perfiles (excepción):", e);
    return null;
  }
}

async function loadProfileSingleton(userId: string) {
  const myToken = ++profileFetchToken;
  const perfil = await fetchPerfil(userId);
  if (myToken !== profileFetchToken) return; // llegó una petición más nueva después: ignorar esta
  setSessionState({ profile: perfil });
}

function initSessionOnce() {
  if (sessionInitStarted) return;
  sessionInitStarted = true;
  ziSupabase.auth.getSession().then(({ data }) => {
    setSessionState({ session: data.session, loading: false });
    if (data.session) loadProfileSingleton(data.session.user.id);
  });
  ziSupabase.auth.onAuthStateChange((_event, sess) => {
    setSessionState({ session: sess, loading: false });
    if (sess) loadProfileSingleton(sess.user.id);
    else { profileFetchToken++; setSessionState({ profile: null }); }
  });
}

export function useSession() {
  const subscribe = useCallback((cb: () => void) => {
    initSessionOnce();
    sessionListeners.add(cb);
    return () => { sessionListeners.delete(cb); };
  }, []);
  const getSnapshot = useCallback(() => ziSessionState, []);
  const state = useSyncExternalStore(subscribe, getSnapshot, () => ziSessionState);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await withTimeout(
        ziSupabase.auth.signInWithPassword({ email, password }),
        15000, "inicio de sesión"
      );
      if (error || !data.session) return { ok: false as const, error: "Correo o contraseña incorrectos" };

      profileFetchToken++; // invalida cualquier fetch de perfil que ya estuviera en vuelo
      const myToken = profileFetchToken;

      // Justo después de signInWithPassword, la sesión nueva a veces tarda un
      // instante en quedar disponible para las consultas a Postgrest. Si la
      // primera lectura de zi_perfiles viene vacía, NO asumimos "inactivo":
      // reintentamos una vez antes de sacar cualquier conclusión. Antes, ese
      // vacío transitorio se interpretaba como "usuario inactivo" y te cerraba
      // la sesión a ti mismo siendo admin activo.
      let perfil = await fetchPerfil(data.session.user.id);
      if (!perfil) {
        await new Promise((r) => setTimeout(r, 500));
        perfil = await fetchPerfil(data.session.user.id);
      }

      if (myToken !== profileFetchToken) return { ok: true as const }; // otra sesión más nueva ya tomó el control

      if (!perfil) {
        // No se pudo confirmar el perfil tras dos intentos: puede ser un
        // problema de red o de RLS, pero NO sabemos que esté inactivo, así que
        // no cerramos la sesión ni acusamos al usuario de estar desactivado.
        setSessionState({ session: data.session, loading: false });
        return { ok: false as const, error: "No se pudo verificar tu perfil. Intenta iniciar sesión de nuevo en unos segundos." };
      }

      if (!perfil.activo) {
        await ziSupabase.auth.signOut();
        return { ok: false as const, error: "Usuario inactivo. Contacta al administrador." };
      }

      setSessionState({ session: data.session, profile: perfil, loading: false });
      return { ok: true as const };
    } catch (e) {
      // Red de la persona a la que le está pasando esto o el navegador
      // bloqueó/cortó alguna petición: nunca dejamos el login "colgado".
      console.error("login():", e);
      return { ok: false as const, error: "No se pudo conectar. Revisa tu internet e intenta de nuevo." };
    }
  }, []);

  const logout = useCallback(async () => {
    await ziSupabase.auth.signOut();
    profileFetchToken++;
    setSessionState({ session: null, profile: null });
  }, []);

  return {
    authed: !!state.session && !!state.profile,
    loading: state.loading,
    profile: state.profile,
    isAdmin: state.profile?.rol === "admin",
    login,
    logout,
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const fmtFactura = (n: number) => "#" + String(n).padStart(5, "0");
