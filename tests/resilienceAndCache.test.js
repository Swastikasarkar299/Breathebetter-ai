import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCached, setCached, clearCache } from '../server/utils/cache.js';
import { sanitizeText, isValidEmail, validateLatLon } from '../server/middleware/validate.js';
import { fetchWithResilience } from '../src/utils/fetchWithResilience.js';

describe('Server Cache & Input Validation', () => {
  afterEach(() => {
    clearCache();
    vi.restoreAllMocks();
  });

  it('stores and expires TTL cache entries cleanly', async () => {
    setCached('test-key', { aqi: 55 }, 40);
    expect(getCached('test-key')).toEqual({ aqi: 55 });
    await new Promise((r) => setTimeout(r, 60));
    expect(getCached('test-key')).toBeNull();
  });

  it('sanitizes control characters and respects max length', () => {
    const dirty = '  Hello\u0000\u0007 World!  ';
    expect(sanitizeText(dirty, 50)).toBe('Hello World!');
    expect(sanitizeText('abcdefghij', 5)).toBe('abcde');
  });

  it('validates email addresses and geographic bounds', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);

    expect(validateLatLon(28.6, 77.2).valid).toBe(true);
    expect(validateLatLon(120, 77.2).valid).toBe(false);
    expect(validateLatLon('abc', 10).valid).toBe(false);
  });
});

describe('fetchWithResilience', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deduplicates simultaneous identical GET requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const [r1, r2] = await Promise.all([
      fetchWithResilience('https://example.test/api/ping'),
      fetchWithResilience('https://example.test/api/ping'),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries transient 5xx responses once before succeeding', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('err', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const resp = await fetchWithResilience('https://example.test/api/retry', { retries: 1 });
    expect(resp.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
