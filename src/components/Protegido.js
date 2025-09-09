// src/components/Protegido.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

export default function Protegido({ children }) {
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let sub;
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return navigate("/login");
      setCargando(false);

      // Escucha cambios de sesión (logout/refresh/expiry)
      const res = supabase.auth.onAuthStateChange((_evt, session) => {
        if (!session) navigate("/login");
      });
      sub = res.data?.subscription;
    };
    run();

    return () => sub?.unsubscribe?.();
  }, [navigate]);

  if (cargando) return null;
  return children;
}
