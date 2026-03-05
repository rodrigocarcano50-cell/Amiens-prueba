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

  // GET /api/productos
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('producto')
      .select('*')
      .order('nombre');

    if (error) return res.status(500).json({ error: 'Error al obtener productos' });

    // Mapear nombre → descripcion para el frontend
    const productos = data.map(p => ({
      id: p.id,
      descripcion: p.nombre,
      stock: p.stock,
      stock_minimo: p.stock_minimo,
      proveedor: p.proveedor,
      categoria: p.categoria,
      estado: p.estado
    }));

    return res.status(200).json(productos);
  }

  // POST /api/productos
  if (req.method === 'POST') {
    const { descripcion, stock, stock_minimo, proveedor, categoria } = req.body;

    const stockInt = parseInt(stock);
    const stockMinInt = parseInt(stock_minimo);
    const estado = calcularEstado(stockInt, stockMinInt);

    const { data, error } = await supabase
      .from('producto')
      .insert([{
        nombre: descripcion,
        stock: stockInt,
        stock_minimo: stockMinInt,
        proveedor: proveedor || '',
        categoria: categoria || 'General',
        estado
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: `Error al crear producto: ${error.message}` });

    return res.status(201).json({ mensaje: 'Producto creado exitosamente', id: data.id });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
