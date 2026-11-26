import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// Use isolated temporary database for smoke testing
const tempDb = path.join(os.tmpdir(), `bb-smoke-${Date.now()}.db`);
process.env.SQLITE_DB_PATH = tempDb;

const { default: app } = await import('./app.js');

const server = app.listen(0);
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

async function req(url, options = {}) {
  const res = await fetch(`${base}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

try {
  // 1. Health
  const health = await req('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.status, 'healthy');
  console.log('✓ GET /api/health');

  // 2. Auth register -> login -> forgot/reset -> profile -> saved locations
  const email = `smoke-${Date.now()}@example.com`;
  const reg = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test User', email, password: 'password123', location: 'Bengaluru, India' }),
  });
  assert.equal(reg.status, 201);
  assert.ok(reg.body.token);
  const token = reg.body.token;
  console.log('✓ POST /api/auth/register');

  const authHeader = { Authorization: `Bearer ${token}` };

  const me = await req('/api/auth/me', { headers: authHeader });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, email);
  console.log('✓ GET /api/auth/me');

  const forgot = await req('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  assert.equal(forgot.status, 200);
  assert.ok(forgot.body.resetCodePreview);

  const reset = await req('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: forgot.body.resetCodePreview, newPassword: 'newpassword456' }),
  });
  assert.equal(reset.status, 200);

  const login = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'newpassword456' }),
  });
  assert.equal(login.status, 200);
  console.log('✓ Auth forgot/reset/login flow');

  const addLoc = await req('/api/auth/locations', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ cityName: 'Tokyo, Japan', lat: 35.67, lon: 139.65 }),
  });
  assert.equal(addLoc.status, 200);
  assert.ok(addLoc.body.savedLocations.some((l) => l.cityName === 'Tokyo, Japan'));
  console.log('✓ Saved locations CRUD');

  // 3. Planner CRUD
  const pCreate = await req('/api/planner', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ title: 'Evening indoor yoga', category: 'indoor', timeSlot: '07:00 PM', safetyStatus: 'Safe' }),
  });
  assert.equal(pCreate.status, 201);
  const pid = pCreate.body.activity.id;
  const pPatch = await req(`/api/planner/${pid}`, {
    method: 'PATCH',
    headers: authHeader,
    body: JSON.stringify({ completed: true }),
  });
  assert.equal(pPatch.status, 200);
  assert.equal(pPatch.body.activity.completed, true);
  const pDel = await req(`/api/planner/${pid}`, { method: 'DELETE', headers: authHeader });
  assert.equal(pDel.status, 200);
  console.log('✓ Planner CRUD');

  // 4. Community CRUD + ownership check + like + comment
  const cCreate = await req('/api/community/posts', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      title: 'Clean Air Report',
      content: 'Air feels much clearer after afternoon winds.',
      category: 'Discussion',
      location: 'Bengaluru, India',
    }),
  });
  assert.equal(cCreate.status, 201);
  const postId = cCreate.body.post.id;

  const cLike = await req(`/api/community/posts/${postId}/like`, { method: 'POST', headers: authHeader });
  assert.equal(cLike.status, 200);
  assert.equal(cLike.body.likesCount, 1);

  const cComment = await req(`/api/community/posts/${postId}/comments`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ content: 'Confirmed!' }),
  });
  assert.equal(cComment.status, 201);

  const cForbidden = await req(`/api/community/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'X-Client-Id': 'other-user' },
  });
  assert.equal(cForbidden.status, 403);

  const cDel = await req(`/api/community/posts/${postId}`, { method: 'DELETE', headers: authHeader });
  assert.equal(cDel.status, 200);
  console.log('✓ Community CRUD + permissions + comments + likes');

  // 5. Notifications + Eco
  const nCreate = await req('/api/notifications', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ type: 'aqi_alert', title: 'Test AQI Alert', message: 'Threshold breached', city: 'Delhi', aqiValue: 180 }),
  });
  assert.equal(nCreate.status, 201);
  const nRead = await req('/api/notifications/read-all', { method: 'PATCH', headers: authHeader });
  assert.equal(nRead.status, 200);
  console.log('✓ Notifications CRUD');

  // 6. AI Chat endpoint
  const aiResp = await req('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Is it safe to walk outside today?',
      airQuality: { location: 'Bengaluru, India', aqi: 64, category: 'Moderate', pm25: 22, pm10: 48, windSpeed: 12 },
    }),
  });
  assert.equal(aiResp.status, 200);
  assert.ok(aiResp.body.response.length > 20);
  console.log('✓ POST /api/ai/chat');

  // 7. Live Open-Meteo endpoint check (external HTTP)
  const live = await req('/api/air-quality/live?city=London');
  assert.equal(live.status, 200);
  assert.equal(live.body.isLive, true);
  assert.ok(typeof live.body.aqi === 'number');
  console.log(`✓ GET /api/air-quality/live (London AQI=${live.body.aqi}, source=${live.body.dataSource})`);
} finally {
  server.close();
  try { fs.unlinkSync(tempDb); } catch {}
}
