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

  if (req.method === 'GET') {
    const { data: ingresos, error: errIng } = await supabase
      .from('ingreso')
      .select('id, fecha, usuario_id')
      .order('fecha', { ascending: false });

    if (errIng) return res.status(500).json({ error: 'Error al obtener ingresos', detalle: errIng.message });

    const resultado = [];
    for (const i of ingresos) {
      const { data: detalles } = await supabase
        .from('detalle_ingreso')
        .select('producto_id, cantidad')
        .eq('ingreso_id', i.id);

      resultado.push({
        id: i.id,
        fecha: i.fecha,
        usuario_id: i.usuario_id,
        detalles: detalles || []
      });
    }

    return res.status(200).json(resultado);
  }

  if (req.method === 'POST') {
    const { detalles, fecha } = req.body;
    if (!detalles || !Array.isArray(detalles))
      return res.status(400).json({ error: "Se requiere 'detalles' como lista" });

    const { data: nuevo, error: errIng } = await supabase.from('ingreso').insert([{
      usuario_id: auth.userId,
      fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString()
    }]).select().single();
    if (errIng) return res.status(500).json({ error: errIng.message });

    const resumenStock = [];
    for (const item of detalles) {
      const { data: prod } = await supabase.from('producto').select('id, stock, stock_minimo').eq('id', item.producto_id).single();
      if (!prod) continue;
      await supabase.from('detalle_ingreso').insert([{ ingreso_id: nuevo.id, producto_id: prod.id, cantidad: item.cantidad }]);
      const nuevoStock = prod.stock + item.cantidad;
      await supabase.from('producto').update({ stock: nuevoStock, estado: calcularEstado(nuevoStock, prod.stock_minimo) }).eq('id', prod.id);
      resumenStock.push({ producto_id: prod.id, nuevo_stock: nuevoStock });
    }

    return res.status(201).json({ mensaje: 'Ingreso registrado exitosamente', ingreso_id: nuevo.id, stock_actualizado: resumenStock });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}