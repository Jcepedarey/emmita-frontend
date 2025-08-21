// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_KEY;

// ✅ Singleton: evita “Multiple GoTrueClient instances…”
function getSupabase() {
  if (!globalThis.__supabaseSingleton) {
    globalThis.__supabaseSingleton = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "emmita-auth", // si usas otro nombre en el proyecto, cámbialo aquí
      },
    });
  }
  return globalThis.__supabaseSingleton;
}

const supabase = getSupabase();
export default supabase;