import { ziSupabase, ziCloudReady } from "@/integrations/supabase/zi-client";
import { GALERIA_IPHONE, type GaleriaItem } from "./galeria-iphone";

const KEY = "zi_galeria_custom";

export type CustomGaleriaItem = GaleriaItem & { id: string; createdAt: number };

export function readCustomGallery(): CustomGaleriaItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as CustomGaleriaItem[]; } catch { return []; }
}

function saveLocal(items: CustomGaleriaItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
}

export function allGallery(): (GaleriaItem | CustomGaleriaItem)[] {
  return [...readCustomGallery(), ...GALERIA_IPHONE];
}

export async function pullCustomGallery() {
  if (!(await ziCloudReady())) return readCustomGallery();
  const { data, error } = await ziSupabase.from("zi_galeria").select("id,modelo,color,url,created_at").order("created_at", { ascending: false });
  if (error) return readCustomGallery();
  const items = (data || []).map((r: any) => ({ id: r.id, modelo: r.modelo, color: r.color || "", url: r.url, createdAt: new Date(r.created_at).getTime() }));
  saveLocal(items);
  return items;
}

export async function addCustomGallery(item: Omit<CustomGaleriaItem, "id" | "createdAt">) {
  const localItem: CustomGaleriaItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now() };
  saveLocal([localItem, ...readCustomGallery()]);
  if (await ziCloudReady()) {
    const { data } = await ziSupabase.from("zi_galeria").insert({ modelo: item.modelo, color: item.color, url: item.url }).select("id,created_at").maybeSingle();
    if (data?.id) {
      saveLocal(readCustomGallery().map(x => x.id === localItem.id ? { ...localItem, id: data.id, createdAt: new Date(data.created_at).getTime() } : x));
    }
  }
}

export async function removeCustomGallery(id: string) {
  saveLocal(readCustomGallery().filter(x => x.id !== id));
  if (await ziCloudReady()) await ziSupabase.from("zi_galeria").delete().eq("id", id);
}
