// src/pages/Recepcion.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import Swal from "sweetalert2";
import { generarPDFRecepcion } from "../utils/generarPDFRecepcion";
import { useLocation } from "react-router-dom";

const Recepcion = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [productosRevisados, setProductosRevisados] = useState([]);
  const [danos, setDanos] = useState([]);
  const [garantiaDevueltaManual, setGarantiaDevueltaManual] = useState(null);
  const [comentarioGeneral, setComentarioGeneral] = useState("");
  const [usuario, setUsuario] = useState({ nombre: "Administrador" });
  const location = useLocation();
const queryParams = new URLSearchParams(location.search);
const ordenId = queryParams.get("id");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuario"));
    if (user) setUsuario(user);
  }, []);

  useEffect(() => {
  const cargarOrdenes = async () => {
    if (ordenId) {
      const { data, error } = await supabase
        .from("ordenes_pedido")
        .select("*, clientes(*), productos, abonos")
        .eq("id", ordenId)
        .single();

      if (error) {
        console.error("❌ Error cargando orden específica:", error);
        return;
      }

      setOrdenSeleccionada(data);
      seleccionarOrden(data); // Esto carga los productos asociados
    } else {
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
    }
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
            proveedor: sub.proveedor || null,
            proveedor_id: sub.proveedor_id || null,
            tipo_origen: sub.proveedor_id ? "proveedor" : "propio",
          });
        });
      } else {
        productosConCampo.push({
          nombre: p.nombre,
          esperado: p.cantidad,
          recibido: p.cantidad,
          observacion: "",
          producto_id: p.id,
          proveedor: p.proveedor || null,
          proveedor_id: p.proveedor_id || null,
          tipo_origen: p.proveedor_id ? "proveedor" : "propio",
        });
      }
    });

    setProductosRevisados(productosConCampo);
    setDanos(productosConCampo.map(() => ({ monto: 0 })));
  };

  const actualizarCampo = (index, campo, valor) => {
    const copia = [...productosRevisados];
    copia[index][campo] = campo === "recibido" ? parseInt(valor) : valor;
    setProductosRevisados(copia);
  };

  const actualizarDano = (index, valor) => {
    const copia = [...danos];
    copia[index].monto = parseFloat(valor) || 0;
    setDanos(copia);
  };

  const guardarRevision = async () => {
  if (!ordenSeleccionada) {
    Swal.fire("Error", "No hay una orden cargada para revisar", "error");
    return;
  }

  await supabase
  .from("ordenes_pedido")
  .update({ cerrada: true })
  .eq("id", ordenSeleccionada.id);

  try {
    // 1️⃣ Descontar stock por diferencia esperada vs recibida
    for (const item of productosRevisados) {
      const diferencia = item.esperado - item.recibido;
      if (diferencia > 0 && item.producto_id) {
        await supabase.rpc("descontar_stock", {
          producto_id: item.producto_id,
          cantidad: diferencia,
        });
      }
    }

    // 2️⃣ Calcular garantía devuelta
    const sumaDanos = productosRevisados.reduce(
      (acum, p, i) => acum + (parseInt(danos[i]?.monto || 0)),
      0
    );
    const garantiaTotal = parseInt(ordenSeleccionada.garantia || 0);
    const garantiaDevuelta = garantiaDevueltaManual !== null
  ? garantiaDevueltaManual
  : Math.max(garantiaTotal - sumaDanos, 0);


    // 3️⃣ Registrar movimientos contables
    await registrarContabilidadPorPedido(
      ordenSeleccionada,
      productosRevisados.map((p, i) => ({
        nombre: p.nombre,
        monto: parseInt(danos[i]?.monto || 0),
        tipo: p.tipo_origen,
      })),
      garantiaTotal,
      garantiaDevuelta,
      usuario
    );

    // 4️⃣ Marcar orden como revisada y registrar garantía devuelta
    const { error: updateError } = await supabase
      .from("ordenes_pedido")
      .update({
        revisada: true,
        comentario_revision: comentarioGeneral,
        garantia_devuelta: garantiaDevuelta,
      })
      .match({ id: ordenSeleccionada.id });

     if (updateError) {
      console.error("❌ Error al actualizar orden:", updateError);
      return Swal.fire("Error", "No se pudo cerrar la orden", "error");
    }

    // ✅ Calcular ingresos y gastos
    const ingresos = (ordenSeleccionada.abonos || []).reduce((acc, ab) => acc + (Number(ab.valor) || 0), 0);
    const gastos =
      (Number(ordenSeleccionada.costo_danos) || 0) +
      (Number(ordenSeleccionada.costo_transporte) || 0) +
      (Number(ordenSeleccionada.costo_proveedor) || 0) +
      (Number(ordenSeleccionada.costo_logistica) || 0);

    const utilidad_neta = ingresos - gastos - (Number(ordenSeleccionada.retencion) || 0) - (Number(garantiaDevuelta) || 0);

    await supabase.from("movimientos_contables").insert([
  {
    orden_id: ordenSeleccionada.id,
    fecha: new Date().toISOString().split("T")[0],
    tipo: "ingreso",
    monto: utilidad_neta, // Este lo podés calcular como antes
    descripcion: comentarioGeneral || "Auto generado desde Recepción",
    categoria: "Cierre de orden",
    estado: "activo",
    usuario: usuario?.nombre || "Administrador",
    fecha_modificacion: null
  }
]);

    // ✅ Confirmación
    Swal.fire("✅ Revisión guardada", "La recepción se ha registrado correctamente.", "success");
// navigate("/inicio"); // Comentado para no salir del módulo

  } catch (error) {
    console.error("❌ Error general:", error);
    Swal.fire("Error", "Hubo un problema al guardar la revisión", "error");
  }
};

  const registrarContabilidadPorPedido = async (orden, danos, garantiaOriginal, garantiaDevuelta, usuario) => {
    try {
      for (const d of danos) {
        if (d.monto > 0) {
          const movimiento = {
            fecha: new Date().toISOString().split("T")[0],
            estado: "activo",
            usuario: usuario?.nombre || "Administrador",
            fecha_modificacion: null,
          };

          if (d.tipo === "proveedor") {
            await supabase.from("movimientos_contables").insert([{
              ...movimiento,
              tipo: "gasto",
              monto: d.monto,
              descripcion: `Daño en producto del proveedor: ${d.nombre}`,
              categoria: "Daños proveedor",
            }]);

            await supabase.from("movimientos_contables").insert([{
              ...movimiento,
              tipo: "ingreso",
              monto: d.monto,
              descripcion: `Garantía retenida por daño (proveedor): ${d.nombre}`,
              categoria: "Garantías retenidas",
            }]);
          } else {
            await supabase.from("movimientos_contables").insert([{
              ...movimiento,
              tipo: "ingreso",
              monto: d.monto,
              descripcion: `Compensación por daño (producto propio): ${d.nombre}`,
              categoria: "Daños propios",
            }]);
          }
        }
      }

      const diferencia = garantiaOriginal - garantiaDevuelta;
      if (diferencia > 0) {
        await supabase.from("movimientos_contables").insert([{
          tipo: "ingreso",
          monto: diferencia,
          descripcion: `Garantía no devuelta al cliente por daños`,
          categoria: "Garantías retenidas",
          fecha: new Date().toISOString().split("T")[0],
          estado: "activo",
          usuario: usuario?.nombre || "Administrador",
          fecha_modificacion: null
        }]);
      }
    } catch (error) {
      console.error("❌ Error registrando contabilidad del pedido:", error);
    }
  };
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">📦 Recepción de pedidos</h2>

      {!ordenSeleccionada ? (
        <div>
          <p>Selecciona una orden para revisar:</p>
          <ul className="mt-2">
            <ul className="space-y-3">
  {ordenes.map((orden) => (
    <li
      key={orden.id}
      className="bg-red-50 p-3 rounded-lg shadow flex justify-between items-center hover:bg-red-100 transition"
    >
      <div>
        <p className="font-bold text-red-700">{orden.numero || "OP-???"}</p>
        <p className="text-gray-800">{orden.clientes?.nombre || "Cliente"}</p>
        <p className="text-gray-500 text-sm">{new Date(orden.fecha_evento).toLocaleDateString()}</p>
      </div>
      <div className="text-lg">
        <button
          onClick={() => seleccionarOrden(orden)}
          title="Revisar"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded"
        >
          📝
        </button>
      </div>
    </li>
  ))}
</ul>
          </ul>
        </div>
      ) : (
        <div className="bg-white p-4 rounded shadow mt-4">
          <h3 className="text-lg font-semibold mb-3">
             {ordenSeleccionada.clientes?.nombre || "Sin cliente"} – {new Date(ordenSeleccionada.fecha_evento).toLocaleDateString()}
          </h3>

          <table className="w-full mb-4 border text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Producto</th>
                <th className="border px-2 py-1">Esperado</th>
                <th className="border px-2 py-1">Recibido</th>
                <th className="border px-2 py-1">Daño ($)</th>
                <th className="border px-2 py-1">Observación</th>
              </tr>
            </thead>
            <tbody>
              {productosRevisados.map((item, index) => (
                <tr key={index}>
                  <td className="border px-2 py-1">
                    <span className={item.proveedor_id ? "font-bold" : ""}>
                      {item.nombre}
                    </span>
                    {item.proveedor && (
                      <span className="text-gray-500 ml-1">[{item.proveedor}]</span>
                    )}
                  </td>
                  <td className="border px-2 py-1 text-center">{item.esperado}</td>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.recibido}
                      onChange={(e) => actualizarCampo(index, "recibido", e.target.value)}
                      className="w-16 text-center"
                    />
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="number"
                      min="0"
                      placeholder="$"
                      value={danos[index]?.monto || ""}
                      onChange={(e) => actualizarDano(index, e.target.value)}
                      className="w-24 text-center"
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

          <div className="mb-4">
  <label className="block font-medium mb-1">
    Garantía total: ${ordenSeleccionada.garantia || 0}
  </label>
  <label className="block text-sm text-gray-600 mb-1">
    Valor a devolver al cliente:
  </label>
  <input
    type="number"
    min="0"
    max={ordenSeleccionada.garantia || 0}
    value={
      garantiaDevueltaManual !== null
        ? garantiaDevueltaManual
        : Math.max(
            (ordenSeleccionada.garantia || 0) -
              productosRevisados.reduce(
                (acum, p, i) => acum + parseInt(danos[i]?.monto || 0),
                0
              )
          )
    }
    onChange={(e) => setGarantiaDevueltaManual(parseInt(e.target.value))}
    className="border p-2 rounded w-48"
  />
</div>

{/* ✅ Botones rediseñados estilo imagen 3 */}
<div className="flex flex-col md:flex-row gap-4 mt-6">
  <button
    onClick={guardarRevision}
    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl shadow-lg transition-transform transform hover:scale-105"
  >
    <span className="text-xl">💾</span>
    <span className="font-semibold text-lg">Guardar Revisión</span>
  </button>

  <button
    onClick={() =>
      generarPDFRecepcion(
        ordenSeleccionada,
        productosRevisados,
        usuario.nombre,
        comentarioGeneral
      )
    }
    className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white py-3 px-6 rounded-xl shadow-lg transition-transform transform hover:scale-105"
  >
    <span className="text-xl">🧾</span>
    <span className="font-semibold text-lg">Descargar PDF</span>
  </button>
</div>
   </div>
      )}
    </div>
  );
};

export default Recepcion;