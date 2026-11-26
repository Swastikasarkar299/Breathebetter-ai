import express from 'express';
import { getDb, makeId } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

function resolveActor(req) {
  if (req.user?.id) return { id: req.user.id, name: req.user.name || 'Member', isGuest: false };
  const guestId = String(req.headers['x-client-id'] || '').trim();
  return { id: guestId || 'guest-default', name: 'Guest User', isGuest: true };
}

// ─── PLANNER CRUD ────────────────────────────────────────────────────────────
router.get('/planner', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT id, title, category, scheduled_date as scheduledDate, time_slot as timeSlot,
             recommended_aqi as recommendedAqi, weather_note as weatherNote,
             safety_status as safetyStatus, completed, created_at as createdAt
      FROM planner_activities
      WHERE user_id = ?
      ORDER BY scheduled_date ASC, created_at DESC
    `)
    .all(actor.id);
  return res.json({ activities: rows.map((r) => ({ ...r, completed: Boolean(r.completed) })) });
});

router.post('/planner', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Activity title is required.' });

  const db = getDb();
  // Ensure guest or user row exists cleanly only if foreign key applies
  if (!actor.isGuest) {
    const u = db.prepare('SELECT id FROM users WHERE id = ?').get(actor.id);
    if (!u) return res.status(401).json({ error: 'User session invalid.' });
  } else {
    db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
      VALUES (?, 'Guest User', ?, 'guest-no-login', 'guest')
    `).run(actor.id, `${actor.id}@guest.local`);
  }

  const id = makeId();
  const category = String(req.body?.category || 'outdoor');
  const scheduledDate = String(req.body?.scheduledDate || new Date().toISOString().slice(0, 10));
  const timeSlot = String(req.body?.timeSlot || '08:00 AM');
  const recommendedAqi = req.body?.recommendedAqi != null ? Number(req.body.recommendedAqi) : null;
  const weatherNote = String(req.body?.weatherNote || '');
  const safetyStatus = String(req.body?.safetyStatus || 'Moderate');

  db.prepare(`
    INSERT INTO planner_activities (id, user_id, title, category, scheduled_date, time_slot, recommended_aqi, weather_note, safety_status, completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, actor.id, title, category, scheduledDate, timeSlot, recommendedAqi, weatherNote, safetyStatus);

  const created = db
    .prepare(`
      SELECT id, title, category, scheduled_date as scheduledDate, time_slot as timeSlot,
             recommended_aqi as recommendedAqi, weather_note as weatherNote,
             safety_status as safetyStatus, completed, created_at as createdAt
      FROM planner_activities WHERE id = ?
    `)
    .get(id);
  return res.status(201).json({ activity: { ...created, completed: Boolean(created.completed) } });
});

router.patch('/planner/:id', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  const existing = db.prepare('SELECT * FROM planner_activities WHERE id = ? AND user_id = ?').get(req.params.id, actor.id);
  if (!existing) return res.status(404).json({ error: 'Activity not found.' });

  const title = req.body?.title != null ? String(req.body.title).trim() : existing.title;
  const category = req.body?.category != null ? String(req.body.category) : existing.category;
  const scheduledDate = req.body?.scheduledDate != null ? String(req.body.scheduledDate) : existing.scheduled_date;
  const timeSlot = req.body?.timeSlot != null ? String(req.body.timeSlot) : existing.time_slot;
  const completed = req.body?.completed != null ? (req.body.completed ? 1 : 0) : existing.completed;

  db.prepare(`
    UPDATE planner_activities
    SET title = ?, category = ?, scheduled_date = ?, time_slot = ?, completed = ?
    WHERE id = ? AND user_id = ?
  `).run(title, category, scheduledDate, timeSlot, completed, req.params.id, actor.id);

  const updated = db
    .prepare(`
      SELECT id, title, category, scheduled_date as scheduledDate, time_slot as timeSlot,
             recommended_aqi as recommendedAqi, weather_note as weatherNote,
             safety_status as safetyStatus, completed, created_at as createdAt
      FROM planner_activities WHERE id = ?
    `)
    .get(req.params.id);
  return res.json({ activity: { ...updated, completed: Boolean(updated.completed) } });
});

router.delete('/planner/:id', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  db.prepare('DELETE FROM planner_activities WHERE id = ? AND user_id = ?').run(req.params.id, actor.id);
  return res.json({ ok: true });
});

// ─── COMMUNITY CRUD ──────────────────────────────────────────────────────────
router.get('/community/posts', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  const category = String(req.query.category || '').trim();

  const posts = category && category !== 'All'
    ? db.prepare('SELECT * FROM community_posts WHERE category = ? ORDER BY created_at DESC LIMIT 60').all(category)
    : db.prepare('SELECT * FROM community_posts ORDER BY created_at DESC LIMIT 60').all();

  const commentsStmt = db.prepare('SELECT id, post_id as postId, user_id as userId, author_name as authorName, content, created_at as createdAt FROM community_comments WHERE post_id = ? ORDER BY created_at ASC');
  const likedStmt = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?');

  const enriched = posts.map((p) => ({
    id: p.id,
    userId: p.user_id,
    authorName: p.author_name,
    category: p.category,
    location: p.location,
    title: p.title,
    content: p.content,
    likesCount: p.likes_count,
    reportsCount: p.reports_count,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    likedByMe: Boolean(likedStmt.get(p.id, actor.id)),
    isOwner: p.user_id === actor.id,
    comments: commentsStmt.all(p.id),
  }));

  return res.json({ posts: enriched });
});

router.post('/community/posts', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const title = String(req.body?.title || '').trim();
  const content = String(req.body?.content || '').trim();
  const category = String(req.body?.category || 'Discussion').trim();
  const location = String(req.body?.location || 'Local Area').trim();
  const authorName = actor.isGuest
    ? String(req.body?.authorName || 'Community Member').trim() || 'Community Member'
    : actor.name;

  if (title.length < 3 || content.length < 5) {
    return res.status(400).json({ error: 'Please include a title and description.' });
  }

  const db = getDb();
  const id = makeId();
  db.prepare(`
    INSERT INTO community_posts (id, user_id, author_name, category, location, title, content)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, actor.id, authorName, category, location, title, content);

  const p = db.prepare('SELECT * FROM community_posts WHERE id = ?').get(id);
  return res.status(201).json({
    post: {
      id: p.id,
      userId: p.user_id,
      authorName: p.author_name,
      category: p.category,
      location: p.location,
      title: p.title,
      content: p.content,
      likesCount: p.likes_count,
      reportsCount: p.reports_count,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      likedByMe: false,
      isOwner: true,
      comments: [],
    },
  });
});

router.patch('/community/posts/:id', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  const post = db.prepare('SELECT * FROM community_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== actor.id) {
    return res.status(403).json({ error: 'You can only edit your own posts.' });
  }

  const title = req.body?.title != null ? String(req.body.title).trim() : post.title;
  const content = req.body?.content != null ? String(req.body.content).trim() : post.content;
  const category = req.body?.category != null ? String(req.body.category).trim() : post.category;

  db.prepare(`
    UPDATE community_posts SET title = ?, content = ?, category = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(title, content, category, req.params.id);

  return res.json({ ok: true, title, content, category });
});

router.delete('/community/posts/:id', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  const post = db.prepare('SELECT * FROM community_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== actor.id) {
    return res.status(403).json({ error: 'You can only delete your own posts.' });
  }

  db.prepare('DELETE FROM community_posts WHERE id = ?').run(req.params.id);
  return res.json({ ok: true });
});

router.post('/community/posts/:id/like', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  const post = db.prepare('SELECT id, likes_count FROM community_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const already = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(req.params.id, actor.id);
  if (already) {
    db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(req.params.id, actor.id);
    db.prepare('UPDATE community_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(req.params.id);
  } else {
    db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(req.params.id, actor.id);
    db.prepare('UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?').run(req.params.id);
  }
  const updated = db.prepare('SELECT likes_count FROM community_posts WHERE id = ?').get(req.params.id);
  return res.json({ likedByMe: !already, likesCount: updated.likes_count });
});

router.post('/community/posts/:id/comments', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const content = String(req.body?.content || '').trim();
  const authorName = actor.isGuest
    ? String(req.body?.authorName || 'Member').trim() || 'Member'
    : actor.name;
  if (!content) return res.status(400).json({ error: 'Comment text is required.' });

  const db = getDb();
  const post = db.prepare('SELECT id FROM community_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const id = makeId();
  db.prepare('INSERT INTO community_comments (id, post_id, user_id, author_name, content) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.id, actor.id, authorName, content);
  const comment = db
    .prepare('SELECT id, post_id as postId, user_id as userId, author_name as authorName, content, created_at as createdAt FROM community_comments WHERE id = ?')
    .get(id);
  return res.status(201).json({ comment });
});

router.post('/community/posts/:id/report', optionalAuth, (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT id FROM community_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  db.prepare('UPDATE community_posts SET reports_count = reports_count + 1 WHERE id = ?').run(req.params.id);
  return res.json({ ok: true, message: 'Report recorded for moderation review.' });
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
router.get('/notifications', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT id, type, title, message, city, aqi_value as aqiValue, is_read as isRead, created_at as createdAt
      FROM notifications WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 40
    `)
    .all(actor.id);
  return res.json({ notifications: rows.map((r) => ({ ...r, isRead: Boolean(r.isRead) })) });
});

router.post('/notifications', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const type = String(req.body?.type || 'aqi_alert');
  const title = String(req.body?.title || '').trim();
  const message = String(req.body?.message || '').trim();
  const city = req.body?.city ? String(req.body.city) : null;
  const aqiValue = req.body?.aqiValue != null ? Number(req.body.aqiValue) : null;

  if (!title || !message) return res.status(400).json({ error: 'Notification title and message required.' });

  const db = getDb();
  // Deduplicate identical alert title within last 3 hours
  const dup = db
    .prepare(`
      SELECT id FROM notifications
      WHERE user_id = ? AND title = ? AND created_at >= datetime('now', '-3 hours')
      LIMIT 1
    `)
    .get(actor.id, title);
  if (dup) return res.json({ deduplicated: true, id: dup.id });

  const id = makeId();
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, city, aqi_value, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, actor.id, type, title, message, city, aqiValue);

  const created = db
    .prepare('SELECT id, type, title, message, city, aqi_value as aqiValue, is_read as isRead, created_at as createdAt FROM notifications WHERE id = ?')
    .get(id);
  return res.status(201).json({ notification: { ...created, isRead: false } });
});

router.patch('/notifications/:id/read', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, actor.id);
  return res.json({ ok: true });
});

router.patch('/notifications/read-all', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(actor.id);
  return res.json({ ok: true });
});

router.delete('/notifications', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(actor.id);
  return res.json({ ok: true });
});

// ─── ECO IMPACT LOGS ─────────────────────────────────────────────────────────
router.get('/eco', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  const logs = db
    .prepare(`
      SELECT id, action, co2_kg as co2Kg, trips_avoided as tripsAvoided,
             distance_km as distanceKm, transport_mode as transportMode,
             completed, created_at as createdAt
      FROM eco_logs WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 80
    `)
    .all(actor.id);
  return res.json({ logs: logs.map((l) => ({ ...l, completed: Boolean(l.completed) })) });
});

router.post('/eco', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const action = String(req.body?.action || '').trim();
  if (!action) return res.status(400).json({ error: 'Action description is required.' });

  const db = getDb();
  const id = makeId();
  db.prepare(`
    INSERT INTO eco_logs (id, user_id, action, co2_kg, trips_avoided, distance_km, transport_mode, completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    id,
    actor.id,
    action,
    Number(req.body?.co2Kg || 0),
    Number(req.body?.tripsAvoided || 0),
    Number(req.body?.distanceKm || 0),
    String(req.body?.transportMode || 'Transit')
  );
  const created = db
    .prepare('SELECT id, action, co2_kg as co2Kg, trips_avoided as tripsAvoided, distance_km as distanceKm, transport_mode as transportMode, completed, created_at as createdAt FROM eco_logs WHERE id = ?')
    .get(id);
  return res.status(201).json({ log: { ...created, completed: Boolean(created.completed) } });
});

router.delete('/eco/:id', optionalAuth, (req, res) => {
  const actor = resolveActor(req);
  const db = getDb();
  db.prepare('DELETE FROM eco_logs WHERE id = ? AND user_id = ?').run(req.params.id, actor.id);
  return res.json({ ok: true });
});

export default router;
