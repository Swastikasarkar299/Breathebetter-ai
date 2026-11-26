import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const EPHEMERAL_RUNTIME_SECRET = crypto.randomBytes(32).toString('hex');
const DEV_LOCAL_SECRET = 'breathebetter-dev-local-jwt-secret';

function getSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16) {
    return process.env.JWT_SECRET.trim();
  }
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return EPHEMERAL_RUNTIME_SECRET;
  }
  return DEV_LOCAL_SECRET;
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role || 'user' },
    getSecret(),
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
  }
}

export function optionalAuth(req, _res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}
