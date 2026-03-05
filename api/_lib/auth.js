import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifica el token JWT de la request.
 * Retorna { userId } si es válido, o llama res.status(401) y retorna null.
 */
export function verifyToken(req, res) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { userId: decoded.sub };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'El token ha expirado',
        mensaje: 'Por favor, iniciá sesión nuevamente'
      });
    } else {
      res.status(401).json({ error: 'Token inválido' });
    }
    return null;
  }
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
