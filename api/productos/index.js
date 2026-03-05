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
    const { data, error } = await supabase.from('producto').select('*').order('nombre');
    if (error) return res.status(500).json({ error: 'Error al obtener productos' });
    return res.status(200).json(data.map(p => ({
      id: p.id, descripcion: p.nombre, stock: p.stock,
      stock_minimo: p.stock_minimo, proveedor: p.proveedor,
      categoria: p.categoria, estado: p.estado
    })));
  }

  if (req.method === 'POST') {
    const { descripcion, stock, stock_minimo, proveedor, categoria } = req.body;
    const stockInt = parseInt(stock);
    const stockMinInt = parseInt(stock_minimo);
    const { data, error } = await supabase.from('producto').insert([{
      nombre: descripcion, stock: stockInt, stock_minimo: stockMinInt,
      proveedor: proveedor || '', categoria: categoria || 'General',
      estado: calcularEstado(stockInt, stockMinInt)
    }]).select().single();
    if (error) return res.status(500).json({ error: `Error al crear producto: ${error.message}` });
    return res.status(201).json({ mensaje: 'Producto creado exitosamente', id: data.id });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}