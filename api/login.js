import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) body = {};

  const { username, password } = body;

  const { data: usuarios, error } = await supabase
    .from('usuario')
    .select('*')
    .eq('username', username.toLowerCase())
    .limit(1);

  if (error || !usuarios || usuarios.length === 0)
    return res.status(401).json({ error: 'Usuario no encontrado', supabase_error: error });

  const user = usuarios[0];
  
  // Retornar info de debug sin loguear
  const passwordValida = await bcrypt.compare(password, user.password_hash);
  
  return res.status(200).json({
    debug: true,
    username_recibido: username,
    password_recibido: password,
    hash_en_db: user.password_hash,
    bcrypt_resultado: passwordValida
  });
}