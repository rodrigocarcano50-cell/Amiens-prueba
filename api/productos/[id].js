import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function verifyToken(req, res) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Token no proporcionado' }); return null; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: decoded.sub };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'El token ha expirado', mensaje: 'Por favor, iniciá sesión nuevamente' });
    } else {
      res.status(401).json({ error: 'Token inválido' });
    }
    return null;
  }
}

function calcularEstado(stock, stock_minimo) {
  if (stock <= 0) return 'Sin Stock';
  if (stock <= stock_minimo) return 'Bajo Stock';
  return 'En Stock';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = verifyToken(req, res);
  if (!auth) return;

  const { id } = req.query;
  const { data: producto, error: fetchError } = await supabase.from('producto').select('*').eq('id', id).single();
  if (fetchError || !producto) return res.status(404).json({ error: 'No se encontró el producto' });

  if (req.method === 'PATCH') {
    const body = req.body;
    const updates = {};
    if ('descripcion' in body) updates.nombre = body.descripcion;
    if ('stock' in body) updates.stock = body.stock;
    if ('stock_minimo' in body) updates.stock_minimo = body.stock_minimo;
    if ('proveedor' in body) updates.proveedor = body.proveedor;
    if ('categoria' in body) updates.categoria = body.categoria;
    if ('estado' in body) updates.estado = body.estado;
    if ('stock' in body || 'stock_minimo' in body) {
      updates.estado = calcularEstado(
        'stock' in updates ? updates.stock : producto.stock,
        'stock_minimo' in updates ? updates.stock_minimo : producto.stock_minimo
      );
    }
    const { error } = await supabase.from('producto').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ mensaje: 'Producto actualizado correctamente' });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('producto').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ mensaje: 'Producto eliminado correctamente' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}