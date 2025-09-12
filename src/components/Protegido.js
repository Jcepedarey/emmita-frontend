// src/components/Protegido.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Protegido({ children }) {
  const navigate = useNavigate();
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
    } else {
      setVerificado(true);
    }
  }, [navigate]);

  if (!verificado) {
    return null; // ⛔️ No mostrar nada hasta verificar
  }

  return children; // ✅ Mostrar contenido solo si hay sesión
}