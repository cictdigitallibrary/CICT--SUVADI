/**
 * SiteContentProvider — the editable text and banners of the public pages.
 *
 * Every page keeps its own content as built-in defaults (content/siteDefaults.js). What the
 * administrator publishes in the admin "Page Content" and "Banners" sections is loaded
 * from /api/site-content and replaces those defaults item by item; anything not
 * published (or missing, or the API unreachable) shows the built-in content, so a page
 * never renders empty.
 *
 * - Loaded once per visit, never from the browser cache (no-store), and again when the
 *   visitor comes back to the tab after a while, so edits appear without a redeploy and
 *   no outdated text is kept.
 * - Until the content has arrived (at most MAX_WAIT ms) the public pages wait, so a
 *   visitor never sees the old text flash before the published one.
 * - Preview: the admin opens a page with ?cms_preview=<token>; drafts are then shown
 *   instead of the published content, with a bar at the top, for that browser tab only.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PAGES, BANNERS, builtInValue, photoUrl } from './siteDefaults';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_WAIT = 2000;
const REFRESH_AFTER = 60 * 1000;
const PREVIEW_KEY = 'suvadi_cms_preview';

const SiteContentContext = createContext({ content: {}, banners: {}, ready: true, preview: false });

function readPreviewToken() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('cms_preview');
    if (fromUrl) {
      sessionStorage.setItem(PREVIEW_KEY, fromUrl);
      params.delete('cms_preview');
      const qs = params.toString();
      window.history.replaceState(window.history.state, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
      return fromUrl;
    }
    return sessionStorage.getItem(PREVIEW_KEY);
  } catch { return null; }
}

export function SiteContentProvider({ children }) {
  const location = useLocation();
  const [previewToken, setPreviewToken] = useState(() => (typeof window === 'undefined' ? null : readPreviewToken()));
  const [state, setState] = useState({ content: {}, banners: {}, ready: false, error: null, loadedAt: 0 });

  const load = useCallback(async (signal) => {
    try {
      const res = await fetch(`${API}/api/site-content${previewToken ? '/preview' : ''}`, {
        cache: 'no-store', signal,
        headers: previewToken ? { Authorization: `Bearer ${previewToken}` } : undefined,
      });
      if (res.status === 401 && previewToken) {
        try { sessionStorage.removeItem(PREVIEW_KEY); } catch { /* ignore */ }
        setPreviewToken(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setState({ content: data.content || {}, banners: data.banners || {}, ready: true, error: null, loadedAt: Date.now() });
    } catch (e) {
      if (e.name === 'AbortError') return;
      // Unreachable or refused: keep what is shown (built-in content on first load)
      setState(s => ({ ...s, ready: true, error: e.message }));
    }
  }, [previewToken]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    const timer = setTimeout(() => setState(s => (s.ready ? s : { ...s, ready: true })), MAX_WAIT);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [load]);

  // Back on the tab after a while: fetch again, so a long-open page shows new content
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - state.loadedAt > REFRESH_AFTER) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, state.loadedAt]);

  const exitPreview = () => {
    try { sessionStorage.removeItem(PREVIEW_KEY); } catch { /* ignore */ }
    setPreviewToken(null);
  };

  const value = useMemo(() => ({ ...state, preview: !!previewToken }), [state, previewToken]);
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <SiteContentContext.Provider value={value}>
      {previewToken && !isAdmin && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#1A0303', color: '#E8B86D', borderTop: '2px solid #C9973B', padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
          <strong>Preview — unpublished changes are shown.</strong>
          <span style={{ opacity: 0.75 }}>Visitors still see the published content.</span>
          <button onClick={exitPreview} style={{ border: '1px solid #C9973B', borderRadius: 4, padding: '2px 10px', color: '#fff' }}>Exit preview</button>
        </div>
      )}
      {state.ready || isAdmin ? children : null}
    </SiteContentContext.Provider>
  );
}

export const useSiteContentState = () => useContext(SiteContentContext);

// Pick the language, falling back to Tamil when the English text is empty (as t() does)
const pick = (v, language) => {
  if (!v) return '';
  return language === 'en' ? (v.en || v.ta || '') : (v.ta || v.en || '');
};

/**
 * usePageContent('home') →
 *   section(key)     { title, body } of a content window in the current language (body: HTML)
 *   text(key, name)  a text of a fields section in the current language
 *   field(key, name) { ta, en } of that text (for places that show both languages)
 *   list(key)        { title, rows: [{ type, text, ta, en }] } of a list section
 * Anything not published (or not in the expected shape) gives the page's built-in content.
 */
export function usePageContent(pageKey) {
  const { content } = useContext(SiteContentContext);
  const { language } = useLanguage();
  const page = PAGES[pageKey];
  if (!page) throw new Error(`Unknown content page ${pageKey}`);
  const published = content[pageKey] || {};

  return useMemo(() => {
    const value = (key) => {
      const def = page.sections[key];
      if (!def) throw new Error(`Unknown content section ${pageKey}/${key}`);
      const v = published[key];
      const builtIn = builtInValue(def);
      if (!v || typeof v !== 'object') return builtIn;
      if (def.kind === 'section') return typeof v.body_ta === 'string' ? v : builtIn;
      if (def.kind === 'fields') return v.values && typeof v.values === 'object' ? { values: { ...builtIn.values, ...v.values } } : builtIn;
      return Array.isArray(v.rows) ? v : builtIn;
    };
    const field = (key, name) => value(key).values[name] || { ta: '', en: '' };
    return {
      language,
      section: (key) => {
        const v = value(key);
        return { title: pick({ ta: v.title_ta, en: v.title_en }, language), body: pick({ ta: v.body_ta, en: v.body_en }, language) };
      },
      field,
      text: (key, name) => pick(field(key, name), language),
      list: (key) => {
        const v = value(key);
        return {
          title: pick({ ta: v.title_ta, en: v.title_en }, language),
          rows: v.rows.map(r => ({ ...r, text: pick(r, language) })),
        };
      },
      // members(key) → [{ photo (full address), name, title, name_en }] in display order
      members: (key) => value(key).rows.map(r => ({
        photo: photoUrl(r.photo, API),
        name: pick({ ta: r.name_ta, en: r.name_en }, language),
        title: pick({ ta: r.title_ta, en: r.title_en }, language),
        name_en: r.name_en || r.name_ta || '',
      })),
    };
  }, [page, pageKey, published, language]);
}

/**
 * useBanner('home.hero') → { image, imageMobile, text(key), field(key) }, or null for an
 * unknown placement. image: the published banner, or the built-in one.
 */
export function useBanner(slot) {
  const { banners } = useContext(SiteContentContext);
  const { language } = useLanguage();
  const def = BANNERS[slot];
  const v = banners[slot];

  return useMemo(() => {
    if (!def) return null;   // no banner placement with this key (e.g. a book without a banner)
    const field = (key) => {
      const d = def.text[key] || { ta: '', en: '' };
      if (!v) return d;
      return { ta: v[`${key}_ta`] ?? d.ta, en: v[`${key}_en`] ?? d.en };
    };
    return {
      image: v && v.image ? `${API}${v.image}` : def.image,
      imageMobile: v && v.image_mobile ? `${API}${v.image_mobile}` : null,
      custom: !!(v && v.image),
      field,
      text: (key) => pick(field(key), language),
    };
  }, [def, v, language]);
}
