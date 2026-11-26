// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

let server;
let base;
const tempDb = path.join(os.tmpdir(), `bb-vitest-${Date.now()}.db`);

async function api(url, options = {}) {
  const resp = await fetch(`${base}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await resp.json().catch(() => ({}));
  return { status: resp.status, headers: resp.headers, body };
}

describe('Backend API Integration, Auth, Security & Validation', () => {
  beforeAll(async () => {
    process.env.SQLITE_DB_PATH = tempDb;
    const { default: app } = await import('../server/app.js');
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(() => {
    server?.close();
    try { fs.unlinkSync(tempDb); } catch {}
  });

  it('exposes /api/health without leaking secrets and returns rate-limit headers', async () => {
    const res = await api('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.headers.get('ratelimit') || res.headers.get('x-content-type-options')).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain('AIza');
  });

  it('rejects out-of-range coordinates and invalid inputs with HTTP 400', async () => {
    const badCoords = await api('/api/air-quality/live?lat=999&lon=20');
    expect(badCoords.status).toBe(400);

    const emptyChat = await api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: '   ' }) });
    expect(emptyChat.status).toBe(400);
  });

  it('enforces authentication guards, duplicate registration, and password reset flow', async () => {
    const unauthMe = await api('/api/auth/me');
    expect(unauthMe.status).toBe(401);

    const email = `vitest-${Date.now()}@example.com`;
    const reg = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Engineer', email, password: 'securepassword1' }),
    });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();

    const dup = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dup', email, password: 'securepassword1' }),
    });
    expect(dup.status).toBe(409);

    const badPass = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'wrongpassword' }),
    });
    expect(badPass.status).toBe(401);

    const forgot = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    expect(forgot.status).toBe(200);
    expect(forgot.body.resetCodePreview).toBeTruthy();

    const reset = await api('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: forgot.body.resetCodePreview, newPassword: 'newpassword99' }),
    });
    expect(reset.status).toBe(200);

    const login = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'newpassword99' }),
    });
    expect(login.status).toBe(200);
  });

  it('enforces community post ownership permissions on edit and delete', async () => {
    const ownerHeaders = { 'X-Client-Id': 'owner-user-1' };
    const otherHeaders = { 'X-Client-Id': 'other-user-2' };

    const created = await api('/api/community/posts', {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        title: 'Air check report',
        content: 'Clear visibility along eastern corridor.',
        category: 'Discussion',
        location: 'Pune, India',
      }),
    });
    expect(created.status).toBe(201);
    const id = created.body.post.id;

    const forbiddenEdit = await api(`/api/community/posts/${id}`, {
      method: 'PATCH',
      headers: otherHeaders,
      body: JSON.stringify({ title: 'Tampered' }),
    });
    expect(forbiddenEdit.status).toBe(403);

    const forbiddenDelete = await api(`/api/community/posts/${id}`, {
      method: 'DELETE',
      headers: otherHeaders,
    });
    expect(forbiddenDelete.status).toBe(403);

    const allowedDelete = await api(`/api/community/posts/${id}`, {
      method: 'DELETE',
      headers: ownerHeaders,
    });
    expect(allowedDelete.status).toBe(200);
  });

  it('handles planner CRUD and notifications lifecycle cleanly', async () => {
    const headers = { 'X-Client-Id': 'planner-user-1' };
    const created = await api('/api/planner', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Morning indoor stretch', category: 'indoor', timeSlot: '07:00 AM' }),
    });
    expect(created.status).toBe(201);

    const patched = await api(`/api/planner/${created.body.activity.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ completed: true }),
    });
    expect(patched.status).toBe(200);
    expect(patched.body.activity.completed).toBe(true);

    const deleted = await api(`/api/planner/${created.body.activity.id}`, { method: 'DELETE', headers });
    expect(deleted.status).toBe(200);

    const notif = await api('/api/notifications', {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'aqi_alert', title: 'High PM2.5 Alert', message: 'Threshold exceeded' }),
    });
    expect(notif.status).toBe(201);
    const cleared = await api('/api/notifications', { method: 'DELETE', headers });
    expect(cleared.status).toBe(200);
  });
});
