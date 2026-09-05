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
export async function ziCloudReady(): Promise<boolean> {
  try {
    const { error } = await ziSupabase.from("zi_config").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
