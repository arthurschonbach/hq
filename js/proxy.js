// CORS fetching via our Cloudflare Worker, with free fallbacks.
import { PROXY_URL, FALLBACK_PROXIES } from './config.js';

const FALLBACK_TIMEOUT = 6000; // free proxies are flaky: fail fast

function sources(timeout) {
  return [
    { prefix: PROXY_URL, timeout },
    ...FALLBACK_PROXIES.map((prefix) => ({ prefix, timeout: Math.min(timeout, FALLBACK_TIMEOUT) })),
  ];
}

/** Raw text fetch (RSS, etc). Tries each proxy in order. */
export async function proxyText(rawUrl, timeout = 12000) {
  const errors = [];
  for (const { prefix, timeout: ms } of sources(timeout)) {
    try {
      const res = await fetch(prefix + encodeURIComponent(rawUrl), {
        signal: AbortSignal.timeout(ms),
        cache: 'no-store', // the worker caches at the edge; skip stale per-origin browser copies
      });
      if (!res.ok) {
        errors.push(prefix + ': ' + res.status);
        continue;
      }
      return await res.text();
    } catch (e) {
      errors.push(prefix + ': ' + e.message);
    }
  }
  throw new Error('All proxies failed: ' + errors.join(' | '));
}

/** JSON fetch. Skips sources that return non-JSON bodies (e.g. rate-limit pages). */
export async function proxyJson(rawUrl, timeout = 12000) {
  const errors = [];
  for (const { prefix, timeout: ms } of sources(timeout)) {
    try {
      const res = await fetch(prefix + encodeURIComponent(rawUrl), {
        signal: AbortSignal.timeout(ms),
        cache: 'no-store', // the worker caches at the edge; skip stale per-origin browser copies
      });
      if (!res.ok) {
        errors.push(prefix + ': ' + res.status);
        continue;
      }
      const text = await res.text();
      const t = text.trimStart();
      if (t.startsWith('[') || t.startsWith('{')) return JSON.parse(text);
      errors.push(prefix + ': non-JSON');
    } catch (e) {
      errors.push(prefix + ': ' + e.message);
    }
  }
  throw new Error('All proxies failed: ' + errors.join(' | '));
}
