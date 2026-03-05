import { verifyToken, setCors } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = verifyToken(req, res);
  if (!auth) return;

  return res.status(200).json({ mensaje: `Acceso concedido al usuario ${auth.userId}` });
}
