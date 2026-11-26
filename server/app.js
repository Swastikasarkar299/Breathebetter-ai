import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import airQualityRoutes from './routes/airQuality.js';
import aiRoutes from './routes/ai.js';
import workspaceRoutes from './routes/workspace.js';
import { getDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'backend', '.env'), quiet: true });
dotenv.config({ path: path.join(rootDir, '.env.local'), quiet: true });
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

const app = express();

app.set('trust proxy', 1);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return configured.includes(origin);
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');

  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Client-Id');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use(express.json({ limit: '512kb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'AI rate limit reached. Please wait a moment before sending another question.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again later.' },
});

app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  getDb();
  res.json({
    status: 'healthy',
    runtime: 'nodejs-express',
    timestamp: new Date().toISOString(),
    database: process.env.SUPABASE_URL ? 'sqlite + supabase-ready' : 'sqlite-local',
    providers: {
      openMeteo: true,
      iqairConfigured: Boolean((process.env.IQAIR_API_KEY || '').trim()),
      geminiConfigured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
      openaiConfigured: Boolean((process.env.OPENAI_API_KEY || '').trim()),
    },
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/air-quality', airQualityRoutes);
app.use('/api/analytics', airQualityRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api', workspaceRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload too large.' });
  }
  return res.status(500).json({ error: 'Internal server error.' });
});

export default app;
