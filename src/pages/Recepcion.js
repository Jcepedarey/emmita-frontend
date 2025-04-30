// src/pages/Recepcion.js
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { generarPDFRecepcion } from "../utils/generarPDFRecepcion";

const Recepcion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const ordenId = location.state?.ordenId;
  const [orden, setOrden] = useState(null);
  const [productosRevisados, setProductosRevisados] = useState([]);
  const [comentarioGeneral, setComentarioGeneral] = useState("");
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuario"));
    setUsuario(user || { nombre: "Administrador" });
  }, []);
  useEffect(() => {
    const cargarOrden = async () => {
      if (!ordenId) return;

      const { data, error } = await supabase
        .from("ordenes_pedido")
        .select("*, clientes(*)")
        .eq("id", ordenId)
        .single();

      if (error) {
        console.error("❌ Error al cargar orden:", error);
        return Swal.fire("Error", "No se pudo cargar la orden", "error");
      }

      const productosDesglosados = [];
      data.productos.forEach((p) => {
        if (p.es_grupo && p.productos?.length > 0) {
          p.productos.forEach((sub) => {
            productosDesglosados.push({
              descripcion: sub.nombre,
              esperado: sub.cantidad,
              recibido: sub.cantidad,
              observacion: ""
            });
          });
        } else {
          productosDesglosados.push({
            descripcion: p.nombre,
            esperado: p.cantidad,
            recibido: p.cantidad,
            observacion: ""
          });
        }
      });

      setOrden(data);
      setProductosRevisados(productosDesglosados);
    };

    cargarOrden();
  }, [ordenId]);
  const actualizarCampo = (index, campo, valor) => {
    const copia = [...productosRevisados];
    copia[index][campo] = campo === "recibido" ? parseInt(valor) : valor;
    setProductosRevisados(copia);
  };

  const guardarRevision = async () => {
    if (!orden) return;

    try {
      // 1. Descontar productos que no llegaron
      for (const item of productosRevisados) {
        const diferencia = item.esperado - item.recibido;
        if (diferencia > 0) {
          // Buscar el ID real del producto en la orden original
          const original = orden.productos.find(p => p.nombre === item.descripcion);
          if (original?.id) {
            await supabase.rpc("descontar_stock", {
              producto_id: original.id,
              cantidad: diferencia
            });
          }
        }
      }

      // 2. Marcar orden como revisada
      await supabase
        .from("ordenes_pedido")
        .update({ revisada: true })
        .eq("id", orden.id);

      // 3. Confirmación
      Swal.fire("✅ Revisión guardada", "La recepción se ha registrado correctamente.", "success");
      navigate("/inicio");
    } catch (error) {
      console.error("❌ Error al guardar revisión:", error);
      Swal.fire("Error", "Hubo un problema al guardar la revisión", "error");
    }
  };
  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "auto" }}>
      <h2>📦 Revisión de Orden</h2>

      {orden ? (
        <>
          <p><strong>Número de orden:</strong> {orden.numero}</p>
          <p><strong>Cliente:</strong> {orden.clientes?.nombre}</p>
          <p><strong>Fecha del evento:</strong> {new Date(orden.fecha_evento).toLocaleDateString()}</p>

          <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ccc" }}>Artículo</th>
                <th style={{ borderBottom: "1px solid #ccc" }}>Esperado</th>
                <th style={{ borderBottom: "1px solid #ccc" }}>Recibido</th>
                <th style={{ borderBottom: "1px solid #ccc" }}>Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {productosRevisados.map((item, index) => (
                <tr key={index}>
                  <td>{item.descripcion}</td>
                  <td>{item.esperado}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.recibido}
                      onChange={(e) => actualizarCampo(index, "recibido", e.target.value)}
                      style={{ width: "60px" }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.comentarios}
                      onChange={(e) => actualizarCampo(index, "comentarios", e.target.value)}
                      placeholder="Opcional"
                      style={{ width: "100%" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={guardarRevision}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              backgroundColor: "#2c7a7b",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            💾 Guardar revisión
          </button>
        </>
      ) : (
        <p style={{ marginTop: "1rem" }}>🔄 Cargando orden...</p>
      )}
    </div>
  );
}

export default Recepcion;
