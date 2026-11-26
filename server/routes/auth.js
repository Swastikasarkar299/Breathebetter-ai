import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getDb, makeId } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = express.Router();

function sanitizeUser(row) {
  if (!row) return null;
  let profile = {};
  let preferences = {};
  try { profile = JSON.parse(row.profile_json || '{}'); } catch {}
  try { preferences = JSON.parse(row.preferences_json || '{}'); } catch {}
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    profile,
    preferences,
    createdAt: row.created_at,
  };
}

function getUserLocations(db, userId) {
  return db
    .prepare('SELECT id, city_name as cityName, lat, lon, is_primary as isPrimary, created_at as createdAt FROM saved_locations WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC')
    .all(userId);
}

router.post('/register', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const location = String(req.body?.location || 'New Delhi, India').trim();

    if (name.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const id = makeId();
    const passwordHash = await bcrypt.hash(password, 10);
    const defaultProfile = {
      name,
      location,
      type: 'Working Professional',
      transport: 'Public Transport',
      outdoorActivity: 'Moderately Active',
      indoor: 'Apartment (small)',
      budget: 'Medium (₹500–5000)',
    };
    const defaultPrefs = {
      aqiAlerts: true,
      dailyReport: true,
      weatherAlerts: true,
      plannerReminders: true,
      challengeAlerts: true,
      alertThreshold: 150,
      aqiStandard: 'US_EPA',
      tempUnit: 'C',
      language: 'en',
      autoDetectLocation: false,
    };

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, profile_json, preferences_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, email, passwordHash, JSON.stringify(defaultProfile), JSON.stringify(defaultPrefs));

    if (location) {
      db.prepare('INSERT INTO saved_locations (id, user_id, city_name, is_primary) VALUES (?, ?, ?, 1)')
        .run(makeId(), id, location);
    }

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const user = sanitizeUser(row);
    const token = signToken(user);
    return res.status(201).json({ token, user, savedLocations: getUserLocations(db, id) });
  } catch (err) {
    console.error('[Auth Register Error]', err);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = sanitizeUser(row);
    const token = signToken(user);
    return res.json({ token, user, savedLocations: getUserLocations(db, row.id) });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

router.post('/forgot-password', (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      // Avoid account enumeration while keeping UX clear
      return res.json({
        ok: true,
        message: 'If an account matches this email, a reset code has been generated.',
      });
    }

    const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    db.prepare('INSERT INTO password_resets (token, user_id, expires_at, used) VALUES (?, ?, ?, 0)')
      .run(resetToken, user.id, expiresAt);

    return res.json({
      ok: true,
      message: 'Reset code generated (valid for 15 minutes).',
      resetCodePreview: resetToken,
    });
  } catch (err) {
    console.error('[Forgot Password Error]', err);
    return res.status(500).json({ error: 'Unable to initiate password reset.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim().toUpperCase();
    const newPassword = String(req.body?.newPassword || '');
    if (!token || newPassword.length < 6) {
      return res.status(400).json({ error: 'Valid reset code and password (6+ chars) required.' });
    }

    const db = getDb();
    const resetRow = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').get(token);
    if (!resetRow || Date.now() > resetRow.expires_at) {
      return res.status(400).json({ error: 'Reset code is invalid or expired.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newHash, resetRow.user_id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token);

    return res.json({ ok: true, message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('[Reset Password Error]', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: sanitizeUser(row), savedLocations: getUserLocations(db, row.id) });
});

router.patch('/profile', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!row) return res.status(404).json({ error: 'User not found.' });

    const nextName = String(req.body?.name || row.name).trim() || row.name;
    const currentProfile = JSON.parse(row.profile_json || '{}');
    const currentPrefs = JSON.parse(row.preferences_json || '{}');

    const nextProfile = req.body?.profile ? { ...currentProfile, ...req.body.profile, name: nextName } : currentProfile;
    const nextPrefs = req.body?.preferences ? { ...currentPrefs, ...req.body.preferences } : currentPrefs;

    db.prepare(`
      UPDATE users
      SET name = ?, profile_json = ?, preferences_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(nextName, JSON.stringify(nextProfile), JSON.stringify(nextPrefs), req.user.id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return res.json({ user: sanitizeUser(updated), savedLocations: getUserLocations(db, req.user.id) });
  } catch (err) {
    console.error('[Profile Update Error]', err);
    return res.status(500).json({ error: 'Failed to save profile.' });
  }
});

router.post('/locations', requireAuth, (req, res) => {
  const cityName = String(req.body?.cityName || '').trim();
  const lat = req.body?.lat != null ? Number(req.body.lat) : null;
  const lon = req.body?.lon != null ? Number(req.body.lon) : null;
  if (!cityName) return res.status(400).json({ error: 'City name required.' });

  const db = getDb();
  const exists = db.prepare('SELECT id FROM saved_locations WHERE user_id = ? AND lower(city_name) = lower(?)').get(req.user.id, cityName);
  if (!exists) {
    db.prepare('INSERT INTO saved_locations (id, user_id, city_name, lat, lon, is_primary) VALUES (?, ?, ?, ?, ?, 0)')
      .run(makeId(), req.user.id, cityName, lat, lon);
  }
  return res.json({ savedLocations: getUserLocations(db, req.user.id) });
});

router.delete('/locations/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM saved_locations WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  return res.json({ savedLocations: getUserLocations(db, req.user.id) });
});

export default router;
