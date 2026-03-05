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

    const { data: ingreso, error: fetchError } = await supabase
      .from('ingreso')
      .select('id, detalle_ingreso ( producto_id, cantidad )')
      .eq('id', id)
      .single();

    if (fetchError || !ingreso) {
      return res.status(404).json({ error: `No se encontró el ingreso con ID ${id}` });
    }

    // Revertir stock si devolver == 1
    if (devolver === 1) {
      for (const detalle of ingreso.detalle_ingreso) {
        const { data: prod } = await supabase
          .from('producto')
          .select('stock, stock_minimo')
          .eq('id', detalle.producto_id)
          .single();

        if (prod) {
          const nuevoStock = prod.stock - detalle.cantidad;
          const nuevoEstado = calcularEstado(nuevoStock, prod.stock_minimo);
          await supabase
            .from('producto')
            .update({ stock: nuevoStock, estado: nuevoEstado })
            .eq('id', detalle.producto_id);
        }
      }
    }

    // Eliminar detalles primero, luego el ingreso
    await supabase.from('detalle_ingreso').delete().eq('ingreso_id', id);
    const { error } = await supabase.from('ingreso').delete().eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      mensaje: `Ingreso ID ${id} eliminado`,
      stock_revertido: devolver === 1,
      detalles_eliminados: true
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
