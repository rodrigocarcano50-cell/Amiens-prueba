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
    const { data: extracciones, error: errExt } = await supabase
      .from('extraccion')
      .select('id, fecha, descripcion, usuario_id')
      .order('fecha', { ascending: false });

    if (errExt) return res.status(500).json({ error: 'Error al obtener extracciones', detalle: errExt.message });

    const resultado = [];
    for (const e of extracciones) {
      const { data: detalles } = await supabase
        .from('detalle_extraccion')
        .select('producto_id, cantidad')
        .eq('extraccion_id', e.id);

      resultado.push({
        id: e.id,
        descripcion: e.descripcion,
        fecha: e.fecha,
        usuario_id: e.usuario_id,
        detalles: detalles || []
      });
    }

    return res.status(200).json(resultado);
  }

  if (req.method === 'POST') {
    const { descripcion, productos, fecha } = req.body;
    if (!productos || !Array.isArray(productos))
      return res.status(400).json({ error: "Se requiere 'productos' como lista" });

    const errores = [];
    for (const item of productos) {
      const { data: prod } = await supabase.from('producto').select('id, nombre, stock').eq('id', item.producto_id).single();
      if (!prod) { errores.push(`Producto ID ${item.producto_id} no existe`); continue; }
      if (prod.stock < item.cantidad) errores.push(`Stock insuficiente para ${prod.nombre} (actual: ${prod.stock}, requerido: ${item.cantidad})`);
    }
    if (errores.length > 0) return res.status(400).json({ error: 'Validación fallida', detalles: errores });

    const { data: nueva, error: errExt } = await supabase.from('extraccion').insert([{
      usuario_id: auth.userId,
      descripcion: descripcion || 'Extracción sin descripción',
      fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString()
    }]).select().single();
    if (errExt) return res.status(500).json({ error: errExt.message });

    const stockActualizado = [];
    for (const item of productos) {
      await supabase.from('detalle_extraccion').insert([{
        extraccion_id: nueva.id,
        producto_id: item.producto_id,
        cantidad: item.cantidad
      }]);
      const { data: prod } = await supabase.from('producto').select('stock, stock_minimo').eq('id', item.producto_id).single();
      const nuevoStock = prod.stock - item.cantidad;
      await supabase.from('producto').update({ stock: nuevoStock, estado: calcularEstado(nuevoStock, prod.stock_minimo) }).eq('id', item.producto_id);
      stockActualizado.push({ producto_id: item.producto_id, nuevo_stock: nuevoStock });
    }

    return res.status(201).json({ mensaje: 'Extracción registrada exitosamente', extraccion_id: nueva.id, stock_actualizado: stockActualizado });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}