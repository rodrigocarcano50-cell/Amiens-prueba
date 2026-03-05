import bcrypt from 'bcryptjs';
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = verifyToken(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('usuario').select('id, username');
    if (error) return res.status(500).json({ error: 'Error al obtener usuarios' });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (auth.userId !== '1') return res.status(403).json({ error: 'No tienes permiso para registrar usuarios' });
    const { username, password } = req.body;
    const { data: existe } = await supabase.from('usuario').select('id').eq('username', username).limit(1);
    if (existe && existe.length > 0) return res.status(400).json({ error: 'Usuario ya existe' });
    const password_hash = await bcrypt.hash(password, 12);
    const { error } = await supabase.from('usuario').insert([{ username, password_hash }]);
    if (error) return res.status(500).json({ error: 'Error al registrar usuario' });
    return res.status(200).json({ message: 'Usuario registrado con éxito' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}