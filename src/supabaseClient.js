// src/supabaseClient.js
/* global globalThis */

import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY; // ✅ CORREGIDO: ahora usa ANON_KEY

// Fallback universal: usa globalThis si existe, si no window
const _global = typeof globalThis !== "undefined" ? globalThis : window;

function getSupabase() {
  if (!_global.__supabaseSingleton) {
    _global.__supabaseSingleton = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "emmita-auth", // tu storageKey
      },
    });
  }
  return _global.__supabaseSingleton;
}

const supabase = getSupabase();
export default supabase;