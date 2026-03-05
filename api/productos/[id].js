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

  // Verificar que el producto existe
  const { data: producto, error: fetchError } = await supabase
    .from('producto')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !producto) {
    return res.status(404).json({ error: 'No se encontró el producto' });
  }

  // PATCH /api/productos/:id
  if (req.method === 'PATCH') {
    const updates = {};
    const body = req.body;

    if ('descripcion' in body) updates.nombre = body.descripcion;
    if ('stock' in body) updates.stock = body.stock;
    if ('stock_minimo' in body) updates.stock_minimo = body.stock_minimo;
    if ('proveedor' in body) updates.proveedor = body.proveedor;
    if ('categoria' in body) updates.categoria = body.categoria;
    if ('estado' in body) updates.estado = body.estado;

    // Recalcular estado si cambia stock o stock_minimo
    const nuevoStock = 'stock' in updates ? updates.stock : producto.stock;
    const nuevoStockMin = 'stock_minimo' in updates ? updates.stock_minimo : producto.stock_minimo;
    if ('stock' in body || 'stock_minimo' in body) {
      updates.estado = calcularEstado(nuevoStock, nuevoStockMin);
    }

    const { error } = await supabase
      .from('producto')
      .update(updates)
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ mensaje: 'Producto actualizado correctamente' });
  }

  // DELETE /api/productos/:id
  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('producto')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ mensaje: 'Producto eliminado correctamente' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
