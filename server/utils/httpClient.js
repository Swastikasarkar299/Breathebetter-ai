// Server-side resilient HTTP client with timeout, retry, and in-flight deduplication

const inflight = new Map();

export async function fetchWithTimeoutRetry(url, options = {}) {
  const { timeoutMs = 7000, retries = 1, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const key = method === 'GET' ? url : null;

  if (key && inflight.has(key)) {
    return inflight.get(key);
  }

  const execute = async () => {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { ...fetchOptions, signal: controller.signal });
        clearTimeout(timer);
        if (resp.status >= 500 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          continue;
        }
        return resp;
      } catch (err) {
        clearTimeout(timer);
        lastErr = err?.name === 'AbortError'
          ? new Error(`Upstream timeout after ${timeoutMs}ms`)
          : err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        }
      }
    }
    throw lastErr || new Error('Upstream request failed');
  };

  const promise = execute().finally(() => {
    if (key) inflight.delete(key);
  });

  if (key) inflight.set(key, promise);
  return promise;
}
