// src/components/PagosProveedorModal.js
import React, { useEffect, useMemo, useState } from "react";
import "../estilos/PagosProveedorModal.css";

/**
 * Modal para gestionar pagos/abonos a proveedores
 * 
 * Props:
 * - productosAgregados: Array de productos del pedido (incluye grupos)
 * - pagosProveedores: Array de pagos existentes (del pedido guardado)
 * - numeroDias: Número de días del evento (para multiplicar cantidades)
 * - onGuardar: Callback con la estructura actualizada de pagos
 * - onClose: Callback para cerrar el modal
 */
const PagosProveedorModal = ({
  productosAgregados = [],
  pagosProveedores = [],
  numeroDias = 1,
  onGuardar,
  onClose,
}) => {
  // Estado local de pagos (copia editable)
  const [pagosLocales, setPagosLocales] = useState([]);

  // Función para obtener la fecha de hoy en formato ISO
  const hoyISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Extraer todos los productos de proveedor del pedido
  const productosDeProveedor = useMemo(() => {
    const productos = [];

    productosAgregados.forEach((item) => {
      if (item.es_grupo && Array.isArray(item.productos)) {
        // Es un grupo - buscar productos de proveedor dentro
        const cantidadGrupo = Number(item.cantidad || 1);
        
        item.productos.forEach((sub) => {
          if (sub.es_proveedor) {
            const cantidadSub = Number(sub.cantidad || 0);
            const multiplicar = sub.multiplicar !== false;
            const cantidadFinal = multiplicar ? cantidadSub * cantidadGrupo : cantidadSub;
            
            productos.push({
              producto_id: sub.id,
              nombre: sub.nombre,
              proveedor_id: sub.proveedor_id || null,
              proveedor_nombre: sub.proveedor_nombre || "Proveedor",
              cantidad: cantidadFinal,
              precio_compra: Number(sub.precio_compra || 0),
              precio_venta: Number(sub.precio || 0),
              subtotal_compra: cantidadFinal * Number(sub.precio_compra || 0),
              origen: `Grupo: ${item.nombre}`,
            });
          }
        });
      } else if (item.es_proveedor) {
        // Producto suelto de proveedor
        const cantidad = Number(item.cantidad || 0);
        
        productos.push({
          producto_id: item.id,
          nombre: item.nombre,
          proveedor_id: item.proveedor_id || null,
          proveedor_nombre: item.proveedor_nombre || "Proveedor",
          cantidad: cantidad,
          precio_compra: Number(item.precio_compra || 0),
          precio_venta: Number(item.precio || 0),
          subtotal_compra: cantidad * Number(item.precio_compra || 0),
          origen: "Producto suelto",
        });
      }
    });

    return productos;
  }, [productosAgregados]);

  // Agrupar productos por proveedor
  const proveedoresAgrupados = useMemo(() => {
    const mapa = new Map();

    productosDeProveedor.forEach((prod) => {
      const key = prod.proveedor_nombre || "Sin proveedor";
      
      if (!mapa.has(key)) {
        mapa.set(key, {
          proveedor_id: prod.proveedor_id,
          proveedor_nombre: key,
          productos: [],
          total: 0,
        });
      }

      const grupo = mapa.get(key);
      grupo.productos.push(prod);
      grupo.total += prod.subtotal_compra;
    });

    return Array.from(mapa.values());
  }, [productosDeProveedor]);

  // Inicializar pagos locales combinando existentes con nuevos proveedores
  useEffect(() => {
    const pagosIniciales = proveedoresAgrupados.map((prov) => {
      // Buscar si ya existe un registro de pagos para este proveedor
      const pagoExistente = pagosProveedores.find(
        (p) => p.proveedor_nombre === prov.proveedor_nombre
      );

      if (pagoExistente) {
        // Actualizar el total (puede haber cambiado la cantidad/precio)
        return {
          ...pagoExistente,
          productos: prov.productos,
          total: prov.total,
          total_abonado: (pagoExistente.abonos || []).reduce(
            (sum, ab) => sum + Number(ab.valor || 0),
            0
          ),
          saldo_pendiente:
            prov.total -
            (pagoExistente.abonos || []).reduce(
              (sum, ab) => sum + Number(ab.valor || 0),
              0
            ),
        };
      }

      // Nuevo proveedor sin pagos previos
      return {
        proveedor_id: prov.proveedor_id,
        proveedor_nombre: prov.proveedor_nombre,
        productos: prov.productos,
        total: prov.total,
        abonos: [],
        total_abonado: 0,
        saldo_pendiente: prov.total,
      };
    });

    setPagosLocales(pagosIniciales);
  }, [proveedoresAgrupados, pagosProveedores]);

  // Agregar abono a un proveedor
  const agregarAbono = (indexProveedor) => {
    const nuevos = [...pagosLocales];
    const proveedor = nuevos[indexProveedor];
    
    proveedor.abonos = [
      ...(proveedor.abonos || []),
      { valor: "", fecha: hoyISO(), movimiento_id: null, nuevo: true },
    ];
    
    recalcularTotales(nuevos, indexProveedor);
    setPagosLocales(nuevos);
  };

  // Actualizar valor de un abono
  const actualizarAbono = (indexProveedor, indexAbono, campo, valor) => {
    const nuevos = [...pagosLocales];
    const proveedor = nuevos[indexProveedor];
    
    if (campo === "valor") {
      proveedor.abonos[indexAbono].valor = valor === "" ? "" : Number(valor);
    } else {
      proveedor.abonos[indexAbono][campo] = valor;
    }
    
    recalcularTotales(nuevos, indexProveedor);
    setPagosLocales(nuevos);
  };

  // Eliminar abono
  const eliminarAbono = (indexProveedor, indexAbono) => {
    const nuevos = [...pagosLocales];
    const proveedor = nuevos[indexProveedor];
    
    // Solo permitir eliminar si no está registrado en contabilidad
    const abono = proveedor.abonos[indexAbono];
    if (abono.movimiento_id && !abono.nuevo) {
      alert("Este abono ya está registrado en contabilidad. No se puede eliminar desde aquí.");
      return;
    }
    
    proveedor.abonos.splice(indexAbono, 1);
    recalcularTotales(nuevos, indexProveedor);
    setPagosLocales(nuevos);
  };

  // Recalcular totales de un proveedor
  const recalcularTotales = (pagos, indexProveedor) => {
    const proveedor = pagos[indexProveedor];
    const totalAbonado = (proveedor.abonos || []).reduce(
      (sum, ab) => sum + Number(ab.valor || 0),
      0
    );
    proveedor.total_abonado = totalAbonado;
    proveedor.saldo_pendiente = proveedor.total - totalAbonado;
  };

  // Calcular totales generales
  const totalesGenerales = useMemo(() => {
    return pagosLocales.reduce(
      (acc, prov) => ({
        total: acc.total + (prov.total || 0),
        abonado: acc.abonado + (prov.total_abonado || 0),
        pendiente: acc.pendiente + (prov.saldo_pendiente || 0),
      }),
      { total: 0, abonado: 0, pendiente: 0 }
    );
  }, [pagosLocales]);

  // Validar antes de guardar
  const validarYGuardar = () => {
    // Validar que no haya abonos con valor vacío o 0
    for (const prov of pagosLocales) {
      for (const abono of prov.abonos || []) {
        if (abono.valor === "" || abono.valor <= 0) {
          alert(`Hay abonos sin valor válido para ${prov.proveedor_nombre}`);
          return;
        }
        if (!abono.fecha) {
          alert(`Hay abonos sin fecha para ${prov.proveedor_nombre}`);
          return;
        }
      }
      
      // Validar que no se abone más de lo que se debe
      if (prov.saldo_pendiente < 0) {
        alert(`Los abonos para ${prov.proveedor_nombre} superan el total a pagar`);
        return;
      }
    }

    onGuardar(pagosLocales);
  };

  // Formatear moneda
  const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

  // Si no hay proveedores
  if (proveedoresAgrupados.length === 0) {
    return (
      <div className="pagos-proveedor-overlay" onClick={onClose}>
        <div
          className="pagos-proveedor-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pagos-proveedor-header">
            <h2>💰 Pagos a Proveedores</h2>
            <button className="btn-cerrar" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="pagos-proveedor-body">
            <div className="sin-proveedores">
              <span>📦</span>
              <p>No hay productos de proveedor en este pedido.</p>
              <p style={{ fontSize: "13px", marginTop: "8px" }}>
                Agrega productos desde "Agregar desde Proveedor" o dentro de un grupo.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pagos-proveedor-overlay" onClick={onClose}>
      <div
        className="pagos-proveedor-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pagos-proveedor-header">
          <h2>💰 Pagos a Proveedores</h2>
          <button className="btn-cerrar" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="pagos-proveedor-body">
          {pagosLocales.map((proveedor, indexProv) => (
            <div key={proveedor.proveedor_nombre} className="proveedor-card">
              {/* Header del proveedor */}
              <div className="proveedor-card-header">
                <h3>
                  🏢 {proveedor.proveedor_nombre}
                </h3>
                {proveedor.saldo_pendiente <= 0 ? (
                  <span className="badge-pagado">✓ Pagado</span>
                ) : (
                  <span className="badge-pendiente">
                    Pendiente: {money(proveedor.saldo_pendiente)}
                  </span>
                )}
              </div>

              <div className="proveedor-card-body">
                {/* Productos del proveedor */}
                <div className="productos-proveedor">
                  {proveedor.productos.map((prod, indexProd) => (
                    <div key={`${prod.producto_id}-${indexProd}`} className="producto-item">
                      <div className="producto-info">
                        <div className="producto-nombre">{prod.nombre}</div>
                        <div className="producto-detalle">
                          {prod.cantidad} × {money(prod.precio_compra)} · {prod.origen}
                        </div>
                      </div>
                      <div className="producto-total">
                        {money(prod.subtotal_compra)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen financiero */}
                <div className="resumen-financiero">
                  <div className="resumen-row">
                    <span className="label">Total a pagar:</span>
                    <span className="valor">{money(proveedor.total)}</span>
                  </div>
                  <div className="resumen-row">
                    <span className="label">Total abonado:</span>
                    <span className="valor pagado">{money(proveedor.total_abonado)}</span>
                  </div>
                  <div className="resumen-row total">
                    <span className="label">Saldo pendiente:</span>
                    <span className={`valor ${proveedor.saldo_pendiente > 0 ? "pendiente" : "pagado"}`}>
                      {money(proveedor.saldo_pendiente)}
                    </span>
                  </div>
                </div>

                {/* Lista de abonos */}
                <div className="abonos-section">
                  <h4>📝 Abonos realizados:</h4>
                  
                  {(proveedor.abonos || []).length === 0 && (
                    <p style={{ color: "#9ca3af", fontSize: "13px", fontStyle: "italic" }}>
                      No hay abonos registrados
                    </p>
                  )}

                  {(proveedor.abonos || []).map((abono, indexAbono) => (
                    <div
                      key={indexAbono}
                      className={`abono-item ${abono.movimiento_id && !abono.nuevo ? "abono-registrado" : ""}`}
                    >
                      <input
                        type="number"
                        placeholder="Valor"
                        value={abono.valor}
                        onChange={(e) =>
                          actualizarAbono(indexProv, indexAbono, "valor", e.target.value)
                        }
                        disabled={abono.movimiento_id && !abono.nuevo}
                      />
                      <input
                        type="date"
                        value={abono.fecha || ""}
                        onChange={(e) =>
                          actualizarAbono(indexProv, indexAbono, "fecha", e.target.value)
                        }
                        disabled={abono.movimiento_id && !abono.nuevo}
                      />
                      {abono.movimiento_id && !abono.nuevo ? (
                        <span className="badge-registrado">En contabilidad</span>
                      ) : (
                        <button
                          className="btn-eliminar"
                          onClick={() => eliminarAbono(indexProv, indexAbono)}
                          title="Eliminar abono"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Botón agregar abono */}
                  {proveedor.saldo_pendiente > 0 && (
                    <button
                      className="btn-agregar-abono"
                      onClick={() => agregarAbono(indexProv)}
                    >
                      ➕ Agregar abono
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pagos-proveedor-footer">
          <div className="resumen-total-general">
            <div>
              <strong>Total proveedores:</strong> {money(totalesGenerales.total)}
            </div>
            <div>
              <strong>Abonado:</strong>{" "}
              <span style={{ color: "#16a34a" }}>{money(totalesGenerales.abonado)}</span>
              {" · "}
              <strong>Pendiente:</strong>{" "}
              <span className="pendiente-total">{money(totalesGenerales.pendiente)}</span>
            </div>
          </div>
          
          <div className="footer-buttons">
            <button className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-guardar-pagos" onClick={validarYGuardar}>
              💾 Guardar pagos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagosProveedorModal;