// src/utils/auth.js
import supabase from "../supabaseClient";

export const getNombreUsuario = (user) =>
  user?.user_metadata?.nombre ||
  user?.email?.split("@")?.[0] ||
  "Administrador";

export const cargarUsuarioActual = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
};