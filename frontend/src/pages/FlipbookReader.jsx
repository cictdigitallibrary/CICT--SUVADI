import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import HTMLFlipBook from 'react-pageflip';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, AlertCircle, Maximize, Minimize, Download, RotateCcw
} from 'lucide-react';

import { downloadPdf } from '../utils/downloadPdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// One PDF.js worker for the session, started as soon as this module loads — the
// edition page preloads it (EBookDetail), so opening a book does not first wait for
// the 1 MB worker script to download and start. PDF.js only destroys workers it
// created itself, so this one is reused by every book opened afterwards.
const sharedWorker = new pdfjs.PDFWorker({ name: 'suvadi-reader' });

/* Fullscreen API, including the webkit-prefixed form (iPad Safari). iPhone Safari has
   no element fullscreen at all; there the button switches to an in-page "immersive"
   view instead (header hidden, book enlarged), see toggleFS. */
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const HAS_NATIVE_FULLSCREEN = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

const ZOOM_MIN = 0.5, ZOOM_MAX = 1.8, ZOOM_STEP = 0.1;
// Stage padding around the book, and room kept below it for its floor shadow
const STAGE_PAD = 12, SHADOW_SPACE = 18;

// Render pages within ±N of the current page: the visible spread plus the pages
// revealed while flipping either way. Larger windows fetch and render pages nobody sees.
const RENDER_WIN = 3;

/* ─────────────────────────────────────────────────────────────────────────────
   Page flip sound
───────────────────────────────────────────────────────────────────────────── */
const flipAudio = new Audio('/flipsound.mp3');
flipAudio.volume = 0.5;
const playFlipSound = () => {
  try { flipAudio.currentTime = 0; flipAudio.play().catch(() => {}); } catch (_) {}
};

/* ─────────────────────────────────────────────────────────────────────────────
   PDFPage — renders the PDF page only while `active` (see FlipbookReader)

   The outer div belongs to page-flip: it rewrites that element's style.cssText
   when laying out and flipping, which wiped the white background, centring and
   clipping React had set there (pages then showed the maroon stage through them).
   All page styling therefore lives on the inner div / .suvadi-page class.
───────────────────────────────────────────────────────────────────────────── */
const PDFPage = React.forwardRef(({ pageNum, active, pdf, pageWidth, pageHeight, onRendered, onFailed }, ref) => {
  // Page shape, read before the first draw so the page is drawn once at its final
  // size (pages wider than the slot are fitted by width, so no edge is cut off).
  const [ratio, setRatio] = useState(null);

  useEffect(() => {
    if (!active || ratio !== null || !pdf) return undefined;
    let alive = true;
    pdf.getPage(pageNum)
      .then(p => { const v = p.getViewport({ scale: 1 }); if (alive) setRatio(v.width / v.height); })
      .catch(() => { if (alive) setRatio(pageWidth / pageHeight); }); // <Page> reports its own load error
    return () => { alive = false; };
  }, [active, ratio, pdf, pageNum, pageWidth, pageHeight]);

  // A failed load/draw (e.g. a byte-range request refused by the server) is reported
  // to the reader, which reloads the document (see onPageFailed). Cancelled draws are
  // not errors and never reach here.
  const onPageError = useCallback(() => onFailed?.(pageNum), [onFailed, pageNum]);
  const handleRendered = useCallback(() => onRendered?.(pageNum), [onRendered, pageNum]);
  const byWidth = ratio !== null && ratio > pageWidth / pageHeight;

  return (
    <div ref={ref} className="suvadi-page">
      <div style={{ width: '100%', height: '100%', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {active && ratio !== null ? (
          <Page pageNumber={pageNum}
            {...(byWidth ? { width: pageWidth } : { height: pageHeight })}
            onRenderSuccess={handleRendered} onRenderError={onPageError} onLoadError={onPageError}
            loading={null} error={null}
            renderTextLayer={false} renderAnnotationLayer={false} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#f7f4ef,#ede8e0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#c9973b40', fontFamily: 'Cinzel,serif', fontSize: 11 }}>{pageNum}</span>
          </div>
        )}
      </div>
    </div>
  );
});
PDFPage.displayName = 'PDFPage';

const PDF_OPTIONS = {
  cMapUrl: '/cmaps/',   // served locally from public/cmaps/ — no external CDN needed
  cMapPacked: true,
  worker: sharedWorker,
};

/* ─────────────────────────────────────────────────────────────────────────────
   FlipbookReader — PDF-only edition viewer
   Query params:
     edition=<edition ID>  — used as lookup key by the backend proxy
     title=<encoded title>
     back=<encoded return path>
───────────────────────────────────────────────────────────────────────────── */
export default function FlipbookReader() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();

  const editionId = params.get('edition');
  const bookTitle = params.get('title') || 'Edition';
  const backTo    = params.get('back')  || '/ebooks';

  // Backend proxy URL — serves PDF directly by edition ID. `v` (the PDF's last change,
  // from the edition list) makes a replaced PDF a new URL, so no stale cached copy is used.
  const pdfVersion = params.get('v');
  const proxyUrl = editionId
    ? `${BACKEND}/api/proxy/pdf/${editionId}${pdfVersion ? `?v=${encodeURIComponent(pdfVersion)}` : ''}`
    : null;

  /* state */
  const [page, setPage] = useState(parseInt(params.get('page') || '1', 10));

  const [pdfTotal,    setPdfTotal]    = useState(0);
  const [pdfReady,    setPdfReady]    = useState(false);
  const [pdfErr,      setPdfErr]      = useState(null);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [retryKey, setRetryKey] = useState(Date.now());

  const [zoom,        setZoom]        = useState(1.0);
  const [nativeFS,    setNativeFS]    = useState(() => !!fullscreenElement());
  const [immersive,   setImmersive]   = useState(false); // in-page fullscreen (no Fullscreen API)
  const [pdfDoc,      setPdfDoc]      = useState(null);
  
  const bookRef = useRef(null);
  const total = pdfTotal;

  // Memoize options so <Document> doesn't re-render and abort on every state change
  // Range-only loading: fetch just the byte ranges of the pages being shown (HTTP 206),
  // instead of streaming the whole file (up to 660 MB) in the background.
  // 512 KB chunks keep the number of range requests low.
  // Fallback (after a load error): plain whole-file streaming, for the case where
  // byte-range responses are what failed — retrying the same options would not help.
  const documentOptions = useMemo(() => (fallbackMode
    ? { ...PDF_OPTIONS, disableRange: true }
    : { ...PDF_OPTIONS, disableStream: true, disableAutoFetch: true, rangeChunkSize: 512 * 1024 }
  ), [fallbackMode]);

  // Page shape (width / height) taken from the PDF's first page; 794x1024 until known
  const [pageRatio, setPageRatio] = useState(794 / 1024);

  const onDocumentLoadSuccess = useCallback((pdf) => {
    console.log('[FlipbookReader] Document load success. Pages:', pdf.numPages);
    pdf.getPage(1)
      .then(p => { const v = p.getViewport({ scale: 1 }); if (v.width > 0 && v.height > 0) setPageRatio(v.width / v.height); })
      .catch(() => {})
      .finally(() => { setPdfDoc(pdf); setPdfTotal(pdf.numPages); setPdfReady(true); });
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    console.error('[FlipbookReader] PDF Error:', err); 
    
    // Intelligent retry logic
    if (!fallbackMode) {
      console.log('[FlipbookReader] Attempting fallback load strategy...');
      setFallbackMode(true);
      setRetryKey(Date.now());
      return;
    }

    // If fallback also fails, log robust diagnostics
    const diagId = `ERR-PDF-${editionId || 'NA'}-${Date.now()}`;
    let message = err.message || 'Unknown error';
    let reason = 'Parser Failure';
    if (message.includes('Invalid string length') || message.includes('RangeError')) {
       reason = 'Structural Limitation (Missing EOF)';
    } else if (message.includes('fetch') || message.includes('network')) {
       reason = 'Network or Proxy Failure';
    } else if (err.name === 'AbortException' || err.name === 'AbortError') {
       reason = 'Load Cancelled';
    }

    setPdfErr({ id: diagId, message, reason, stack: err.stack }); 
  }, [fallbackMode, editionId]);

  const onDocumentLoadProgress = useCallback(({ loaded, total }) => {
    if (total > 0) setPdfProgress(loaded / total);
  }, []);

  useEffect(() => {
    console.log('[FlipbookReader] Mounted. Target edition:', editionId);
    return () => console.log('[FlipbookReader] Unmounted. Cleaning up edition:', editionId);
  }, [editionId]);

  // Count this read once per browser tab (reloading the reader does not count again),
  // and refresh the book page's counts when the reader is left
  const { id: bookId } = useParams();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!editionId) return undefined;
    const key = `suvadi-viewed-${editionId}`;
    let seen = false;
    try { seen = sessionStorage.getItem(key) === '1'; } catch { /* storage unavailable */ }
    if (!seen) {
      fetch(`${BACKEND}/api/ebooks/editions/${encodeURIComponent(editionId)}/view`, { method: 'POST', keepalive: true })
        .then(r => { if (r.ok) { try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ } } })
        .catch(() => {});
    }
    return () => { if (bookId) queryClient.invalidateQueries({ queryKey: ['ebook-editions', bookId] }); };
  }, [editionId, bookId, queryClient]);

  /* Download handler */
  const handleDownload = useCallback(() => {
    if (proxyUrl) downloadPdf(proxyUrl, decodeURIComponent(bookTitle));
  }, [proxyUrl, bookTitle]);

  /* Responsive sizing — fits one (portrait) or two pages of the PDF's own aspect ratio.
     The reader is a full-height column: header · stage · controls (see the styles
     below). The book is sized from the stage's measured size, so it always fits
     between the header and the controls — on any screen, and after rotation,
     entering/leaving fullscreen, or the mobile address bar appearing, all of which
     resize the stage. Debounced: every size change rebuilds the flipbook (fbKey). */
  const stageRef = useRef(null);
  const [stage, setStage] = useState(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    let t;
    const measure = () => setStage(s => (s && s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    // The first observation reports the initial size; later ones are debounced
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) { first = false; measure(); return; }
      clearTimeout(t); t = setTimeout(measure, 150);
    });
    ro.observe(el);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, []);
  const { sz, portrait } = useMemo(() => {
    if (!stage) return { portrait: false, sz: null };
    const availW = stage.w - STAGE_PAD * 2;
    const availH = stage.h - STAGE_PAD * 2 - SHADOW_SPACE;
    const narrow = stage.w < 680;
    const ratio = pageRatio;
    // Single page on narrow screens; two pages otherwise, each at most 44% of the width
    const maxPageW = narrow ? availW : Math.min(Math.floor(stage.w * 0.44), Math.floor(availW / 2));
    const w = Math.max(Math.min(maxPageW, Math.floor(availH * ratio)), 100);
    const h = Math.max(Math.floor(w / ratio), 130);
    return { portrait: narrow, sz: { w, h } };
  }, [stage, pageRatio]);

  /* Navigation */
  const flipNext = useCallback(() => bookRef.current?.pageFlip()?.flipNext(), []);
  const flipPrev = useCallback(() => bookRef.current?.pageFlip()?.flipPrev(), []);
  const onFlip   = useCallback(e => { setPage(e.data + 1); playFlipSound(); }, []);

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowRight') flipNext();
      if (e.key === 'ArrowLeft')  flipPrev();
      // Native fullscreen exits on Esc by itself; the in-page fallback view does the same
      if (e.key === 'Escape') setImmersive(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [flipNext, flipPrev]);

  /* Fullscreen — state follows the browser, so leaving with Esc or the mobile
     browser's own controls updates the button. The layout re-fits by itself: the
     fullscreen change resizes the stage (see the sizing above). */
  useEffect(() => {
    const h = () => setNativeFS(!!fullscreenElement());
    document.addEventListener('fullscreenchange', h);
    document.addEventListener('webkitfullscreenchange', h);
    return () => {
      document.removeEventListener('fullscreenchange', h);
      document.removeEventListener('webkitfullscreenchange', h);
    };
  }, []);
  const isFS = nativeFS || immersive;
  const toggleFS = useCallback(() => {
    if (immersive) { setImmersive(false); return; }
    if (!HAS_NATIVE_FULLSCREEN) { setImmersive(true); return; }
    const el = document.documentElement;
    try {
      if (fullscreenElement()) {
        Promise.resolve((document.exitFullscreen || document.webkitExitFullscreen).call(document)).catch(() => {});
      } else {
        // Refused (e.g. inside an iframe without permission): use the in-page view instead
        Promise.resolve((el.requestFullscreen || el.webkitRequestFullscreen).call(el)).catch(() => setImmersive(true));
      }
    } catch { setImmersive(true); }
  }, [immersive]);

  /* Zoom (the single existing zoom value) and panning (scrolling the stage).
     Zooming keeps the point at the centre of the stage in place; Reset View returns
     to the fitted size, centred, without changing the page. */
  const zoomAnchor = useRef(null);
  const changeZoom = useCallback((next) => {
    const el = stageRef.current;
    if (el) {
      zoomAnchor.current = {
        x: (el.scrollLeft + el.clientWidth / 2) / Math.max(el.scrollWidth, 1),
        y: (el.scrollTop + el.clientHeight / 2) / Math.max(el.scrollHeight, 1),
      };
    }
    setZoom(next);
  }, []);
  const zoomIn  = () => changeZoom(Math.min(+(zoom + ZOOM_STEP).toFixed(1), ZOOM_MAX));
  const zoomOut = () => changeZoom(Math.max(+(zoom - ZOOM_STEP).toFixed(1), ZOOM_MIN));
  const resetView = useCallback(() => {
    zoomAnchor.current = null;
    setZoom(1);
    requestAnimationFrame(() => { stageRef.current?.scrollTo({ left: 0, top: 0 }); window.scrollTo(0, 0); });
  }, []);
  useLayoutEffect(() => {
    const a = zoomAnchor.current;
    const el = stageRef.current;
    if (!a || !el) return;
    zoomAnchor.current = null;
    el.scrollLeft = a.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = a.y * el.scrollHeight - el.clientHeight / 2;
  }, [zoom]);

  const scaledW    = sz ? Math.round(sz.w * zoom) : 0;
  const scaledH    = sz ? Math.round(sz.h * zoom) : 0;
  const bookTotalW = portrait ? scaledW : scaledW * 2;
  // react-pageflip reads width/height only when it is created, so a new size
  // needs a new instance — otherwise zoomed pages are clipped to the old size.
  const fbKey = `${scaledW}x${scaledH}-${portrait ? 'p' : 'l'}`;

  /* Visible pages first: neighbours (pre-rendered for flipping) start only after the
     pages on screen have been drawn, so they do not compete with them for the
     byte-range downloads and the PDF worker. Tracked per flipbook instance (fbKey). */
  const drawKey = `${fbKey}#${retryKey}`;
  const [drawn, setDrawn] = useState({ key: '', pages: new Set() });
  const onPageRendered = useCallback((n) => {
    setDrawn(d => {
      if (d.key === drawKey && d.pages.has(n)) return d;
      const pages = new Set(d.key === drawKey ? d.pages : []);
      pages.add(n);
      return { key: drawKey, pages };
    });
  }, [drawKey]);
  // Landscape shows spreads 1-2, 3-4, …; `page` can be either side of a spread
  const visiblePages = portrait ? [page] : (page % 2 ? [page, page + 1] : [page - 1, page]);
  const onScreen = visiblePages.filter(n => n >= 1 && n <= total);
  // Non-empty check: before the PDF has loaded there are no pages, and [].every() is true
  const spreadDrawn = onScreen.length > 0 && onScreen.every(n => drawn.key === drawKey && drawn.pages.has(n));

  /* A page that fails to load (e.g. a byte range refused by the server) cannot be
     retried inside the same document: PDF.js keeps the failed ranges marked as
     pending and never requests them again. So the document is reloaded — first with
     the same range loading, then once more as a whole-file stream. */
  /* The book is revealed only once the pages on screen have been drawn: until then the
     loading overlay stays on the maroon stage, instead of showing blank white pages
     while the first page downloads and decodes. Latched, so a later zoom or resize
     rebuild does not bring the overlay back. */
  const [firstSpreadShown, setFirstSpreadShown] = useState(false);
  if (spreadDrawn && !firstSpreadShown) setFirstSpreadShown(true);
  const ready = (pdfReady && firstSpreadShown) || pdfErr !== null;

  const reloads = useRef(0);
  const onPageFailed = useCallback(() => {
    if (reloads.current >= 2) {
      // Still nothing on screen after both reloads: show the existing error panel
      // (with Download) rather than leaving the loading overlay up indefinitely.
      if (!firstSpreadShown) {
        setPdfErr({ id: `ERR-PDF-${editionId || 'NA'}-${Date.now()}`, message: 'The first pages could not be loaded.', reason: 'Network or Proxy Failure' });
      }
      return;
    }
    reloads.current += 1;
    if (reloads.current === 2) setFallbackMode(true);
    setPdfDoc(null);
    setRetryKey(Date.now());
  }, [firstSpreadShown, editionId]);
  const isActive = n => visiblePages.includes(n) || (spreadDrawn && Math.abs(n - page) <= RENDER_WIN);

  /* No source guard */
  if (!proxyUrl) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a0303', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <AlertCircle color="#C9973B" size={40} />
        <p style={{ color: '#fff', fontFamily: 'Cinzel,serif', fontSize: 13 }}>No edition source specified.</p>
        <button onClick={() => navigate(backTo)} style={sBtn}>Back</button>
      </div>
    );
  }

  /* Shared flipbook props */
  const fbProps = {
    startPage: Math.max(page - 1, 0),
    ref: bookRef, width: scaledW, height: scaledH, size: 'fixed',
    minWidth: 150, maxWidth: 900, minHeight: 200, maxHeight: 1400,
    maxShadowOpacity: 0.2,
    showCover: false,
    usePortrait: portrait,
    mobileScrollSupport: true,
    onFlip, flippingTime: 600,
    className: 'suvadi-flipbook',
    style: { position: 'relative', zIndex: 1 },
  };

  return (
    <div className="suvadi-reader" style={{ background: 'linear-gradient(155deg,#140202 0%,#3a0606 45%,#551608 75%,#140202 100%)' }}>

      {/* TOP BAR — hidden in the in-page fullscreen view (phones without the Fullscreen API) */}
      {!immersive && (
      <header className="suvadi-reader-header" style={{
        position: 'relative', zIndex: 500,
        background: 'rgba(14,1,1,0.97)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,151,59,0.12)',
        display: 'flex', alignItems: 'center', gap: 14, boxSizing: 'border-box',
      }}>
        <button onClick={() => navigate(backTo)} style={hBtn}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ flex: 1, textAlign: 'center', overflow: 'hidden', minWidth: 0 }}>
          {/* No room beside the controls on phones: it wrapped to "READIN / EDITIO" */}
          {!portrait && (
            <div style={{ color: 'rgba(201,151,59,0.45)', fontSize: 7, fontFamily: 'Cinzel,serif', letterSpacing: '0.45em', textTransform: 'uppercase' }}>
              READING EDITION
            </div>
          )}
          <div style={{ color: '#fff', fontSize: 13, fontFamily: '"Noto Sans Tamil",sans-serif', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {decodeURIComponent(bookTitle)}
          </div>
        </div>

        {/* Balances the Back button so the title stays centred (controls are in the toolbar) */}
        <div className="suvadi-header-spacer" aria-hidden="true" />
      </header>
      )}

      {/* STAGE — the space between header and controls; scrolls (pans) when zoomed */}
      <main ref={stageRef} className="suvadi-reader-stage">
        {/* Ambient glow */}
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 320, background: 'radial-gradient(ellipse,rgba(201,151,59,0.05) 0%,transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        {/* Loading overlay */}
        <AnimatePresence>
          {!ready && (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              // pointerEvents none: purely visual, so it never blocks the header or the
              // controls (it covers the whole screen, and stays during its fade-out)
              style={{ position: 'fixed', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 100 }}
            >
              <div style={{ width: 46, height: 46, border: '2px solid rgba(201,151,59,0.15)', borderTopColor: '#C9973B', borderRadius: '50%', animation: 'fbspin 0.9s linear infinite' }} />
              <p style={{ color: 'rgba(201,151,59,0.85)', fontSize: 10, fontFamily: 'Cinzel,serif', letterSpacing: '0.4em', textTransform: 'uppercase', margin: 0 }}>
                LOADING BOOK EDITION...
              </p>
              <div style={{ width: 220, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ width: `${Math.round(pdfProgress * 100)}%`, height: '100%', background: '#C9973B', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9, fontFamily: 'Cinzel,serif', margin: 0 }}>
                Streaming from local storage...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FLIPBOOK — centred in the stage by auto margins. When zoomed larger than the
            stage the margins collapse, so the book starts at the top-left and every
            edge can be panned to (centring would push the left edge out of reach). */}
        <div className="suvadi-book" style={{
          position: 'relative', opacity: ready ? 1 : 0, transition: 'opacity 0.5s ease',
          zIndex: 1, width: bookTotalW, paddingBottom: SHADOW_SPACE,
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: '4%', width: '92%', height: 28, background: 'rgba(0,0,0,0.6)', filter: 'blur(22px)', borderRadius: '50%' }} />
          <div style={{
            boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,151,59,0.12)',
            position: 'relative', width: bookTotalW, height: scaledH, overflow: 'hidden',
          }}>
            <Document
              key={retryKey}
              file={proxyUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              onLoadProgress={onDocumentLoadProgress}
              loading={null}
              options={documentOptions}
            >
              {pdfErr ? (
                <div style={{ width: bookTotalW, height: scaledH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#140202', border: '1px solid rgba(201,151,59,0.3)', padding: 24, textAlign: 'center', boxSizing: 'border-box' }}>
                  <AlertCircle color="#C9973B" size={48} />
                  <p style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: '#C9973B', margin: 0, fontWeight: 'bold', letterSpacing: '0.1em' }}>
                    PREVIEW UNAVAILABLE
                  </p>
                  <p style={{ fontFamily: '"Noto Sans Tamil",sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '8px 0', maxWidth: 400 }}>
                    This manuscript cannot be previewed in the browser due to an archival structural limitation. Please download the file to view it in a native PDF reader.
                  </p>
                  
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', width: '100%', maxWidth: 500 }}>
                    <p style={{ margin: 0, fontSize: 10, color: '#888', fontFamily: 'monospace' }}>Diagnostic ID: {pdfErr.id}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: '#888', fontFamily: 'monospace' }}>Reason: {pdfErr.reason}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: '#888', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Exception: {pdfErr.message}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button onClick={handleDownload} style={{ ...hBtn, background: '#C9973B', color: '#140202' }}>
                      <Download size={14} /> Download PDF
                    </button>
                    <button onClick={() => navigate(backTo)} style={hBtn}>
                      Back
                    </button>
                  </div>
                </div>
              ) : pdfTotal > 0 && sz ? (
                <HTMLFlipBook key={fbKey} {...fbProps}>
                  {Array.from({ length: pdfTotal + (pdfTotal % 2) }, (_, i) => i + 1).map(n =>
                    n <= pdfTotal ? (
                      <PDFPage key={n} pageNum={n} active={isActive(n)} pdf={pdfDoc} pageWidth={scaledW} pageHeight={scaledH} onRendered={onPageRendered} onFailed={onPageFailed} />
                    ) : (
                      <div key={n} className="suvadi-page" />
                    )
                  )}
                </HTMLFlipBook>
              ) : null}
            </Document>
          </div>
        </div>
      </main>

      {/* CONTROLS — below the book (never over it), and always in view at any zoom
          because only the stage above scrolls */}
      <div className="suvadi-reader-controls">
        {/* NAVIGATION + page numbers. Kept in the layout (hidden) until the book appears,
            so the stage — and the book's size — does not change when they show up. */}
        <div className="suvadi-nav-row" style={{ visibility: ready && total > 0 ? 'visible' : 'hidden' }}>
          <button onClick={flipPrev} disabled={page <= 1} aria-label="Previous page" title="Previous page"
            className="suvadi-nav-btn"
            style={{ ...nBtn, opacity: page <= 1 ? 0.3 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={18} />
            <span className="suvadi-nav-label" style={{ fontSize: 9, fontFamily: 'Cinzel,serif', letterSpacing: '0.2em' }}>PREV</span>
          </button>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', whiteSpace: 'nowrap' }} aria-label={`Page ${page} of ${total}`}>
            <span style={{ color: '#C9973B', fontFamily: 'Cinzel,serif', fontSize: 14, fontWeight: 700 }}>{page}</span>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10 }}>of</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Cinzel,serif', fontSize: 14 }}>{total}</span>
          </div>
          <button onClick={flipNext} disabled={page >= total} aria-label="Next page" title="Next page"
            className="suvadi-nav-btn"
            style={{ ...nBtn, opacity: page >= total ? 0.3 : 1, cursor: page >= total ? 'not-allowed' : 'pointer' }}>
            <span className="suvadi-nav-label" style={{ fontSize: 9, fontFamily: 'Cinzel,serif', letterSpacing: '0.2em' }}>NEXT</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* VIEW TOOLBAR — directly below the page numbers */}
        <div className="suvadi-toolbar" role="toolbar" aria-label="Reader view controls">
          <button className="suvadi-tool" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out" title="Zoom out">
            <ZoomOut size={20} />
          </button>
          <span className="suvadi-zoom-level" aria-live="polite" aria-label={`Zoom ${Math.round(zoom * 100)} percent`}>
            {Math.round(zoom * 100)}%
          </span>
          <button className="suvadi-tool" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" title="Zoom in">
            <ZoomIn size={20} />
          </button>
          <button className="suvadi-tool" onClick={resetView} aria-label="Reset view" title="Reset view (fit and centre the book)">
            <RotateCcw size={20} />
          </button>
          <button className="suvadi-tool" onClick={toggleFS} aria-pressed={isFS}
            aria-label={isFS ? 'Exit fullscreen' : 'Enter fullscreen'} title={isFS ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFS ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>

        <p className="suvadi-hint" style={{ color: 'rgba(255,255,255,0.12)', fontSize: 8, fontFamily: 'Cinzel,serif', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
          — Arrow keys or click page edges to flip —
        </p>
      </div>

      <style>{`
        @keyframes fbspin { to { transform: rotate(360deg); } }

        /* Reader layout: exactly the visible viewport (dvh follows mobile address bars
           and fullscreen), split into header · stage · controls. Only the stage scrolls. */
        .suvadi-reader { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
        .suvadi-reader-header { flex: none; height: 56px; padding: 0 20px; }
        .suvadi-header-spacer { width: 86px; flex-shrink: 0; }
        .suvadi-reader-stage {
          flex: 1 1 auto; min-height: 0; display: flex; overflow: auto; position: relative;
          padding: ${STAGE_PAD}px; box-sizing: border-box; overscroll-behavior: contain;
        }
        .suvadi-book { flex: none; margin: auto; }
        .suvadi-reader-controls {
          flex: none; display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 6px 12px calc(10px + env(safe-area-inset-bottom, 0px)); position: relative; z-index: 2;
        }
        .suvadi-nav-row { display: flex; align-items: center; justify-content: center; gap: 18px; }
        .suvadi-nav-btn { min-height: 44px; }
        .suvadi-toolbar { display: flex; align-items: center; justify-content: center; gap: 10px; }
        .suvadi-tool {
          width: 44px; height: 44px; padding: 0; display: inline-flex; align-items: center; justify-content: center;
          border-radius: 6px; background: rgba(201,151,59,0.16); border: 1px solid rgba(201,151,59,0.5);
          color: #E0B45C; cursor: pointer; transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .suvadi-tool:hover:not(:disabled) { background: rgba(201,151,59,0.3); border-color: #C9973B; color: #F2D28A; }
        .suvadi-tool:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(242,210,138,0.7); }
        .suvadi-tool:disabled { opacity: 0.35; cursor: not-allowed; }
        .suvadi-tool[aria-pressed="true"] { background: rgba(201,151,59,0.32); border-color: #C9973B; }
        .suvadi-zoom-level { min-width: 52px; text-align: center; color: #E0B45C; font-family: Cinzel, serif; font-size: 13px; font-weight: 700; }
        /* Phones: the keyboard hint does not apply to touch, and space is short */
        @media (max-width: 679px) { .suvadi-hint { display: none; } }
        @media (max-width: 400px) {
          .suvadi-reader-header { padding: 0 12px; }
          .suvadi-header-spacer, .suvadi-nav-label { display: none; }
          .suvadi-nav-row { gap: 12px; }
          .suvadi-toolbar { gap: 8px; }
        }
        /* Short screens (phones held sideways): slimmer header, controls in one row */
        @media (max-height: 560px) {
          .suvadi-reader-header { height: 44px; }
          .suvadi-reader-controls { flex-direction: row; justify-content: center; gap: 20px; padding-top: 4px; padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px)); }
          .suvadi-nav-label, .suvadi-hint { display: none; }
        }
        .suvadi-flipbook { display: block !important; }
        .suvadi-flipbook .stf__parent { background: transparent !important; margin: 0 !important; padding: 0 !important; }
        .suvadi-flipbook .stf__wrapper { margin: 0 !important; padding: 0 !important; }
        .suvadi-flipbook .stf__item    { margin: 0 !important; padding: 0 !important; border: none !important; outline: none !important; }
        /* Page elements: page-flip owns their inline style, so paper colour and clipping come from the class */
        .suvadi-flipbook .suvadi-page  { background: #fff; overflow: hidden; }
        .react-pdf__Page          { margin: 0 !important; }
        .react-pdf__Page canvas   { display: block !important; margin: 0 !important; }
        .react-pdf__Page__canvas  { margin: 0 !important; }
        /* page-flip's stylesheet makes every canvas in the book position:absolute
           (meant for its own canvas mode). Kept in flow, the page box takes the
           canvas size and the slot can centre it. */
        .suvadi-flipbook .react-pdf__Page canvas { position: static !important; }
        /* Pages narrower than their slot sit against the spine */
        .suvadi-flipbook .suvadi-page.--left  > div { justify-content: flex-end !important; }
        .suvadi-flipbook .suvadi-page.--right > div { justify-content: flex-start !important; }
      `}</style>
    </div>
  );
}

/* Shared inline styles */
const hBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'rgba(201,151,59,0.08)', border: '1px solid rgba(201,151,59,0.18)',
  color: '#C9973B', padding: '7px 14px', cursor: 'pointer',
  fontSize: 10, fontFamily: 'Cinzel,serif', fontWeight: 700,
  letterSpacing: '0.2em', textTransform: 'uppercase', flexShrink: 0,
};
const nBtn = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: 'rgba(201,151,59,0.1)', border: '1px solid rgba(201,151,59,0.22)',
  color: '#C9973B', padding: '10px 20px', cursor: 'pointer', borderRadius: 2,
  transition: 'all 0.2s',
};
const sBtn = {
  background: 'transparent', border: '1px solid rgba(201,151,59,0.3)',
  color: '#C9973B', padding: '9px 20px', cursor: 'pointer',
  fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '0.2em',
};
