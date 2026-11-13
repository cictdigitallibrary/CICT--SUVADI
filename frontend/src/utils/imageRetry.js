/**
 * imageRetry.js — recover images refused by the server's concurrency limit.
 *
 * The production IIS server (Plesk) answers some requests with an empty
 * 403 when one visitor has more than about 5 requests in flight (IIS Dynamic IP
 * Restrictions). Over HTTP/2 the browser requests every image of a page at once,
 * so covers, banners and ornaments fail at random, although the files exist.
 * The real fix is the server setting; this module makes the site recover from it:
 * a refused image is requested again, a little later, up to MAX_RETRIES times.
 *
 * - installImageRetry(): one capture-phase listener for every <img> on the site.
 *   While a retry is pending the error does not reach the component's own onError,
 *   so fallbacks appear only when the image really cannot be loaded.
 * - useImageRetry(url): the same for CSS background images.
 *
 * Missing files (404) are not retried when the browser reports the status.
 */
import { useEffect, useState } from 'react';

const MAX_RETRIES = 5; // 0.4 + 0.8 + 1.6 + 3.2 + 6.4 s
const RETRY_PARAM = '_r';

function parse(src) {
  try {
    const u = new URL(src, window.location.href);
    const n = parseInt(u.searchParams.get(RETRY_PARAM) || '0', 10) || 0;
    u.searchParams.delete(RETRY_PARAM);
    return { base: u.href, attempt: n };
  } catch {
    return null;
  }
}

function withAttempt(baseHref, attempt) {
  const u = new URL(baseHref);
  u.searchParams.set(RETRY_PARAM, String(attempt));
  return u.href;
}

// HTTP status of the last request for this URL, when the browser exposes it
// (same-origin resources in current Chromium/Firefox); 0 when unknown.
function lastStatus(href) {
  try {
    const entries = performance.getEntriesByName(href);
    const last = entries[entries.length - 1];
    return (last && last.responseStatus) || 0;
  } catch {
    return 0;
  }
}

const retryable = status => status !== 404 && status !== 410;
const delayFor = attempt => 400 * 2 ** attempt;

export function installImageRetry() {
  if (typeof document === 'undefined' || window.__suvadiImageRetry) return;
  window.__suvadiImageRetry = true;

  document.addEventListener('error', (event) => {
    const img = event.target;
    // Stylesheets too: a refused page stylesheet (e.g. the PDF reader's) is never
    // requested again by the bundler's loader, leaving the reader unstyled and blank.
    // A fresh <link> is added with a retry marker; the failed one is removed once it loads.
    if (img instanceof HTMLLinkElement && img.rel === 'stylesheet') {
      const href = img.getAttribute('href');
      const info = href && parse(href);
      if (!info || info.attempt >= MAX_RETRIES || !retryable(lastStatus(img.href))) return;
      setTimeout(() => {
        if (!img.isConnected) return;
        const fresh = img.cloneNode();
        fresh.href = withAttempt(info.base, info.attempt + 1);
        fresh.addEventListener('load', () => img.remove(), { once: true });
        img.after(fresh);
      }, delayFor(info.attempt));
      return;
    }
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute('src');
    if (!src || /^(data|blob):/.test(src)) return;
    const info = parse(src);
    if (!info || info.attempt >= MAX_RETRIES || !retryable(lastStatus(img.currentSrc || src))) return;

    // Retry pending: keep the error from the page's own onError fallback
    event.stopImmediatePropagation();
    setTimeout(() => {
      // Only if the element still shows the failed URL (not unmounted / re-pointed by React)
      if (img.isConnected && img.getAttribute('src') === src) {
        img.src = withAttempt(info.base, info.attempt + 1);
      }
    }, delayFor(info.attempt));
  }, true);
}

/**
 * Returns the URL to use for a CSS background image. Starts as `url` itself;
 * if loading it fails, retries and returns the retried URL once it has loaded.
 * The check shares the browser's request with the CSS background (no extra download).
 */
export function useImageRetry(url) {
  // URL that loaded after a retry, remembered for the url it replaces
  const [retried, setRetried] = useState({ of: null, src: null });

  useEffect(() => {
    if (!url || typeof Image === 'undefined') return undefined;
    const info = parse(url);
    if (!info) return undefined;

    let cancelled = false;
    let timer;
    const probe = new Image();
    const load = (attempt) => {
      const src = attempt === 0 ? url : withAttempt(info.base, attempt);
      probe.onload = () => { if (!cancelled && attempt > 0) setRetried({ of: url, src }); };
      probe.onerror = () => {
        if (cancelled || attempt >= MAX_RETRIES || !retryable(lastStatus(probe.src))) return;
        timer = setTimeout(() => load(attempt + 1), delayFor(attempt));
      };
      probe.src = src;
    };
    load(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      probe.onload = probe.onerror = null;
    };
  }, [url]);

  return retried.of === url ? retried.src : url;
}
