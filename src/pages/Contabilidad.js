// src/pages/Contabilidad.js
import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import { exportarCSV } from "../utils/exportarCSV";
import { generarPDFContable } from "../utils/generarPDFContable";
import Swal from "sweetalert2";
import Protegido from "../components/Protegido"; // 🔐 Protección

const Contabilidad = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState({
    tipo: "ingreso",
    monto: "",
    descripcion: "",
    categoria: "",
  });

  // helper para formatear fecha de la OP
  const soloFecha = (d) => {
    if (!d) return "";
    const x = new Date(d);
    const yyyy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    cargarMovimientos();
  }, []);

  const cargarMovimientos = async () => {
  // 1) Traer movimientos "planos"
  const { data, error } = await supabase
    .from("movimientos_contables")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) {
    console.error("❌ Error cargando movimientos:", error);
    setMovimientos([]);
    return;
  }

  const movs = data || [];

  // 2) Traer info de órdenes primero (para número, fecha y cliente_id)
  const ordenIds = Array.from(new Set(movs.map(m => m.orden_id).filter(Boolean)));
  let ordenesMap = {};
  if (ordenIds.length) {
    const { data: ordenes, error: errorOrdenes } = await supabase
      .from("ordenes_pedido")
      .select("id,numero,fecha_evento,cliente_id")
      .in("id", ordenIds);

    if (!errorOrdenes) {
      (ordenes || []).forEach(o => {
        ordenesMap[o.id] = {
          numero: o.numero,
          fecha: soloFecha(o.fecha_evento),
          cliente_id: o.cliente_id,
        };
      });
    } else {
      console.error("❌ Error cargando órdenes:", errorOrdenes);
    }
  }

  // 3) Traer nombres de clientes desde:
  //    a) cliente_id del movimiento
  //    b) cliente_id de la orden (para movimientos viejos sin cliente_id)
  const idsDeMov = movs.map(m => m.cliente_id).filter(Boolean);
  const idsDeOrden = Object.values(ordenesMap).map(o => o.cliente_id).filter(Boolean);
  const clienteIds = Array.from(new Set([...idsDeMov, ...idsDeOrden]));

  let clientesMap = {};
  if (clienteIds.length) {
    const { data: clientes, error: errorClientes } = await supabase
      .from("clientes")
      .select("id,nombre")
      .in("id", clienteIds);
    if (!errorClientes) {
      (clientes || []).forEach(c => (clientesMap[c.id] = c.nombre));
    } else {
      console.error("❌ Error cargando clientes:", errorClientes);
    }
  }

  // 4) Adjuntar etiqueta legible del pedido + nombreCliente
  const conEtiquetas = movs.map(m => {
    const ord = m.orden_id ? ordenesMap[m.orden_id] : null;

    const nombreCliente =
      (m.cliente_id && clientesMap[m.cliente_id]) ||
      (ord && ord.cliente_id && clientesMap[ord.cliente_id]) ||
      null;

    // Evitar "OP-OP-": si ya viene con OP-, lo respetamos
    const numeroPlano = ord?.numero ? String(ord.numero) : "";
    const numeroConOP = numeroPlano
      ? (numeroPlano.startsWith("OP-") ? numeroPlano : `OP-${numeroPlano}`)
      : null;

    const etiqueta =
      ord && (numeroConOP || ord.fecha || nombreCliente)
        ? `${numeroConOP || "OP-?"} — ${ord?.fecha || ""} — ${nombreCliente || ""}`
        : nombreCliente
        ? `${nombreCliente}`
        : null;

    return { ...m, op_label: etiqueta, cliente_nombre: nombreCliente || null };
  });

  setMovimientos(conEtiquetas);
};

  const guardarMovimiento = async () => {
    if (!form.monto || !form.tipo) return alert("Completa el tipo y monto");

    const nuevo = {
      ...form,
      monto: parseFloat(form.monto),
      fecha: new Date().toISOString().split("T")[0],
      estado: "activo",
    };

    const { error } = await supabase
      .from("movimientos_contables")
      .insert([nuevo]);
    if (!error) {
      setForm({ tipo: "ingreso", monto: "", descripcion: "", categoria: "" });
      cargarMovimientos();
    } else {
      console.error("❌ Error al guardar:", error);
    }
  };

  const editarMovimiento = async (movimiento) => {
    const { value: formValues } = await Swal.fire({
      title: "Editar movimiento",
      html:
        `${
          movimiento.op_label
            ? `<div style="text-align:left;font-size:14px;margin-bottom:8px">
                 <strong>Pedido:</strong> ${movimiento.op_label}
               </div>`
            : ""
        }` +
        `<input id="swal-monto" class="swal2-input" placeholder="Monto" type="number" value="${movimiento.monto}">` +
        `<input id="swal-descripcion" class="swal2-input" placeholder="Descripción" value="${
          movimiento.descripcion || ""
        }">` +
        `<input id="swal-categoria" class="swal2-input" placeholder="Categoría" value="${
          movimiento.categoria || ""
        }">` +
        `<select id="swal-tipo" class="swal2-input">
          <option value="ingreso" ${
            movimiento.tipo === "ingreso" ? "selected" : ""
          }>Ingreso</option>
          <option value="gasto" ${
            movimiento.tipo === "gasto" ? "selected" : ""
          }>Gasto</option>
        </select>` +
        `<textarea id="swal-justificacion" class="swal2-textarea" placeholder="Justificación de la edición"></textarea>`,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const monto = document.getElementById("swal-monto").value;
        const descripcion =
          document.getElementById("swal-descripcion").value;
        const categoria = document.getElementById("swal-categoria").value;
        const tipo = document.getElementById("swal-tipo").value;
        const justificacion =
          document.getElementById("swal-justificacion").value;
        if (!monto || !justificacion) {
          Swal.showValidationMessage(
            "Monto y justificación son obligatorios"
          );
          return false;
        }
        return { monto, descripcion, categoria, tipo, justificacion };
      },
    });

    if (!formValues) return;

    const { monto, descripcion, categoria, tipo, justificacion } = formValues;
    const { error } = await supabase
      .from("movimientos_contables")
      .update({
        monto: parseFloat(monto),
        descripcion,
        categoria,
        tipo,
        justificacion,
        fecha_modificacion: new Date().toISOString(),
        estado: "editado",
      })
      .eq("id", movimiento.id);

    if (!error) {
      Swal.fire("✅ Editado", "Movimiento actualizado correctamente", "success");
      cargarMovimientos();
    } else {
      console.error("❌ Error al editar movimiento:", error);
      Swal.fire("Error", "No se pudo editar el movimiento", "error");
    }
  };

  const movimientosFiltrados =
    filtro === "todos" ? movimientos : movimientos.filter((m) => m.tipo === filtro);

  const totalIngresos = movimientos
    .filter((m) => m.tipo === "ingreso" && m.estado !== "eliminado")
    .reduce((acc, m) => acc + m.monto, 0);

  const totalGastos = movimientos
    .filter((m) => m.tipo === "gasto" && m.estado !== "eliminado")
    .reduce((acc, m) => acc + m.monto, 0);

  return (
    <Protegido>
      <div style={{ padding: "1rem", maxWidth: "900px", margin: "auto" }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
          }}
        >
          💰 Panel de Contabilidad
        </h2>

        <div style={{ marginTop: "1rem" }}>
          <h3>Agregar ingreso o gasto</h3>
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            style={{ width: "100%", marginBottom: 8, padding: "8px" }}
          >
            <option value="ingreso">Ingreso</option>
            <option value="gasto">Gasto</option>
          </select>
          <input
            type="number"
            placeholder="Monto"
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value })}
            style={{ width: "100%", marginBottom: 8, padding: "8px" }}
          />
          <input
            type="text"
            placeholder="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            style={{ width: "100%", marginBottom: 8, padding: "8px" }}
          />
          <input
            type="text"
            placeholder="Categoría (opcional)"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            style={{ width: "100%", marginBottom: 8, padding: "8px" }}
          />
          <button
            onClick={guardarMovimiento}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#4caf50",
              color: "white",
            }}
          >
            Guardar movimiento
          </button>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <h3>Balance actual</h3>
          <p>
            <strong>Total ingresos:</strong>{" "}
            <span style={{ color: "green" }}>
              ${totalIngresos.toLocaleString("es-CO")}
            </span>
          </p>
          <p>
            <strong>Total gastos:</strong>{" "}
            <span style={{ color: "red" }}>
              ${totalGastos.toLocaleString("es-CO")}
            </span>
          </p>
          <p>
            <strong>Balance:</strong>{" "}
            <span
              style={{
                color: totalIngresos - totalGastos >= 0 ? "green" : "red",
              }}
            >
              $
              {Math.abs(totalIngresos - totalGastos).toLocaleString("es-CO")}
            </span>
          </p>

          <button
            onClick={() =>
              exportarCSV(
                movimientos.filter(
                  (m) => m.estado === "activo" || m.estado === "editado"
                ),
                "movimientos_contables"
              )
            }
            style={{
              marginTop: "10px",
              padding: "10px",
              width: "48%",
              marginRight: "2%",
            }}
          >
            Exportar CSV
          </button>

          <button
            onClick={() =>
              generarPDFContable(
                movimientos.filter(
                  (m) => m.estado === "activo" || m.estado === "editado"
                )
              )
            }
            style={{ padding: "10px", width: "48%" }}
          >
            Exportar PDF
          </button>
        </div>

        {/* 🔘 Botones de filtro */}
        <div style={{ marginTop: "1rem", display: "flex", gap: 8 }}>
          <button
            onClick={() => setFiltro("todos")}
            style={{
              padding: "6px 10px",
              background: filtro === "todos" ? "#ddd" : "#f2f2f2",
            }}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltro("ingreso")}
            style={{
              padding: "6px 10px",
              background: filtro === "ingreso" ? "#ddd" : "#f2f2f2",
            }}
          >
            Ingresos
          </button>
          <button
            onClick={() => setFiltro("gasto")}
            style={{
              padding: "6px 10px",
              background: filtro === "gasto" ? "#ddd" : "#f2f2f2",
            }}
          >
            Gastos
          </button>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <h3>Historial de movimientos</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {movimientosFiltrados.map((m) => (
              <li
                key={m.id}
                style={{
                  background: m.estado === "eliminado" ? "#ffe6e6" : "#fdfdfd",
                  color: m.estado === "eliminado" ? "#b30000" : "#000",
                  padding: "10px",
                  borderBottom: "1px solid #ccc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  <strong>{m.tipo.toUpperCase()}:</strong>{" "}
                  <span
                    style={{
                      color: m.tipo === "ingreso" ? "green" : "red",
                    }}
                  >
                    ${Math.abs(m.monto).toLocaleString()}
                  </span>{" "}
                  – {m.descripcion || "Sin descripción"} –{" "}
                  {m.fecha?.split("T")[0]}
                  {m.op_label && <> – {m.op_label}</>}
                  {m.estado === "eliminado" && m.justificacion ? (
                    <em style={{ display: "block", fontSize: "0.8rem" }}>
                      Justificación: {m.justificacion}
                    </em>
                  ) : null}
                </span>

                <div style={{ display: "flex", gap: "8px" }}>
                  {m.estado !== "eliminado" && (
                    <button
                      onClick={() => editarMovimiento(m)}
                      title="Editar movimiento"
                      style={{
                        background: "#2196f3",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        padding: "4px 10px",
                        cursor: "pointer",
                      }}
                    >
                      ✏️
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      const { value: code } = await Swal.fire({
                        title: "Código de autorización",
                        input: "password",
                        inputLabel:
                          "Ingresa el código para borrar definitivamente",
                        inputPlaceholder: "Código secreto",
                        showCancelButton: true,
                      });
                      if (code === "4860") {
                        await supabase
                          .from("movimientos_contables")
                          .delete()
                          .eq("id", m.id);
                        Swal.fire(
                          "✅ Borrado",
                          "El movimiento fue eliminado permanentemente",
                          "success"
                        );
                        cargarMovimientos();
                      } else if (code) {
                        Swal.fire(
                          "❌ Código incorrecto",
                          "No se autorizó el borrado",
                          "error"
                        );
                      }
                    }}
                    title="Eliminar definitivamente"
                    style={{
                      background: "transparent",
                      color: "#f00",
                      fontSize: "1.2rem",
                      cursor: "pointer",
                    }}
                  >
                    ❌
                  </button>
                </div>
              </li>
            ))}{" "}
            {/* Fin del map */}
          </ul>
        </div>
      </div>
    </Protegido>
  );
};

export default Contabilidad;
