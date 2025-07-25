// src/utils/consultasSupabase.js
import supabase from "../supabaseClient";

// 🔍 1. Pedidos activos entre fechas
export async function obtenerPedidosPorFecha(fechaInicio, fechaFin) {
  const { data, error } = await supabase
    .from("ordenes_pedido")
    .select("*, clientes(nombre)")
    .gte("fecha_evento", fechaInicio)
    .lte("fecha_evento", fechaFin);

  if (error) {
    console.error("❌ Error consultando pedidos:", error.message);
    return [];
  }

  return data;
}

// 📉 2. Productos con stock bajo para una fecha (ordenes confirmadas)
export async function obtenerStockBajoParaFecha(fecha) {
  const { data, error } = await supabase
    .rpc("verificar_stock_bajo", { fecha_evento: fecha });

  if (error) {
    console.error("❌ Error en RPC stock bajo:", error.message);
    return [];
  }

  return data; // Devuelve productos con stock < 5
}

// 📦 3. Buscar producto por código o nombre
export async function buscarProducto(termino) {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .ilike("nombre", `%${termino}%`);

  if (error) {
    console.error("❌ Error buscando producto:", error.message);
    return null;
  }

  return data;
}

// 📊 4. Cantidad total de cotizaciones, órdenes, clientes...
export async function contarDocumentosPorTipo(tipo) {
  const { count, error } = await supabase
    .from("documentos")
    .select("id", { count: "exact", head: true })
    .eq("tipo", tipo);

  if (error) {
    console.error("❌ Error contando documentos:", error.message);
    return 0;
  }

  return count;
}

// 👥 5. Contar clientes
export async function contarClientes() {
  const { count, error } = await supabase
    .from("clientes")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("❌ Error contando clientes:", error.message);
    return 0;
  }

  return count;
}

// 📅 6. Pedidos entre fechas por cliente
export async function obtenerPedidosPorFechaYCliente(fechaInicio, fechaFin, clienteNombre) {
  const { data, error } = await supabase
    .from("ordenes_pedido")
    .select("*, clientes(nombre)")
    .gte("fecha_evento", fechaInicio)
    .lte("fecha_evento", fechaFin)
    .ilike("clientes.nombre", `%${clienteNombre}%`);

  if (error) {
    console.error("❌ Error consultando pedidos por cliente:", error.message);
    return [];
  }

  return data;
}
