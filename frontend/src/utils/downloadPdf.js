/**
 * Start downloading an edition PDF through the browser's own download manager.
 *
 * The server sends `?download=1` responses as attachments (backend/index.js), so the
 * download begins at once, shows progress in the browser and streams to disk.
 * The previous approach fetched the whole file into memory first (up to ~700 MB),
 * so nothing appeared to happen until it had completely arrived.
 */
export function downloadPdf(proxyUrl, title) {
  const href = `${proxyUrl}?download=1&name=${encodeURIComponent(title || '')}`;
  const a = document.createElement('a');
  a.href = href;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
