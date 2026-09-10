// Cliente Supabase para Zona iPhone.
// URL + anon key son públicos (RLS controla acceso).
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nompupohkjwhzhphuonk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbXB1cG9oa2p3aHpocGh1b25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjY1NDIsImV4cCI6MjA5NTg0MjU0Mn0.xUti-cj-QpYALUbRvcu5qUNAB0PIGnp4H7u7cU7iB0k";

export const ziSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "zi-auth" },
});

// Devuelve true si el schema está creado (heurística: zi_config existe).
// Esta función se llama desde casi todos los caminos de sincronización, así
// que el timeout va aquí mismo (no en cada quien la llama) — así nadie se
// puede olvidar de protegerla, y una red colgada nunca bloquea el resto de
// la app para siempre.
export async function ziCloudReady(): Promise<boolean> {
  try {
    const query = ziSupabase.from("zi_config").select("id").limit(1);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout: conexión")), 6000));
    const { error } = await Promise.race([query, timeout]);
    return !error;
  } catch {
    return false;
  }
}
