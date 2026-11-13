/**
 * Byte-range loading of an edition PDF that tolerates the web server's
 * per-visitor limit on simultaneous requests.
 *
 * The live server (IIS / Plesk) answers 403 to requests over a small number in flight
 * at once from one IP address — measured: 6 at a time pass, 25 at a time → ~19 refused.
 * PDF.js's own loader fires several range requests together and treats one refusal as
 * a failed document, after which the reader fell back to streaming the whole PDF (up to
 * ~700 MB) — the long "Loading book edition…" wait.
 *
 * Here PDF.js receives the bytes through a PDFDataRangeTransport instead: range requests
 * go through one queue (at most 2 in flight, leaving room for the page's images), and a
 * refused or failed request is retried with back-off instead of failing the book.
 */
import { pdfjs } from 'react-pdf';

const MAX_IN_FLIGHT = 2;
// Retry delays (ms): ~1.5 minutes in total before a range is given up
const RETRY_DELAYS = [400, 800, 1500, 2500, 4000, 6000, 8000, 10000, 10000, 10000, 10000, 10000, 10000];
const TRANSIENT = new Set([403, 408, 425, 429, 500, 502, 503, 504]);

let inFlight = 0;
const waiting = [];
function limited(task) {
  return new Promise((resolve, reject) => {
    const run = () => {
      inFlight += 1;
      task().then(resolve, reject).finally(() => {
        inFlight -= 1;
        const next = waiting.shift();
        if (next) next();
      });
    };
    if (inFlight < MAX_IN_FLIGHT) run(); else waiting.push(run);
  });
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
});

class FatalRangeError extends Error {}

/** GET bytes [start, endExclusive) with retries; resolves { bytes, total } */
async function fetchRange(url, start, endExclusive, signal) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { Range: `bytes=${start}-${endExclusive - 1}` }, signal });
      if (res.status === 206) {
        const total = Number((res.headers.get('Content-Range') || '').split('/')[1]) || 0;
        return { bytes: new Uint8Array(await res.arrayBuffer()), total };
      }
      if (res.status === 200) {
        // Server ignored the range: only acceptable when this is the whole (small) file
        if (start === 0) return { bytes: new Uint8Array(await res.arrayBuffer()), total: -1 };
        throw new FatalRangeError('Server does not support byte ranges');
      }
      if (!TRANSIENT.has(res.status)) throw new FatalRangeError(`HTTP ${res.status}`);
      // Transient: let the response go and retry below
      res.body?.cancel().catch(() => {});
    } catch (err) {
      if (signal?.aborted || err instanceof FatalRangeError) throw err;
      // network errors are retried like refused requests
    }
    if (attempt >= RETRY_DELAYS.length) throw new Error(`Could not load bytes ${start}-${endExclusive - 1} of the PDF`);
    await sleep(RETRY_DELAYS[attempt], signal);
  }
}

/**
 * Opens `url` for PDF.js. Resolves to a react-pdf `file` value: { range } (or { data }
 * for a file small enough to arrive in the first request).
 * `onFatal` is called if a later range still fails after all retries (PDF.js itself has
 * no way to report that and would wait forever).
 */
export async function openRangedPdf(url, { chunkSize, signal, onFatal } = {}) {
  const first = await limited(() => fetchRange(url, 0, chunkSize, signal));
  if (first.total === -1 || (first.total > 0 && first.total <= first.bytes.length)) {
    return { data: first.bytes };
  }
  if (!(first.total > 0)) throw new FatalRangeError('Unknown PDF size');

  const transport = new pdfjs.PDFDataRangeTransport(first.total, first.bytes);
  let failed = false;
  transport.requestDataRange = (begin, end) => {
    limited(() => fetchRange(url, begin, end, signal))
      .then(({ bytes }) => { if (!signal?.aborted) transport.onDataRange(begin, bytes); })
      .catch(err => {
        if (signal?.aborted || failed) return;
        failed = true;
        console.warn('[pdfRangeSource]', err.message);
        onFatal?.(err);
      });
  };
  signal?.addEventListener('abort', () => transport.abort(), { once: true });
  return { range: transport };
}
