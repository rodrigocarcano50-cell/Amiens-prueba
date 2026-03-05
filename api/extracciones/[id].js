import { supabase } from '../_lib/supabase.js';
import { verifyToken, setCors } from '../_lib/auth.js';

function calcularEstado(stock, stock_minimo) {
  if (stock <= 0) return 'Sin Stock';
  if (stock <= stock_minimo) return 'Bajo Stock';
  return 'En Stock';
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = verifyToken(req, res);
  if (!auth) return;

  const { id } = req.query;

  if (req.method === 'DELETE') {
    const devolver = req.body?.devolver ?? 0;

    // Obtener detalles de la extracción
    const { data: extraccion, error: fetchError } = await supabase
      .from('extraccion')
      .select('id, detalle_extraccion ( producto_id, cantidad )')
      .eq('id', id)
      .single();

    if (fetchError || !extraccion) {
      return res.status(404).json({ error: `No se encontró ninguna extracción con ID ${id}` });
    }

    // Restaurar stock si devolver == 1
    if (devolver === 1) {
      for (const detalle of extraccion.detalle_extraccion) {
        const { data: prod } = await supabase
          .from('producto')
          .select('stock, stock_minimo')
          .eq('id', detalle.producto_id)
          .single();

        if (prod) {
          const nuevoStock = prod.stock + detalle.cantidad;
          const nuevoEstado = calcularEstado(nuevoStock, prod.stock_minimo);
          await supabase
            .from('producto')
            .update({ stock: nuevoStock, estado: nuevoEstado })
            .eq('id', detalle.producto_id);
        }
      }
    }

    // Eliminar detalles primero, luego la extracción
    await supabase.from('detalle_extraccion').delete().eq('extraccion_id', id);
    const { error } = await supabase.from('extraccion').delete().eq('id', id);

    if (error) return res.status(500).json({ error: `Error al eliminar la extracción: ${error.message}` });

    return res.status(200).json({
      mensaje: `Extracción ID ${id} eliminada`,
      stock_restaurado: devolver === 1,
      detalles_eliminados: true
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
