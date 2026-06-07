// Sincronización localStorage ⇆ Supabase para Zona iPhone.
// Modelo: cada colección se sube/baja como filas { id, data: {...entidad} }.
import { ziSupabase, ziCloudReady } from "@/integrations/supabase/zi-client";
import { Store, DEFAULT_CONFIG } from "./store";
import type { Venta, ZIConfig } from "./types";

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

const DELETE_MISSING_ON_PUSH = new Set(["productos", "otros", "vendidos", "ventas", "gastos", "clientes", "proveedores", "empleados"]);

async function recordCloudDeletion(key: string, id: string, at = Date.now()) {
  try {
    await ziSupabase.from("zi_deletions").upsert(
      { collection: key, item_id: id, deleted_at: new Date(at).toISOString() },
      { onConflict: "collection,item_id" },
    );
  } catch { /* zi_deletions puede no existir hasta correr el SQL nuevo */ }
}

async function pushLocalTombstones(key: string) {
  const tombstones = readLS<{ id: string; at: number }>(`deleted_${key}`);
  if (tombstones.length === 0) return;
  await Promise.all(tombstones.map((x) => recordCloudDeletion(key, x.id, x.at)));
  await Promise.all(tombstones.map((x) => ziSupabase.from(`zi_${key}`).delete().eq("id", x.id)));
}

function localDeletionSet(key: string) {
  return new Set(readLS<{ id: string; at: number }>(`deleted_${key}`).map((x) => x.id));
}

async function deleteMissingRows(key: string, ids: string[]) {
  if (!DELETE_MISSING_ON_PUSH.has(key)) return;
  const { data } = await ziSupabase.from(`zi_${key}`).select("id");
  const keep = new Set(ids);
  const missing = (data || []).map((r: any) => r.id).filter((id: string) => !keep.has(id));
  if (missing.length) {
    await Promise.all(missing.map((id: string) => ziSupabase.from(`zi_${key}`).delete().eq("id", id)));
    await Promise.all(missing.map((id: string) => recordCloudDeletion(key, id)));
  }
}

async function upsertRows(key: string, items: any[]) {
  await pushLocalTombstones(key);
  const rows = items.filter((it) => it?.id).map((it) => ({
    id: it.id,
    data: it,
    ...(key === "ventas" ? { fecha: new Date((it as Venta).fecha).toISOString() } : {}),
    updated_at: new Date().toISOString(),
  }));
  const result = rows.length ? await ziSupabase.from(`zi_${key}`).upsert(rows) : ({ error: null } as any);
  if (!result.error) await deleteMissingRows(key, rows.map((r) => r.id));
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
    await ziSupabase.from("zi_config").upsert({ id: "singleton", data: cfg, updated_at: new Date().toISOString() });
    details.push("✓ configuración");

    // counters
    await ziSupabase.from("zi_counters").upsert({ name: "factura", value: Store.facturaNum(), updated_at: new Date().toISOString() });
    details.push("✓ contadores");

    for (const c of COLLECTIONS) {
      const items = c.get();
      const { error } = await upsertRows(c.key, items);
      if (error) throw new Error(`${c.key}: ${error.message}`);
      details.push(items.length === 0 ? `✓ ${c.key}: vacío sincronizado` : `✓ ${c.key}: ${items.length}`);
    }
    for (const k of RAW_COLLECTIONS) {
      const items = readLS<{ id: string }>(k);
      const { error } = await upsertRows(k, items);
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
    const { data } = await ziSupabase.from("zi_deletions").select("collection,item_id");
    (data || []).forEach((r: any) => {
      if (!out.has(r.collection)) out.set(r.collection, new Set());
      out.get(r.collection)!.add(r.item_id);
    });
  } catch { /* tabla opcional para instalaciones antiguas */ }
  [...COLLECTIONS.map((c) => c.key), ...RAW_COLLECTIONS].forEach((key) => {
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

export async function pullAllFromCloud(options: { merge?: boolean; silent?: boolean } = {}): Promise<SyncReport> {
  if (!(await ziCloudReady())) {
    return { ok: false, message: "El schema no está creado en Supabase. Pega SUPABASE_SETUP.sql primero." };
  }
  const details: string[] = [];
  try {
    setApplyingCloud(true);
    const deleted = await readCloudDeletions();
    const { data: cfgRow } = await ziSupabase.from("zi_config").select("data").eq("id", "singleton").maybeSingle();
    if (cfgRow?.data) {
      localStorage.setItem("zi_config", JSON.stringify({ ...DEFAULT_CONFIG, ...cfgRow.data }));
      details.push("✓ configuración");
    }
    const { data: counter } = await ziSupabase.from("zi_counters").select("value").eq("name", "factura").maybeSingle();
    if (counter?.value) { writeLS("facturaNum", counter.value); details.push("✓ contadores"); }

    for (const c of COLLECTIONS) {
      const { data, error } = await ziSupabase.from(`zi_${c.key}`).select("data");
      if (error) throw new Error(`${c.key}: ${error.message}`);
      const remote = removeDeleted((data || []).map((r: any) => r.data), deleted.get(c.key));
      const arr = removeDeleted(options.merge && isDirty(c.key) ? mergeById(c.get() as any[], remote, true) : remote, deleted.get(c.key));
      c.set(arr);
      details.push(`✓ ${c.key}: ${arr.length}`);
    }
    for (const k of RAW_COLLECTIONS) {
      const { data, error } = await ziSupabase.from(`zi_${k}`).select("data");
      if (error) throw new Error(`${k}: ${error.message}`);
      const remote = removeDeleted((data || []).map((r: any) => r.data), deleted.get(k));
      const arr = removeDeleted(options.merge && isDirty(k) ? mergeById(readLS<any>(k), remote, true) : remote, deleted.get(k));
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
