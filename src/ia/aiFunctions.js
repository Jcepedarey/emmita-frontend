import supabase from "../supabaseClient";

export async function consultar_stock({ articulo, fecha }) {
  // ejemplo simple (lo refinamos luego)
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, stock")
    .ilike("nombre", `%${articulo}%`)
    .limit(1);

  if (!productos || productos.length === 0) {
    return {
      tipo: "error",
      mensaje: `No encontré el artículo "${articulo}"`
    };
  }

  return {
    tipo: "stock",
    articulo: productos[0].nombre,
    fecha,
    disponible: productos[0].stock
  };
}
