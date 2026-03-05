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

  // GET /api/ingresos
  if (req.method === 'GET') {
    const { data: ingresos, error } = await supabase
      .from('ingreso')
      .select(`
        id,
        fecha,
        usuario_id,
        detalle_ingreso ( producto_id, cantidad )
      `)
      .order('fecha', { ascending: false });

    if (error) return res.status(500).json({ error: 'Error al obtener ingresos' });

    const resultado = ingresos.map(i => ({
      id: i.id,
      fecha: i.fecha,
      usuario_id: i.usuario_id,
      detalles: i.detalle_ingreso.map(d => ({
        producto_id: d.producto_id,
        cantidad: d.cantidad
      }))
    }));

    return res.status(200).json(resultado);
  }

  // POST /api/ingresos
  if (req.method === 'POST') {
    const { detalles, fecha } = req.body;

    if (!detalles || !Array.isArray(detalles)) {
      return res.status(400).json({ error: "Formato inválido. Se requiere 'detalles' como lista" });
    }

    // Crear ingreso
    const { data: nuevo, error: errorIngreso } = await supabase
      .from('ingreso')
      .insert([{
        usuario_id: auth.userId,
        fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString()
      }])
      .select()
      .single();

    if (errorIngreso) {
      return res.status(500).json({ error: `Error interno: ${errorIngreso.message}` });
    }

    const resumenStock = [];

    for (const item of detalles) {
      const { data: prod, error: errProd } = await supabase
        .from('producto')
        .select('id, stock, stock_minimo')
        .eq('id', item.producto_id)
        .single();

      if (errProd || !prod) continue; // ignorar productos inexistentes

      // Insertar detalle
      await supabase
        .from('detalle_ingreso')
        .insert([{
          ingreso_id: nuevo.id,
          producto_id: prod.id,
          cantidad: item.cantidad
        }]);

      // Actualizar stock
      const nuevoStock = prod.stock + item.cantidad;
      const nuevoEstado = calcularEstado(nuevoStock, prod.stock_minimo);

      await supabase
        .from('producto')
        .update({ stock: nuevoStock, estado: nuevoEstado })
        .eq('id', prod.id);

      resumenStock.push({ producto_id: prod.id, nuevo_stock: nuevoStock });
    }

    return res.status(201).json({
      mensaje: 'Ingreso registrado exitosamente',
      ingreso_id: nuevo.id,
      stock_actualizado: resumenStock
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
