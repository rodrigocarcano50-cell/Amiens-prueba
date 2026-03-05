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

  if (req.method === 'DELETE') {
    const devolver = req.body?.devolver ?? 0;
    const { data: ingreso, error: fetchError } = await supabase
      .from('ingreso').select('id, detalle_ingreso(producto_id, cantidad)').eq('id', id).single();
    if (fetchError || !ingreso) return res.status(404).json({ error: `No se encontró el ingreso ID ${id}` });

    if (devolver === 1) {
      for (const d of ingreso.detalle_ingreso) {
        const { data: prod } = await supabase.from('producto').select('stock, stock_minimo').eq('id', d.producto_id).single();
        if (prod) {
          const nuevoStock = prod.stock - d.cantidad;
          await supabase.from('producto').update({ stock: nuevoStock, estado: calcularEstado(nuevoStock, prod.stock_minimo) }).eq('id', d.producto_id);
        }
      }
    }

    await supabase.from('detalle_ingreso').delete().eq('ingreso_id', id);
    const { error } = await supabase.from('ingreso').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ mensaje: `Ingreso ID ${id} eliminado`, stock_revertido: devolver === 1 });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}