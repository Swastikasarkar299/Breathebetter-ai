// Resilient HTTP fetch utility with timeouts, retries, and in-flight GET deduplication

const inflightRequests = new Map();

/**
 * Fetch JSON with AbortController timeout and exponential backoff retries on transient network/5xx errors.
 * Deduplicates concurrent identical GET requests.
 */
export async function fetchWithResilience(url, options = {}) {
  const {
    timeoutMs = 8000,
    retries = 1,
    dedupe = !options.method || options.method.toUpperCase() === 'GET',
    ...fetchOpts
  } = options;

  const dedupeKey = dedupe ? `${fetchOpts.method || 'GET'}:${url}` : null;
  if (dedupeKey && inflightRequests.has(dedupeKey)) {
    return inflightRequests.get(dedupeKey);
  }

  const run = async () => {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { ...fetchOpts, signal: controller.signal });
        clearTimeout(timer);
        if (resp.status >= 500 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }
        return resp;
      } catch (err) {
        clearTimeout(timer);
        lastError = err?.name === 'AbortError'
          ? new Error(`Request timed out after ${timeoutMs}ms`)
          : err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }
    }
    throw lastError || new Error('Network request failed');
  };

  const promise = run().finally(() => {
    if (dedupeKey) inflightRequests.delete(dedupeKey);
  });

  if (dedupeKey) inflightRequests.set(dedupeKey, promise);
  return promise;
}
