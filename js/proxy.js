// CORS fetching via our Cloudflare Worker, with free fallbacks.
import { PROXY_URL, FALLBACK_PROXIES } from './config.js';

function sources() {
  return [PROXY_URL, ...FALLBACK_PROXIES];
}

/** Raw text fetch (RSS, etc). Tries each proxy in order. */
export async function proxyText(rawUrl, timeout = 12000) {
  const errors = [];
  for (const prefix of sources()) {
    try {
      const res = await fetch(prefix + encodeURIComponent(rawUrl), {
        signal: AbortSignal.timeout(timeout),
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
  for (const prefix of sources()) {
    try {
      const res = await fetch(prefix + encodeURIComponent(rawUrl), {
        signal: AbortSignal.timeout(timeout),
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
