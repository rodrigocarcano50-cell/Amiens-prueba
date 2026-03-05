import bcrypt from 'bcryptjs';
import { supabase } from '../_lib/supabase.js';
import { verifyToken, setCors } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = verifyToken(req, res);
  if (!auth) return;

  // GET /api/auth/usuarios
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('usuario')
      .select('id, username');

    if (error) return res.status(500).json({ error: 'Error al obtener usuarios' });
    return res.status(200).json(data);
  }

  // POST /api/auth/usuarios  →  registrar nuevo usuario (solo id=1)
  if (req.method === 'POST') {
    if (auth.userId !== '1') {
      return res.status(403).json({ error: 'No tienes permiso para registrar usuarios' });
    }

    const { username, password } = req.body;

    const { data: existe } = await supabase
      .from('usuario')
      .select('id')
      .eq('username', username)
      .limit(1);

    if (existe && existe.length > 0) {
      return res.status(400).json({ error: 'Usuario ya existe' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { error } = await supabase
      .from('usuario')
      .insert([{ username, password_hash }]);

    if (error) return res.status(500).json({ error: 'Error al registrar usuario' });
    return res.status(200).json({ message: 'Usuario registrado con éxito' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
