import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../_lib/supabase.js';
import { setCors } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Faltan credenciales' });
  }

  const { data: usuarios, error } = await supabase
    .from('usuario')
    .select('*')
    .eq('username', username.toLowerCase())
    .limit(1);

  if (error || !usuarios || usuarios.length === 0) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const user = usuarios[0];
  const passwordValida = await bcrypt.compare(password, user.password_hash);

  if (!passwordValida) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const access_token = jwt.sign(
    { sub: String(user.id) },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return res.status(200).json({ access_token });
}
