// src/pages/Recepcion.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { generarPDFRecepcion } from "../utils/generarPDFRecepcion";

const Recepcion = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [productosRevisados, setProductosRevisados] = useState([]);
  const [comentarioGeneral, setComentarioGeneral] = useState("");
  const [usuario, setUsuario] = useState({ nombre: "Administrador" });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuario"));
    if (user) setUsuario(user);
  }, []);

  useEffect(() => {
    const cargarOrdenes = async () => {
      const hoy = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("ordenes_pedido")
        .select("*, clientes(*)")
        .eq("revisada", false)
        .lt("fecha_evento", hoy)
        .order("fecha_evento", { ascending: true });

      if (error) {
        console.error("❌ Error cargando órdenes:", error);
        return;
      }

      setOrdenes(data);
    };

    cargarOrdenes();
  }, []);

  const seleccionarOrden = (orden) => {
    setOrdenSeleccionada(orden);
    const productosConCampo = [];

    orden.productos.forEach((p) => {
      if (p.es_grupo && Array.isArray(p.productos)) {
        p.productos.forEach((sub) => {
          productosConCampo.push({
            nombre: sub.nombre,
            esperado: sub.cantidad,
            recibido: sub.cantidad,
            observacion: "",
            producto_id: sub.id,
          });
        });
      } else {
        productosConCampo.push({
          nombre: p.nombre,
          esperado: p.cantidad,
          recibido: p.cantidad,
          observacion: "",
          producto_id: p.id,
        });
      }
    });

    setProductosRevisados(productosConCampo);
  };

  const actualizarCampo = (index, campo, valor) => {
    const copia = [...productosRevisados];
    copia[index][campo] = campo === "recibido" ? parseInt(valor) : valor;
    setProductosRevisados(copia);
  };

  const guardarRevision = async () => {
    if (!ordenSeleccionada) return;

    const fechaRevision = new Date().toISOString();

    for (const item of productosRevisados) {
      const diferencia = item.esperado - item.recibido;

      if (diferencia > 0 && item.producto_id) {
        await supabase.from("inventario").insert([
          {
            producto_id: item.producto_id,
            cantidad: diferencia,
            tipo_movimiento: "salida",
            observaciones: `Faltante tras recepción de orden ${ordenSeleccionada.numero}`,
            fecha: fechaRevision,
          },
        ]);
      }
    }

    const { error: errorActualizar } = await supabase
      .from("ordenes_pedido")
      .update({ revisada: true, fecha_revision: fechaRevision })
      .eq("id", ordenSeleccionada.id);

    if (errorActualizar) {
      return Swal.fire("Error", "No se pudo guardar la revisión", "error");
    }

    Swal.fire("✅ Revisión guardada", "La orden fue registrada correctamente", "success");
    setOrdenSeleccionada(null);
    setProductosRevisados([]);
    setComentarioGeneral("");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">📦 Recepción de pedidos</h2>

      {!ordenSeleccionada ? (
        <div>
          <p>Selecciona una orden para revisar:</p>
          <ul className="mt-2">
            {ordenes.map((orden) => (
              <li key={orden.id} className="mb-2">
                <button
                  onClick={() => seleccionarOrden(orden)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded"
                >
                  Revisar {orden.numero}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white p-4 rounded shadow mt-4">
          <h3 className="text-lg font-semibold mb-3">
            Revisando: {ordenSeleccionada.numero}
          </h3>

          <table className="w-full mb-4 border">
            <thead>
              <tr>
                <th className="border px-2 py-1">Descripción</th>
                <th className="border px-2 py-1">Esperado</th>
                <th className="border px-2 py-1">Recibido</th>
                <th className="border px-2 py-1">Observación</th>
              </tr>
            </thead>
            <tbody>
              {productosRevisados.map((item, index) => (
                <tr key={index}>
                  <td className="border px-2 py-1">{item.nombre}</td>
                  <td className="border px-2 py-1 text-center">{item.esperado}</td>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="number"
                      value={item.recibido}
                      min="0"
                      onChange={(e) => actualizarCampo(index, "recibido", e.target.value)}
                      className="w-16 text-center"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={item.observacion}
                      onChange={(e) => actualizarCampo(index, "observacion", e.target.value)}
                      className="w-full"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <label>Comentario general (opcional):</label>
          <textarea
            className="w-full mb-2 p-2 border rounded"
            rows={3}
            value={comentarioGeneral}
            onChange={(e) => setComentarioGeneral(e.target.value)}
          />

          <div className="flex gap-3">
            <button
              onClick={guardarRevision}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
            >
              💾 Guardar Revisión
            </button>

            <button
              onClick={() => generarPDFRecepcion(ordenSeleccionada, productosRevisados, usuario.nombre, comentarioGeneral)}
              className="bg-gray-700 hover:bg-gray-800 text-white py-2 px-4 rounded"
            >
              🧾 Descargar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recepcion;
