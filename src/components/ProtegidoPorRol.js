import React from "react";
import { Navigate } from "react-router-dom";

const ProtegidoPorRol = ({ rolRequerido, children }) => {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!usuario || usuario.rol !== rolRequerido) {
    return <Navigate to="/inicio" />;
  }

  return children;
};

export default ProtegidoPorRol;
