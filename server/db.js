import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbPath() {
  if (process.env.SQLITE_DB_PATH) return process.env.SQLITE_DB_PATH;
  // Vercel serverless filesystem is read-only outside /tmp
  if (process.env.VERCEL) return '/tmp/breathebetter.db';
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'breathebetter.db');
}

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  const dbPath = resolveDbPath();
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      profile_json TEXT NOT NULL DEFAULT '{}',
      preferences_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_locations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      city_name TEXT NOT NULL,
      lat REAL,
      lon REAL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planner_activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'outdoor',
      scheduled_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      recommended_aqi INTEGER,
      weather_note TEXT,
      safety_status TEXT NOT NULL DEFAULT 'Moderate',
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      author_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Discussion',
      location TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      likes_count INTEGER NOT NULL DEFAULT 0,
      reports_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id TEXT,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS post_likes (
      post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      city TEXT,
      aqi_value INTEGER,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS aqi_history (
      id TEXT PRIMARY KEY,
      city TEXT NOT NULL,
      lat REAL,
      lon REAL,
      aqi INTEGER NOT NULL,
      pm25 REAL,
      pm10 REAL,
      no2 REAL,
      o3 REAL,
      co REAL,
      so2 REAL,
      temperature REAL,
      humidity INTEGER,
      wind_speed REAL,
      source TEXT NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS eco_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      co2_kg REAL NOT NULL DEFAULT 0,
      trips_avoided INTEGER NOT NULL DEFAULT 0,
      distance_km REAL DEFAULT 0,
      transport_mode TEXT,
      completed INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedCommunityIfEmpty(db);
  dbInstance = db;
  return db;
}

function seedCommunityIfEmpty(db) {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM community_posts').get();
  if (row && row.cnt === 0) {
    const insertPost = db.prepare(`
      INSERT INTO community_posts (id, user_id, author_name, category, location, title, content, likes_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertComment = db.prepare(`
      INSERT INTO community_comments (id, post_id, user_id, author_name, content)
      VALUES (?, ?, ?, ?, ?)
    `);

    const p1 = crypto.randomUUID();
    const p2 = crypto.randomUUID();
    const p3 = crypto.randomUUID();

    insertPost.run(
      p1,
      'seed-1',
      'Priya S.',
      'Pollution Report',
      'New Delhi, India',
      'Heavy roadside dust near Outer Ring Road flyover',
      'Construction vehicles without covers are kicking up dense PM10 dust between 8–10 AM. Wearing N95 masks if commuting through this stretch.',
      12
    );
    insertPost.run(
      p2,
      'seed-2',
      'Rahul M.',
      'Eco Challenge',
      'Bengaluru, India',
      'Switched 5-day office commute to Metro + 1.5 km walk',
      'Saved around 8.2 kg CO₂ this week and avoided peak junction exhaust by using side lanes for the final walk.',
      19
    );
    insertPost.run(
      p3,
      'seed-3',
      'Ananya K.',
      'Awareness',
      'Kolkata, India',
      'Reminder: Wet-mopping lowers indoor PM2.5 vs dry sweeping',
      'Sharing a helpful habit for winter mornings — keep windows sealed during 7–9 AM rush hours and use a damp microfiber mop.',
      9
    );

    insertComment.run(
      crypto.randomUUID(),
      p1,
      'seed-2',
      'Rahul M.',
      'Thanks for the alert — taking the metro line instead today.'
    );
  }
}

export function makeId() {
  return crypto.randomUUID();
}
