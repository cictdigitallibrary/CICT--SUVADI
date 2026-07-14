import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, AlertCircle, Maximize, Minimize, Download
} from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Resolve backend base from env — no hardcoded localhost
const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const RENDER_WIN = 6; // render pages within ±N of current page

/* ─────────────────────────────────────────────────────────────────────────────
   Page flip sound
───────────────────────────────────────────────────────────────────────────── */
const flipAudio = new Audio('/flipsound.mp3');
flipAudio.volume = 0.5;
const playFlipSound = () => {
  try { flipAudio.currentTime = 0; flipAudio.play().catch(() => {}); } catch (_) {}
};

/* ─────────────────────────────────────────────────────────────────────────────
   PDFPage — lazy, only renders when within RENDER_WIN of current page
───────────────────────────────────────────────────────────────────────────── */
const PDFPage = React.forwardRef(({ pageNum, currentPage, pageHeight }, ref) => {
  const inView = Math.abs(pageNum - currentPage) <= RENDER_WIN;
  return (
    <div ref={ref} style={{ width: '100%', height: '100%', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      {inView ? (
        <Page pageNumber={pageNum} height={pageHeight} renderTextLayer={false} renderAnnotationLayer={false} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#f7f4ef,#ede8e0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#c9973b40', fontFamily: 'Cinzel,serif', fontSize: 11 }}>{pageNum}</span>
        </div>
      )}
    </div>
  );
});
PDFPage.displayName = 'PDFPage';

const PDF_OPTIONS = {
  cMapUrl: 'https://unpkg.com/pdfjs-dist/cmaps/',
  cMapPacked: true,
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

  // Backend proxy URL — serves PDF directly by edition ID
  const proxyUrl = editionId
    ? `${BACKEND}/api/proxy/pdf/${editionId}`
    : null;

  /* state */
  const [page,        setPage]        = useState(1);
  const [pdfTotal,    setPdfTotal]    = useState(0);
  const [pdfReady,    setPdfReady]    = useState(false);
  const [pdfErr,      setPdfErr]      = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isFS,        setIsFS]        = useState(false);
  const [zoom,        setZoom]        = useState(1.0);
  const [portrait,    setPortrait]    = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlError,     setDlError]     = useState(false);

  const bookRef = useRef(null);
  const ready   = pdfReady || pdfErr;
  const total   = pdfTotal;

  /* Download handler */
  const handleDownload = useCallback(async () => {
    if (!proxyUrl) return;
    setDlError(false);
    setDownloading(true);
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${decodeURIComponent(bookTitle)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      window.open(proxyUrl, '_blank', 'noopener');
    } finally {
      setDownloading(false);
    }
  }, [proxyUrl, bookTitle]);

  /* Responsive sizing — page aspect ratio 794x1024 */
  const [sz, setSz] = useState({ w: 450, h: 580 });
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight - 130;
      const narrow = vw < 680;
      setPortrait(narrow);
      const ratio = 794 / 1024;
      if (narrow) {
        const maxW = vw - 24;
        const maxH = Math.floor(vh * 0.88);
        let w = Math.min(maxW, Math.floor(maxH * ratio));
        let h = Math.round(w / ratio);
        setSz({ w: Math.max(w, 180), h: Math.max(h, 240) });
      } else {
        const maxPageW = Math.floor(vw * 0.44);
        const maxH = Math.floor(vh * 0.92);
        let w = Math.min(maxPageW, Math.floor(maxH * ratio));
        let h = Math.round(w / ratio);
        setSz({ w: Math.max(w, 220), h: Math.max(h, 280) });
      }
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  /* Navigation */
  const flipNext = useCallback(() => bookRef.current?.pageFlip()?.flipNext(), []);
  const flipPrev = useCallback(() => bookRef.current?.pageFlip()?.flipPrev(), []);
  const onFlip   = useCallback(e => { setPage(e.data + 1); playFlipSound(); }, []);

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowRight') flipNext();
      if (e.key === 'ArrowLeft')  flipPrev();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [flipNext, flipPrev]);

  /* Fullscreen */
  const toggleFS = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFS(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFS(false);
    }
  };

  const scaledW    = Math.round(sz.w * zoom);
  const scaledH    = Math.round(sz.h * zoom);
  const bookTotalW = portrait ? scaledW : scaledW * 2;

  /* No source guard */
  if (!proxyUrl) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a0303', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <AlertCircle color="#C9973B" size={40} />
        <p style={{ color: '#fff', fontFamily: 'Cinzel,serif', fontSize: 13 }}>No edition source specified.</p>
        <button onClick={() => navigate(backTo)} style={sBtn}>Back to Library</button>
      </div>
    );
  }

  /* Shared flipbook props */
  const fbProps = {
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(155deg,#140202 0%,#3a0606 45%,#551608 75%,#140202 100%)' }}>

      {/* TOP BAR */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
        height: 56, background: 'rgba(14,1,1,0.97)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,151,59,0.12)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, boxSizing: 'border-box',
      }}>
        <button onClick={() => navigate(backTo)} style={hBtn}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ flex: 1, textAlign: 'center', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ color: 'rgba(201,151,59,0.45)', fontSize: 7, fontFamily: 'Cinzel,serif', letterSpacing: '0.45em', textTransform: 'uppercase' }}>
            READING EDITION
          </div>
          <div style={{ color: '#fff', fontSize: 13, fontFamily: '"Baloo Thambi 2",sans-serif', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {decodeURIComponent(bookTitle)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, fontFamily: 'Cinzel,serif', whiteSpace: 'nowrap', marginRight: 4 }}>
            {page} / {total || '...'}
          </span>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} style={iBtn}><ZoomOut  size={13}/></button>
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 1.8))} style={iBtn}><ZoomIn   size={13}/></button>
          <button onClick={toggleFS} style={iBtn}>{isFS ? <Minimize size={13}/> : <Maximize size={13}/>}</button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <button
              onClick={handleDownload}
              disabled={downloading}
              title={`Download ${decodeURIComponent(bookTitle)}.pdf`}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: downloading ? 'rgba(201,151,59,0.12)' : '#5C1A08',
                border: '1px solid rgba(201,151,59,0.45)',
                color: '#C9973B', padding: '6px 12px', cursor: downloading ? 'wait' : 'pointer',
                fontSize: 9, fontFamily: 'Cinzel,serif', fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase', borderRadius: 2,
                opacity: downloading ? 0.7 : 1, transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              {downloading
                ? <><span style={{ display: 'inline-block', width: 11, height: 11, border: '1.5px solid rgba(201,151,59,0.3)', borderTopColor: '#C9973B', borderRadius: '50%', animation: 'fbspin 0.8s linear infinite', marginRight: 2 }} />Downloading</>
                : <><Download size={12} /><span className="hidden sm:inline">Download PDF</span></>}
            </button>
            {dlError && (
              <span style={{ color: 'rgba(201,151,59,0.7)', fontSize: 7.5, fontFamily: 'Cinzel,serif', letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                PDF not available
              </span>
            )}
          </div>
        </div>
      </header>

      {/* STAGE */}
      <main style={{
        paddingTop: 56, minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20, padding: '74px 12px 24px', boxSizing: 'border-box', position: 'relative',
      }}>
        {/* Ambient glow */}
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 320, background: 'radial-gradient(ellipse,rgba(201,151,59,0.05) 0%,transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        {/* Loading overlay */}
        <AnimatePresence>
          {!ready && (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, top: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 100 }}
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

        {/* FLIPBOOK */}
        <div style={{
          position: 'relative', opacity: ready ? 1 : 0, transition: 'opacity 0.5s ease',
          zIndex: 1, width: bookTotalW, margin: '0 auto',
        }}>
          <div style={{ position: 'absolute', bottom: -22, left: '4%', width: '92%', height: 28, background: 'rgba(0,0,0,0.6)', filter: 'blur(22px)', borderRadius: '50%' }} />
          <div style={{
            boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,151,59,0.12)',
            position: 'relative', width: bookTotalW, height: scaledH, overflow: 'hidden',
          }}>
            <Document
              file={proxyUrl}
              onLoadSuccess={({ numPages }) => { setPdfTotal(numPages); setPdfReady(true); }}
              onLoadError={err => { console.error('PDF Error:', err); setPdfErr(true); }}
              onLoadProgress={({ loaded, total }) => { if (total > 0) setPdfProgress(loaded / total); }}
              loading={null}
              options={PDF_OPTIONS}
            >
              {pdfErr ? (
                <div style={{ width: bookTotalW, height: scaledH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#fff' }}>
                  <AlertCircle color="#8B1C1C" size={32} />
                  <p style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: '#555', margin: 0 }}>Could not load PDF.</p>
                  <p style={{ fontFamily: 'Cinzel,serif', fontSize: 10, color: '#888', margin: 0 }}>
                    Ensure the backend is running and the PDF is downloaded locally.
                  </p>
                  <button onClick={() => navigate(backTo)} style={{ ...sBtn, marginTop: 8 }}>Back to Library</button>
                </div>
              ) : pdfTotal > 0 ? (
                <HTMLFlipBook {...fbProps}>
                  {Array.from({ length: pdfTotal + (pdfTotal % 2) }, (_, i) => i + 1).map(n =>
                    n <= pdfTotal ? (
                      <PDFPage key={n} pageNum={n} currentPage={page} pageHeight={scaledH} />
                    ) : (
                      <div key={n} style={{ background: '#fff' }} />
                    )
                  )}
                </HTMLFlipBook>
              ) : null}
            </Document>
          </div>
        </div>

        {/* NAVIGATION */}
        {ready && total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, zIndex: 1 }}>
            <button onClick={flipPrev} disabled={page <= 1}
              style={{ ...nBtn, opacity: page <= 1 ? 0.3 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
              <ChevronLeft size={18} />
              <span style={{ fontSize: 9, fontFamily: 'Cinzel,serif', letterSpacing: '0.2em' }}>PREV</span>
            </button>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ color: '#C9973B', fontFamily: 'Cinzel,serif', fontSize: 14, fontWeight: 700 }}>{page}</span>
              <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10 }}>of</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Cinzel,serif', fontSize: 14 }}>{total}</span>
            </div>
            <button onClick={flipNext} disabled={page >= total}
              style={{ ...nBtn, opacity: page >= total ? 0.3 : 1, cursor: page >= total ? 'not-allowed' : 'pointer' }}>
              <span style={{ fontSize: 9, fontFamily: 'Cinzel,serif', letterSpacing: '0.2em' }}>NEXT</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 8, fontFamily: 'Cinzel,serif', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0, zIndex: 1 }}>
          — Arrow keys or click page edges to flip —
        </p>
      </main>

      <style>{`
        @keyframes fbspin { to { transform: rotate(360deg); } }
        .suvadi-flipbook { display: block !important; }
        .suvadi-flipbook .stf__parent { background: transparent !important; margin: 0 !important; padding: 0 !important; }
        .suvadi-flipbook .stf__wrapper { margin: 0 !important; padding: 0 !important; }
        .suvadi-flipbook .stf__item    { margin: 0 !important; padding: 0 !important; border: none !important; outline: none !important; }
        .react-pdf__Page          { margin: 0 !important; }
        .react-pdf__Page canvas   { display: block !important; margin: 0 !important; }
        .react-pdf__Page__canvas  { margin: 0 !important; }
        .suvadi-flipbook [class*="--left"] .react-pdf__Page canvas,
        .suvadi-flipbook [class*="--left"] .react-pdf__Page__canvas {
          left: auto !important; right: 0 !important;
        }
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
const iBtn = {
  background: 'rgba(201,151,59,0.07)', border: '1px solid rgba(201,151,59,0.12)',
  color: '#C9973B', padding: '6px 9px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2,
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
