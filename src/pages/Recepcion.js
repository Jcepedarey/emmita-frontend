/ src/pages/Recepcion.js
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
  const [usuario, setUsuario] = useState({ nombre: "Administrador" });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuario"));
    if (user) setUsuario(user);
  }, []);

  useEffect(() => {
    console.log("📦 ordenId recibido:", ordenId);

    const cargarOrden = async () => {
      if (!ordenId) {
        console.warn("⚠️ No se recibió ordenId.");
        return;
      }

      const { data, error } = await supabase
        .from("ordenes_pedido")
        .select("*, clientes(*)")
        .eq("id", ordenId)
        .single();

      if (error || !data) {
        console.error("❌ Error cargando orden:", error);
        Swal.fire("Error", "No se pudo cargar la orden", "error");
        return navigate("/inicio");
      }

      console.log("✅ Orden cargada:", data);

      const productosDesglosados = [];

      data.productos.forEach((p) => {
        if (p.es_grupo && Array.isArray(p.productos)) {
          p.productos.forEach((sub) => {
            productosDesglosados.push({
              nombre: sub.nombre,
              esperado: sub.cantidad,
              recibido: sub.cantidad,
              observacion: ""
            });
          });
        } else {
          productosDesglosados.push({
            nombre: p.nombre,
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
  }, [ordenId, navigate]);

  const actualizarCampo = (index, campo, valor) => {
    const copia = [...productosRevisados];
    copia[index][campo] = campo === "recibido" ? parseInt(valor) : valor;
    setProductosRevisados(copia);
  };

  const guardarRevision = async () => {
    if (!orden) return;

    try {
      for (const item of productosRevisados) {
        const diferencia = item.esperado - item.recibido;
        if (diferencia > 0) {
          const original = orden.productos.find(p => {
            if (p.es_grupo && Array.isArray(p.productos)) {
              return p.productos.some(sub => sub.nombre === item.nombre);
            }
            return p.nombre === item.nombre;
          });

          const productoId = original?.id || (original?.productos?.find(sub => sub.nombre === item.nombre)?.id);

          if (productoId) {
            await supabase.rpc("descontar_stock", {
              producto_id: productoId,
              cantidad: diferencia
            });
          }
        }
      }

      await supabase
        .from("ordenes_pedido")
        .update({ revisada: true })
        .eq("id", orden.id);

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
                <th style={{ borderBottom: "1px solid #ccc" }}>Observación</th>
              </tr>
            </thead>
            <tbody>
              {productosRevisados.map((item, index) => (
                <tr key={index}>
                  <td>{item.nombre}</td>
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
                      value={item.observacion}
                      onChange={(e) => actualizarCampo(index, "observacion", e.target.value)}
                      placeholder="Opcional"
                      style={{ width: "100%" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "20px" }}>
            <label>Comentario general (opcional):</label>
            <textarea
              value={comentarioGeneral}
              onChange={(e) => setComentarioGeneral(e.target.value)}
              style={{ width: "100%", height: "80px", marginTop: "5px" }}
            />
          </div>

          <div style={{ marginTop: "20px", display: "flex", gap: "1rem" }}>
            <button
              onClick={guardarRevision}
              style={{ padding: "10px 20px", backgroundColor: "#38a169", color: "white", border: "none", borderRadius: "5px" }}
            >
              💾 Guardar revisión
            </button>

            <button
              onClick={() =>
                generarPDFRecepcion(orden, productosRevisados, usuario.nombre, comentarioGeneral)
              }
              style={{ padding: "10px 20px", backgroundColor: "#4a5568", color: "white", border: "none", borderRadius: "5px" }}
            >
              🧾 Descargar PDF
            </button>
          </div>
        </>
      ) : (
        <p style={{ marginTop: "1rem" }}>🔄 Cargando orden...</p>
      )}
    </div>
  );
};

export default Recepcion;