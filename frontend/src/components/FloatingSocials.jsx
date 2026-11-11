import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { MapPin, Share2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SOCIAL_LINKS } from './socialLinks';
import VisitorLocationPanel from './VisitorLocationPanel';

// The column stays open only where it clears the page content: SUVADI's pages come to
// within 24 px of the screen edge below ~1366 px, so on phones, tablets and smaller
// laptops — and on screens too short for it (phones held sideways) — it is folded
// behind a Share button instead.
const COMPACT_QUERY = '(max-width: 1365px), (max-height: 600px)';
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
};

/* Popup with the visitor-location panel, shown over the current page */
function VisitorLocationModal({ onClose }) {
  const { t } = useLanguage();
  const closeRef = useRef(null);

  useEffect(() => {
    // Lock background scrolling while open; restore the previous value on close
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="vl-overlay" onClick={onClose}>
      <div className="vl-modal" role="dialog" aria-modal="true" aria-label={t('பார்வையாளர் இருப்பிடங்கள்', 'Visitor Locations')}
        onClick={e => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="vl-close" onClick={onClose} aria-label={t('மூடு', 'Close')} title={t('மூடு', 'Close')}>
          <X size={18} />
        </button>
        <VisitorLocationPanel />
      </div>
    </div>,
    document.body
  );
}

/* Floating social-media sidebar (left edge) with the Visitor Location button */
const FloatingSocials = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const compact = useMediaQuery(COMPACT_QUERY);
  const [expanded, setExpanded] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const pinRef = useRef(null);
  const wasOpen = useRef(false);

  // Close the popup (and the folded menu) when the route changes — during render,
  // so the new page never shows them open for a frame
  const [routePath, setRoutePath] = useState(location.pathname);
  if (routePath !== location.pathname) {
    setRoutePath(location.pathname);
    setPopupOpen(false);
    setExpanded(false);
  }

  // Give keyboard focus back to the pin when the popup closes
  useEffect(() => {
    if (wasOpen.current && !popupOpen) pinRef.current?.focus({ preventScroll: true });
    wasOpen.current = popupOpen;
  }, [popupOpen]);

  const shown = !compact || expanded;
  const label = t('பார்வையாளர் இருப்பிடம்', 'Visitor Location');

  return (
    <>
      <nav className={`fs-bar${compact ? ' is-compact' : ''}${shown ? ' is-shown' : ''}`}
        aria-label={t('சமூக ஊடகங்கள்', 'Social media')} inert={!shown}>
        {SOCIAL_LINKS.map(s => (
          <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
            className="fs-icon" aria-label={s.name} title={s.name}>
            {s.icon}
          </a>
        ))}
        <span className="fs-tag-wrap">
          <button ref={pinRef} type="button" className="fs-icon fs-pin" onClick={() => setPopupOpen(true)}
            aria-label={label} aria-haspopup="dialog">
            <MapPin size={18} />
          </button>
          <span className="fs-tag" aria-hidden="true">{label}</span>
        </span>
      </nav>

      {compact && (
        <button type="button" className="fs-toggle" onClick={() => setExpanded(o => !o)} aria-expanded={expanded}
          aria-label={expanded ? t('சமூக ஊடக இணைப்புகளை மூடு', 'Close social media links') : t('சமூக ஊடக இணைப்புகளைக் காட்டு', 'Show social media links')}>
          {expanded ? <X size={19} /> : <Share2 size={19} />}
        </button>
      )}

      {popupOpen && <VisitorLocationModal onClose={() => setPopupOpen(false)} />}

      <style>{`
        .fs-bar {
          position: fixed; left: 16px; bottom: 24px; z-index: 9999;
          display: flex; flex-direction: column; gap: 8px;
        }
        .fs-icon {
          width: 36px; height: 36px; border-radius: 50%; padding: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(26,5,5,0.88); color: #C9973B; border: 1px solid rgba(201,151,59,0.55);
          box-shadow: 0 4px 12px rgba(26,5,5,0.25); cursor: pointer; text-decoration: none;
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
        }
        .fs-icon svg { width: 16px; height: 16px; }
        .fs-icon:hover, .fs-icon:focus-visible {
          transform: translateX(3px) scale(1.08); background: #5C1A08; color: #F2D28A;
          box-shadow: 0 0 0 3px rgba(201,151,59,0.25), 0 6px 16px rgba(26,5,5,0.3); outline: none;
        }
        .fs-pin { background: #5C1A08; color: #F2D28A; border-color: #C9973B; }
        .fs-pin svg { width: 18px; height: 18px; }
        .fs-tag-wrap { position: relative; display: flex; }
        .fs-tag {
          position: absolute; left: calc(100% + 10px); top: 50%; transform: translate(-6px, -50%);
          white-space: nowrap; pointer-events: none; opacity: 0;
          background: #5C1A08; color: #FAF8F2; border: 1px solid rgba(201,151,59,0.5);
          font-size: 0.75rem; font-weight: 600; padding: 0.3rem 0.65rem; border-radius: 6px;
          box-shadow: 0 4px 12px rgba(26,5,5,0.25); transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .fs-tag-wrap:hover .fs-tag, .fs-tag-wrap:has(:focus-visible) .fs-tag { opacity: 1; transform: translate(0, -50%); }

        /* Folded: the column sits above the Share button and opens on demand */
        .fs-bar.is-compact { bottom: 76px; opacity: 0; transform: translateY(12px) scale(0.92); pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease; }
        .fs-bar.is-compact.is-shown { opacity: 1; transform: none; pointer-events: auto; }
        .fs-toggle {
          position: fixed; left: 16px; bottom: 24px; z-index: 9999; width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          background: #5C1A08; color: #F2D28A; border: 1px solid #C9973B; box-shadow: 0 4px 14px rgba(26,5,5,0.35);
        }
        .fs-toggle:active { transform: scale(0.94); }
        .fs-toggle:focus-visible { outline: 2px solid #F2D28A; outline-offset: 2px; }
        /* Short screens: smaller icons. Held sideways there is no room for a column of
           nine above the Share button, so they open as a row beside it instead. */
        @media (max-height: 600px) { .fs-bar { gap: 6px; } .fs-icon { width: 32px; height: 32px; } }
        @media (max-height: 600px) and (orientation: landscape) {
          .fs-bar.is-compact { flex-direction: row; bottom: 30px; left: 70px; }
        }

        /* Visitor-location popup */
        .vl-overlay {
          position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center;
          padding: 16px; background: rgba(26,5,5,0.6); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
          animation: vl-fade 0.15s ease;
        }
        .vl-modal {
          position: relative; width: 100%; max-width: 640px; max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px);
          overflow-y: auto; box-sizing: border-box; padding: 1.5rem;
          background: #FAF8F2; border: 1px solid rgba(201,151,59,0.45); border-top: 3px solid #C9973B; border-radius: 14px;
          box-shadow: 0 24px 60px rgba(26,5,5,0.45);
        }
        .vl-close {
          position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          background: transparent; border: 1px solid rgba(92,26,8,0.2); color: #5C1A08;
        }
        .vl-close:hover { background: rgba(92,26,8,0.06); }
        .vl-close:focus-visible { outline: 2px solid #C9973B; outline-offset: 2px; }
        @keyframes vl-fade { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 480px) { .vl-modal { padding: 1.1rem; } }
        @media (prefers-reduced-motion: reduce) { .vl-overlay, .fs-bar, .fs-icon { animation: none; transition: none; } }
      `}</style>
    </>
  );
};

export default FloatingSocials;
