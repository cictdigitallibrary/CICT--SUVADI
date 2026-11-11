import { useEffect, useState } from 'react';
import { Eye, CalendarDays, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getOrCreateSessionId, istDateString, resolveVisitorGeotag } from '../utils/visitor';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Storage may be unavailable (private mode / blocked site data): never break the page
const store = {
  get: (s, k) => { try { return window[s].getItem(k); } catch { return null; } },
  set: (s, k, v) => { try { window[s].setItem(k, v); } catch { /* ignore */ } },
};
const postVisit = body => fetch(`${API}/api/analytics/visit`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true,
}).then(r => r.ok).catch(() => false);
// One request of each kind at a time per page load (React may mount twice in development)
let visitInFlight = false, geoInFlight = false;

// The live server refuses some requests (HTTP 403) while a page is loading many files
// at once (IIS concurrent-request limit). Counter requests therefore wait until the
// page has loaded, and a refused request is tried again a few times before giving up.
const RETRY_DELAYS = [2000, 5000, 10000];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function withRetry(attempt, isCancelled) {
  for (let i = 0; ; i++) {
    if (isCancelled()) return false;
    if (await attempt()) return true;
    if (i >= RETRY_DELAYS.length) return false;
    await sleep(RETRY_DELAYS[i]);
  }
}
// Resolves once the page's own images and files have loaded (at most `maxWait` ms)
const afterPageLoad = (maxWait = 4000) => new Promise(resolve => {
  if (document.readyState === 'complete') { resolve(); return; }
  const done = () => { clearTimeout(timer); window.removeEventListener('load', done); resolve(); };
  const timer = setTimeout(done, maxWait);
  window.addEventListener('load', done);
});

/* Visitor tracking: count this browser once per IST day, add its approximate city
   once per tab session, and keep the counts fresh. Runs only where the Footer is
   shown (the public pages); failures are silent and never affect the page. */
function useVisitorStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    // true when the counts were loaded
    const load = () => fetch(`${API}/api/analytics/stats`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setStats(d); return !!d; })
      .catch(() => false);

    let timer;
    afterPageLoad().then(() => {
      if (cancelled) return;
      const sessionId = getOrCreateSessionId();
      if (sessionId) {
        const today = istDateString();
        if (store.get('localStorage', 'cict_visit_date') !== today && !visitInFlight) {
          visitInFlight = true;
          withRetry(() => postVisit({ sessionId }), isCancelled)
            // once recorded, refresh so this visit shows in the counts at once
            .then(ok => { if (ok) { store.set('localStorage', 'cict_visit_date', today); load(); } })
            .finally(() => { visitInFlight = false; });
        }
        if (store.get('sessionStorage', 'cict_geo_synced') !== 'true' && !geoInFlight) {
          geoInFlight = true;
          resolveVisitorGeotag()
            .then(geo => geo && withRetry(() => postVisit({ sessionId, ...geo }), isCancelled).then(ok => {
              if (ok) {
                store.set('sessionStorage', 'cict_geo_synced', 'true');
                store.set('localStorage', 'cict_visit_date', today);
              }
            }))
            .catch(() => {})
            .finally(() => { geoInFlight = false; });
        }
      }
      withRetry(load, isCancelled);
      timer = setInterval(load, 60_000);
    });
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
  return stats;
}

const Footer = () => {
  const { language, t } = useLanguage();
  const visitorStats = useVisitorStats();
  const fmt = n => (typeof n === 'number' ? n.toLocaleString() : '—');


  return (
    <footer className="site-footer text-ivory" style={{ paddingTop: '2rem', paddingBottom: '1.5rem' }}>
      {/* Top gold line */}
      <div className="absolute top-0 left-0 w-full h-[3px]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #C9973B 25%, #E8B86D 50%, #C9973B 75%, transparent 100%)' }} />

      {/* Realistic Manuscript Bundle — right side, bottom corner */}
      {/* Hidden on phones (like the Home page's palm-leaf images): there it sits right
          behind the contact details and visitor counts and makes them hard to read */}
      <div className="absolute bottom-[-20px] right-[-150px] pointer-events-none select-none hidden sm:block" style={{ zIndex: 1, width: '400px' }}>
        <img src="/images/palm_manuscript.png" alt="Decorative Footer Manuscript" aria-hidden="true" loading="lazy" decoding="async" className="w-full h-auto object-contain" style={{ opacity: 0.9 }} />
      </div>

      <div className="footer-inner container mx-auto px-6" style={{ position: 'relative', zIndex: 2 }}>
        {/* 2 Balanced Vertically-Centered Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* ── Left Column: About Suvadi (col-span-6) ── */}
          <div className="md:col-span-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Cinzel", serif', fontWeight: 800, fontSize: '1.75rem', color: '#C9973B', letterSpacing: '0.02em' }}>
                  {t('சுவடியியல் புலம்', 'Faculty of Manuscriptology')}
                </span>
              </div>

              <p style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Inter", sans-serif', fontWeight: 400, fontSize: '0.85rem', color: 'rgba(245,240,232,0.80)', lineHeight: 1.6, marginBottom: '1.25rem', maxWidth: '540px' }}>
                {t(
                  'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் (CICT) - தமிழ் செவ்வியல் நூல்களையும் சுவடிகளையும் பாதுகாத்து ஆய்வாளர்களுக்கு வழங்கும் மின்னணுத் தளம்.',
                  'Central Institute of Classical Tamil (CICT) – preserving, digitizing, and promoting the timeless treasures of Classical Tamil literature for future generations.'
                )}
              </p>
            </div>

            <div>
              <span style={{ fontFamily: '"Cinzel", serif', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,151,59,0.65)', fontWeight: 700, display: 'block' }}>
                CENTRAL INSTITUTE OF CLASSICAL TAMIL
              </span>
            </div>
          </div>

          {/* ── Right Column: Contact Details (col-span-6) ── */}
          <div className="md:col-span-6" style={{ position: 'relative', zIndex: 10 }}>
            <p className="footer-col-heading" style={{ marginBottom: '0.4rem' }}>{t('தொடர்பு தகவல்', 'CONTACT INFORMATION')}</p>
            <div className="footer-col-rule" style={{ marginBottom: '0.75rem' }} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: '0.75rem' }}>
              {/* Tamil Address */}
              <div className="space-y-1" style={{ fontSize: '0.8rem', color: 'rgba(245,240,232,0.85)', lineHeight: 1.5, fontFamily: '"Noto Sans Tamil", sans-serif' }}>
                <p className="font-bold text-gold" style={{ color: '#C9973B' }}>சுவடியியல் புலம்</p>
                <p>செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்</p>
                <p>செம்மொழிச் சாலை</p>
                <p>பெரும்பாக்கம்</p>
                <p>சென்னை - 600100.</p>
              </div>

              {/* English Address */}
              <div className="space-y-1" style={{ fontSize: '0.8rem', color: 'rgba(245,240,232,0.85)', lineHeight: 1.5, fontFamily: '"Inter", sans-serif' }}>
                <p className="font-bold text-gold" style={{ color: '#C9973B' }}>Faculty of Manuscriptology</p>
                <p>Central Institute Classical Tamil</p>
                <p>Chemmozhi Salai</p>
                <p>Perumbakkam</p>
                <p>Chennai - 600100.</p>
              </div>
            </div>

            {/* Additional Contact Channels */}
            <div className="pt-3 border-t border-gold/15 space-y-1.5" style={{ fontSize: '0.8rem' }}>
              <div className="flex items-center gap-3">
                <span className="text-gold font-semibold" style={{ color: '#C9973B', minWidth: '130px', fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Inter", sans-serif' }}>
                  {t('தொலைபேசி', 'Phone')}:
                </span>
                <a href="tel:+914422540125" className="hover:text-gold transition-colors" style={{ color: 'rgba(245,240,232,0.85)' }}>
                  +91-44-22540125
                </a>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-gold font-semibold" style={{ color: '#C9973B', minWidth: '130px', fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Inter", sans-serif' }}>
                  {t('நிறுவன இணைய முகவரி', 'Website')}:
                </span>
                <a href="https://www.cict.in" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors" style={{ color: 'rgba(245,240,232,0.85)' }}>
                  www.cict.in
                </a>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-gold font-semibold" style={{ color: '#C9973B', minWidth: '130px', fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Inter", sans-serif' }}>
                  {t('மின்னஞ்சல்', 'Email')}:
                </span>
                <a href="mailto:suvadi@cict.in" className="hover:text-gold transition-colors" style={{ color: 'rgba(245,240,232,0.85)' }}>
                  suvadi@cict.in
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* ── Visitor counter ── */}
        <div className="footer-visitors" style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Inter", sans-serif' }}>
          {[
            { icon: Eye, label: t('மொத்தப் பார்வையாளர்கள்', 'Total Visitors'), value: visitorStats?.total },
            { icon: CalendarDays, label: t('இம்மாதப் பார்வையாளர்கள்', 'Monthly Visitors'), value: visitorStats?.month },
            { icon: Users, label: t('இன்றைய பார்வையாளர்கள்', 'Today Visitors'), value: visitorStats?.today },
          ].map(({ icon: Icon, label, value }, i) => (
            <span key={i} className="footer-visitors-item">
              <Icon size={14} aria-hidden="true" style={{ color: '#C9973B', flexShrink: 0 }} />
              <span>{label}:</span>
              <strong className="footer-visitors-count">{fmt(value)}</strong>
            </span>
          ))}
          <span className="footer-visitors-live" title={t('ஒவ்வொரு நிமிடமும் புதுப்பிக்கப்படுகிறது', 'Updated every minute')}>
            <span className="footer-visitors-dot" aria-hidden="true" />LIVE
          </span>
        </div>

      </div>
      <style>{`
        .footer-visitors {
          margin-top: 1.25rem; padding-top: 0.85rem; border-top: 1px solid rgba(201,151,59,0.15);
          display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
          column-gap: 1.75rem; row-gap: 0.5rem; font-size: 0.78rem; color: rgba(245,240,232,0.8);
        }
        /* Spaced by gaps rather than "·" separators, which were left dangling at the end
           of a line whenever the row wrapped */
        .footer-visitors-item { display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap; }
        .footer-visitors-count { color: #C9973B; font-weight: 700; font-variant-numeric: tabular-nums; }
        .footer-visitors-live {
          display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.1rem 0.5rem;
          border: 1px solid rgba(201,151,59,0.35); border-radius: 999px;
          font-family: "Cinzel", serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.15em; color: #C9973B;
        }
        .footer-visitors-dot { width: 6px; height: 6px; border-radius: 50%; background: #6FCF7F; animation: footer-live-pulse 2s ease-in-out infinite; }
        @keyframes footer-live-pulse { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(111,207,127,0.5); } 50% { opacity: 0.55; box-shadow: 0 0 0 4px rgba(111,207,127,0); } }
        @media (prefers-reduced-motion: reduce) { .footer-visitors-dot { animation: none; } }
        /* Phones: one item per line, as a block centred under the footer whose icons and
           labels line up on one left edge */
        @media (max-width: 640px) {
          .footer-visitors { display: grid; grid-template-columns: auto; justify-content: center; justify-items: start; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
