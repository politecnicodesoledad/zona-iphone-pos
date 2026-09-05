// Sincronización localStorage ⇆ Supabase para Zona iPhone.
// Modelo: cada colección se sube/baja como filas { id, data: {...entidad} }.
import { ziSupabase, ziCloudReady } from "@/integrations/supabase/zi-client";
import { Store, DEFAULT_CONFIG, withTimeout } from "./store";
import type { Venta, ZIConfig } from "./types";

// Ninguna llamada a Supabase dentro de este archivo puede quedarse esperando
// para siempre: si la red de la persona se queda "a medias" (pasa sobre todo
// en algunas Mac/Safari), sin este límite la sincronización se cuelga en
// silencio — y como corre cada 15s (ver useCloudBoot), las llamadas colgadas
// se acumulan y terminan tapando TODAS las conexiones del navegador,
// incluido el propio login. Con el timeout, una falla se resuelve en 10s en
// vez de bloquear la app indefinidamente.
const NET_TIMEOUT = 10000;
function withNetTimeout<T>(p: PromiseLike<T>, label: string) { return withTimeout(p, NET_TIMEOUT, label); }

const COLLECTIONS = [
  { key: "productos", get: () => Store.productos(), set: (v: any[]) => Store.setProductos(v as any) },
  { key: "vendidos", get: () => Store.vendidos(), set: (v: any[]) => Store.setVendidos(v as any) },
  { key: "ventas", get: () => Store.ventas(), set: (v: any[]) => Store.setVentas(v as any) },
  { key: "gastos", get: () => Store.gastos(), set: (v: any[]) => Store.setGastos(v as any) },
  { key: "clientes", get: () => Store.clientes(), set: (v: any[]) => Store.setClientes(v as any) },
] as const;

// Estas tres no tienen helpers en Store; las leemos directo de localStorage.
const RAW_COLLECTIONS = ["otros", "proveedores", "empleados"] as const;

let applyingCloud = false;

function setApplyingCloud(v: boolean) {
  applyingCloud = v;
  if (typeof window !== "undefined") (window as any).__ziApplyingCloud = v;
}

function readLS<T = unknown>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(`zi_${key}`) || "[]") as T[]; } catch { return []; }
}
function writeLS(key: string, v: unknown) {
  localStorage.setItem(`zi_${key}`, JSON.stringify(v));
  window.dispatchEvent(new StorageEvent("storage", { key: `zi_${key}` }));
}

function isDirty(key: string) { return !!localStorage.getItem(`zi_dirty_${key}`); }
function clearDirty(key: string) { localStorage.removeItem(`zi_dirty_${key}`); }

export interface SyncReport { ok: boolean; message: string; details?: string[] }

async function recordCloudDeletion(key: string, id: string, at = Date.now()) {
  try {
    await ziSupabase.from("zi_deletions").upsert(
      { collection: key, item_id: id, deleted_at: new Date(at).toISOString() },
      { onConflict: "collection,item_id" },
    );
  } catch { /* zi_deletions puede no existir hasta correr el SQL nuevo */ }
}

async function pushLocalTombstones(key: string) {
  if (HISTORY_COLLECTIONS.has(key)) return;
  const tombstones = readLS<{ id: string; at: number }>(`deleted_${key}`);
  if (tombstones.length === 0) return;
  await Promise.all(tombstones.map((x) => recordCloudDeletion(key, x.id, x.at)));
  await Promise.all(tombstones.map((x) => ziSupabase.from(`zi_${key}`).delete().eq("id", x.id)));
}

function localDeletionSet(key: string) {
  return new Set(readLS<{ id: string; at: number }>(`deleted_${key}`).map((x) => x.id));
}

const HISTORY_COLLECTIONS = new Set(["ventas", "gastos", "vendidos"]);

async function upsertRows(key: string, items: any[]) {
  await pushLocalTombstones(key);
  const rows = items.filter((it) => it?.id).map((it) => ({
    id: it.id,
    data: it,
    ...(key === "ventas" ? {
      fecha: new Date((it as Venta).fecha).toISOString(),
      // RLS valida esta columna real, no lo que va dentro de "data" — por eso
      // hay que replicarla aquí explícitamente.
      asesor_id: (it as Venta).asesorId || null,
    } : {}),
    updated_at: new Date().toISOString(),
  }));
  const result = rows.length ? await ziSupabase.from(`zi_${key}`).upsert(rows) : ({ error: null } as any);
  if (!result.error) clearDirty(key);
  return result;
}

export async function pushConfigToCloud(cfg: ZIConfig) {
  if (applyingCloud || !(await ziCloudReady())) return;
  await ziSupabase.from("zi_config").upsert({ id: "singleton", data: cfg, updated_at: new Date().toISOString() });
}

export async function pushCollectionToCloud(key: string, value: unknown) {
  if (applyingCloud || !(await ziCloudReady())) return;
  if (key === "facturaNum") {
    await ziSupabase.from("zi_counters").upsert({ name: "factura", value: Number(value) || 1, updated_at: new Date().toISOString() });
    return;
  }
  if (Array.isArray(value)) await upsertRows(key, value);
}

export async function nextFacturaNumber(fallback: number) {
  if (!(await ziCloudReady())) return fallback;
  const { data, error } = await ziSupabase.rpc("zi_next_factura");
  if (error || typeof data !== "number") return fallback;
  return data;
}

export async function pushAllToCloud(): Promise<SyncReport> {
  if (!(await ziCloudReady())) {
    return { ok: false, message: "El schema no está creado en Supabase. Pega SUPABASE_SETUP.sql en el SQL Editor primero." };
  }
  const details: string[] = [];
  try {
    // config
    const cfg = Store.config();
    await withNetTimeout(ziSupabase.from("zi_config").upsert({ id: "singleton", data: cfg, updated_at: new Date().toISOString() }), "configuración");
    details.push("✓ configuración");

    // counters
    await withNetTimeout(ziSupabase.from("zi_counters").upsert({ name: "factura", value: Store.facturaNum(), updated_at: new Date().toISOString() }), "contador");
    details.push("✓ contadores");

    for (const c of COLLECTIONS) {
      const items = c.get();
      const { error } = await withNetTimeout(upsertRows(c.key, items), c.key);
      if (error) throw new Error(`${c.key}: ${error.message}`);
      details.push(items.length === 0 ? `✓ ${c.key}: vacío sincronizado` : `✓ ${c.key}: ${items.length}`);
    }
    for (const k of RAW_COLLECTIONS) {
      const items = readLS<{ id: string }>(k);
      const { error } = await withNetTimeout(upsertRows(k, items), k);
      if (error) throw new Error(`${k}: ${error.message}`);
      details.push(items.length === 0 ? `✓ ${k}: vacío sincronizado` : `✓ ${k}: ${items.length}`);
    }
    return { ok: true, message: "Datos subidos a la nube ✓", details };
  } catch (e: any) {
    return { ok: false, message: e.message || String(e), details };
  }
}

function mergeById<T extends { id: string }>(local: T[], remote: T[], preferLocal = false) {
  const m = new Map<string, T>();
  (preferLocal ? remote : local).forEach((it) => it?.id && m.set(it.id, it));
  (preferLocal ? local : remote).forEach((it) => it?.id && m.set(it.id, it));
  return Array.from(m.values());
}

async function readCloudDeletions() {
  const out = new Map<string, Set<string>>();
  try {
    const { data } = await withNetTimeout(ziSupabase.from("zi_deletions").select("collection,item_id"), "eliminaciones");
    (data || []).forEach((r: any) => {
      if (HISTORY_COLLECTIONS.has(r.collection)) return;
      if (!out.has(r.collection)) out.set(r.collection, new Set());
      out.get(r.collection)!.add(r.item_id);
    });
  } catch { /* tabla opcional para instalaciones antiguas */ }
  [...COLLECTIONS.map((c) => c.key), ...RAW_COLLECTIONS].forEach((key) => {
    if (HISTORY_COLLECTIONS.has(key)) return;
    const local = localDeletionSet(key);
    if (local.size === 0) return;
    if (!out.has(key)) out.set(key, new Set());
    local.forEach((id) => out.get(key)!.add(id));
  });
  return out;
}

function removeDeleted<T extends { id?: string }>(items: T[], deleted?: Set<string>) {
  if (!deleted || deleted.size === 0) return items;
  return items.filter((it) => !it?.id || !deleted.has(it.id));
}

function sortCollection(key: string, items: any[]) {
  if (key === "ventas" || key === "gastos") return [...items].sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
  if (key === "vendidos") return [...items].sort((a, b) => (b.fechaVenta || b.fechaArchivado || 0) - (a.fechaVenta || a.fechaArchivado || 0));
  return items;
}

export async function pullAllFromCloud(options: { merge?: boolean; silent?: boolean } = {}): Promise<SyncReport> {
  if (!(await ziCloudReady())) {
    return { ok: false, message: "El schema no está creado en Supabase. Pega SUPABASE_SETUP.sql primero." };
  }
  const details: string[] = [];
  try {
    setApplyingCloud(true);
    const deleted = await readCloudDeletions();
    const { data: cfgRow } = await withNetTimeout(ziSupabase.from("zi_config").select("data").eq("id", "singleton").maybeSingle(), "config");
    if (cfgRow?.data) {
      localStorage.setItem("zi_config", JSON.stringify({ ...DEFAULT_CONFIG, ...cfgRow.data }));
      details.push("✓ configuración");
    }
    const { data: counter } = await withNetTimeout(ziSupabase.from("zi_counters").select("value").eq("name", "factura").maybeSingle(), "contador");
    if (counter?.value) { writeLS("facturaNum", counter.value); details.push("✓ contadores"); }

    for (const c of COLLECTIONS) {
      const { data, error } = await withNetTimeout(ziSupabase.from(`zi_${c.key}`).select("data"), c.key);
      if (error) throw new Error(`${c.key}: ${error.message}`);
      const remote = removeDeleted((data || []).map((r: any) => r.data), deleted.get(c.key));
      const local = c.get() as any[];
      const arr = sortCollection(c.key, removeDeleted(options.merge ? mergeById(local, remote, isDirty(c.key)) : remote, deleted.get(c.key)));
      c.set(arr);
      details.push(`✓ ${c.key}: ${arr.length}`);
    }
    for (const k of RAW_COLLECTIONS) {
      const { data, error } = await withNetTimeout(ziSupabase.from(`zi_${k}`).select("data"), k);
      if (error) throw new Error(`${k}: ${error.message}`);
      const remote = removeDeleted((data || []).map((r: any) => r.data), deleted.get(k));
      const local = readLS<any>(k);
      const arr = sortCollection(k, removeDeleted(options.merge ? mergeById(local, remote, isDirty(k)) : remote, deleted.get(k)));
      writeLS(k, arr);
      details.push(`✓ ${k}: ${arr.length}`);
    }
    window.dispatchEvent(new Event("storage"));
    return { ok: true, message: "Datos bajados de la nube ✓", details };
  } catch (e: any) {
    return { ok: false, message: e.message || String(e), details };
  } finally {
    setApplyingCloud(false);
  }
}
