// src/components/Protegido.js
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Protegido() {
  const navigate = useNavigate();

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
    }
  }, [navigate]);

  return null; // Este componente solo redirige si no hay sesión
}