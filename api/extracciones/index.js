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

  // GET /api/extracciones
  if (req.method === 'GET') {
    const { data: extracciones, error } = await supabase
      .from('extraccion')
      .select(`
        id,
        fecha,
        descripcion,
        usuario_id,
        detalle_extraccion ( producto_id, cantidad )
      `)
      .order('fecha', { ascending: false });

    if (error) return res.status(500).json({ error: 'Error al obtener extracciones' });

    const resultado = extracciones.map(e => ({
      id: e.id,
      descripcion: e.descripcion,
      fecha: e.fecha,
      usuario_id: e.usuario_id,
      detalles: e.detalle_extraccion.map(d => ({
        producto_id: d.producto_id,
        cantidad: d.cantidad
      }))
    }));

    return res.status(200).json(resultado);
  }

  // POST /api/extracciones
  if (req.method === 'POST') {
    const { descripcion, productos, fecha } = req.body;

    if (!productos || !Array.isArray(productos)) {
      return res.status(400).json({ error: "Formato inválido. Se requiere 'productos' como lista" });
    }

    // 1. Verificar stock de todos los productos antes de operar
    const errores = [];
    for (const item of productos) {
      const { data: prod, error } = await supabase
        .from('producto')
        .select('id, nombre, stock')
        .eq('id', item.producto_id)
        .single();

      if (error || !prod) {
        errores.push(`Producto ID ${item.producto_id} no existe`);
        continue;
      }
      if (prod.stock < item.cantidad) {
        errores.push(`Stock insuficiente para ${prod.nombre} (Stock actual: ${prod.stock}, Se requieren: ${item.cantidad})`);
      }
    }

    if (errores.length > 0) {
      return res.status(400).json({ error: 'Validación fallida', detalles: errores });
    }

    // 2. Crear la extracción
    const { data: nueva, error: errorExtraccion } = await supabase
      .from('extraccion')
      .insert([{
        usuario_id: auth.userId,
        descripcion: descripcion || 'Extracción sin descripción',
        fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString()
      }])
      .select()
      .single();

    if (errorExtraccion) {
      return res.status(500).json({ error: `Error al crear extracción: ${errorExtraccion.message}` });
    }

    // 3. Insertar detalles y actualizar stock
    const stockActualizado = [];
    for (const item of productos) {
      // Insertar detalle
      await supabase
        .from('detalle_extraccion')
        .insert([{
          extraccion_id: nueva.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad
        }]);

      // Obtener stock actual y restar
      const { data: prod } = await supabase
        .from('producto')
        .select('stock, stock_minimo')
        .eq('id', item.producto_id)
        .single();

      const nuevoStock = prod.stock - item.cantidad;
      const nuevoEstado = calcularEstado(nuevoStock, prod.stock_minimo);

      await supabase
        .from('producto')
        .update({ stock: nuevoStock, estado: nuevoEstado })
        .eq('id', item.producto_id);

      stockActualizado.push({ producto_id: item.producto_id, nuevo_stock: nuevoStock });
    }

    return res.status(201).json({
      mensaje: 'Extracción registrada exitosamente',
      extraccion_id: nueva.id,
      stock_actualizado: stockActualizado
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
