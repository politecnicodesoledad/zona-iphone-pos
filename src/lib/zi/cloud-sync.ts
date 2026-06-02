// Sincronización localStorage ⇆ Supabase para Zona iPhone.
// Modelo: cada colección se sube/baja como filas { id, data: {...entidad} }.
import { ziSupabase, ziCloudReady } from "@/integrations/supabase/zi-client";
import { Store, DEFAULT_CONFIG } from "./store";
import type { Venta } from "./types";

const COLLECTIONS = [
  { key: "productos", get: () => Store.productos(), set: (v: any[]) => Store.setProductos(v as any) },
  { key: "vendidos", get: () => Store.vendidos(), set: (v: any[]) => Store.setVendidos(v as any) },
  { key: "ventas", get: () => Store.ventas(), set: (v: any[]) => Store.setVentas(v as any) },
  { key: "gastos", get: () => Store.gastos(), set: (v: any[]) => Store.setGastos(v as any) },
  { key: "clientes", get: () => Store.clientes(), set: (v: any[]) => Store.setClientes(v as any) },
] as const;

// Estas tres no tienen helpers en Store; las leemos directo de localStorage.
const RAW_COLLECTIONS = ["otros", "proveedores", "empleados"] as const;

function readLS<T = unknown>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(`zi_${key}`) || "[]") as T[]; } catch { return []; }
}
function writeLS(key: string, v: unknown) {
  localStorage.setItem(`zi_${key}`, JSON.stringify(v));
  window.dispatchEvent(new StorageEvent("storage", { key: `zi_${key}` }));
}

export interface SyncReport { ok: boolean; message: string; details?: string[] }

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
      if (items.length === 0) { details.push(`· ${c.key}: vacío`); continue; }
      const rows = items.map((it: any) => ({
        id: it.id,
        data: it,
        ...(c.key === "ventas" ? { fecha: new Date((it as Venta).fecha).toISOString() } : {}),
      }));
      const { error } = await ziSupabase.from(`zi_${c.key}`).upsert(rows);
      if (error) throw new Error(`${c.key}: ${error.message}`);
      details.push(`✓ ${c.key}: ${items.length}`);
    }
    for (const k of RAW_COLLECTIONS) {
      const items = readLS<{ id: string }>(k);
      if (items.length === 0) { details.push(`· ${k}: vacío`); continue; }
      const rows = items.map((it) => ({ id: it.id, data: it }));
      const { error } = await ziSupabase.from(`zi_${k}`).upsert(rows);
      if (error) throw new Error(`${k}: ${error.message}`);
      details.push(`✓ ${k}: ${items.length}`);
    }
    return { ok: true, message: "Datos subidos a la nube ✓", details };
  } catch (e: any) {
    return { ok: false, message: e.message || String(e), details };
  }
}

export async function pullAllFromCloud(): Promise<SyncReport> {
  if (!(await ziCloudReady())) {
    return { ok: false, message: "El schema no está creado en Supabase. Pega SUPABASE_SETUP.sql primero." };
  }
  const details: string[] = [];
  try {
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
      const arr = (data || []).map((r: any) => r.data);
      c.set(arr);
      details.push(`✓ ${c.key}: ${arr.length}`);
    }
    for (const k of RAW_COLLECTIONS) {
      const { data, error } = await ziSupabase.from(`zi_${k}`).select("data");
      if (error) throw new Error(`${k}: ${error.message}`);
      const arr = (data || []).map((r: any) => r.data);
      writeLS(k, arr);
      details.push(`✓ ${k}: ${arr.length}`);
    }
    window.dispatchEvent(new Event("storage"));
    return { ok: true, message: "Datos bajados de la nube ✓", details };
  } catch (e: any) {
    return { ok: false, message: e.message || String(e), details };
  }
}
