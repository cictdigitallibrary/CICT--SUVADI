/**
 * BannerManager — admin "Banners": the banner images (and their text) of the website.
 *
 * Each placement shows where it is used, the size the image must have and how it is
 * displayed on desktops and phones. A new image is checked in the browser before upload
 * and again by the server (format, proportions, minimum width); one with the wrong shape
 * is refused rather than stretched or cropped. Changes go into a draft that can be
 * previewed (here, in the banner's real shape, and on the page itself) before publishing.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Upload, Eye, Send, Undo2, RotateCcw, Save, Loader2, Smartphone, Monitor, ImageOff, ExternalLink, AlertTriangle } from 'lucide-react';
import { BANNERS } from '../content/siteDefaults';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API = `${BASE}/api/admin`;
const errorText = (e) => e?.response?.data?.error || e?.message || 'Request failed';
const PAGE_PATH = (key) => ({ 'home.hero': '/', 'search.hero': '/search', 'ebooks.hero': '/ebooks', 'contact.hero': '/contact' }[key] || (key.startsWith('ebook.') ? `/ebooks/${key.slice(6)}` : '/'));
const imgUrl = (u) => (!u ? null : u.startsWith('/api/') ? `${BASE}${u}` : u);

// Natural size of a local file, before uploading it
const readSize = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
  img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
  img.src = url;
});
function preCheck(spec, size) {
  if (!size) return { error: 'This file could not be read as an image.' };
  if (spec.ratioTolerance != null) {
    const want = spec.width / spec.height, got = size.width / size.height;
    if (Math.abs(got - want) / want > spec.ratioTolerance) {
      return { error: `This placement needs ${spec.width} × ${spec.height} pixels (proportion ${want.toFixed(2)}:1). Your image is ${size.width} × ${size.height} (${got.toFixed(2)}:1) and would be distorted. Please resize / crop it to ${spec.width} × ${spec.height}.` };
    }
  }
  const minWidth = spec.minWidth || Math.round(spec.width * 0.6);
  if (size.width < minWidth) return { error: `Your image is only ${size.width} pixels wide; at least ${minWidth} are needed (recommended ${spec.width} × ${spec.height}).` };
  return {};
}

export default function BannerManager() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const r = await axios.get(`${API}/site-banners`); setSlots(r.data); setError(''); }
    catch (e) { setError(`Could not load the banners: ${errorText(e)}`); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="bg-white rounded-2xl p-12 flex justify-center text-stone/40"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  const groups = [];
  for (const s of slots) {
    const g = s.page.startsWith('E-Book page') ? 'E-Book category banners' : 'Page banners';
    const last = groups[groups.length - 1];
    if (last && last.name === g) last.items.push(s); else groups.push({ name: g, items: [s] });
  }
  return (
    <div className="space-y-8">
      {error && <div className="rounded-xl px-5 py-3 text-sm border bg-red-50 text-red-700 border-red-200">{error}</div>}
      <div className="rounded-xl px-5 py-4 text-sm bg-white border border-stone/10 text-stone/60 leading-relaxed">
        A new image or text is kept as a <b>draft</b> until you press <b>Publish</b>. Images must have the exact proportions shown for each banner;
        an image with another shape is refused instead of being stretched or cropped. Uploaded files are stored separately from books, manuscripts and e-book PDFs.
      </div>
      {groups.map(g => (
        <div key={g.name} className="space-y-5">
          <h3 className="text-[11px] uppercase tracking-[0.25em] font-bold text-stone/40">{g.name}</h3>
          {g.items.map(s => <BannerSlot key={s.key} slot={s} onChanged={load} />)}
        </div>
      ))}
    </div>
  );
}

function Btn({ onClick, disabled, icon: Icon, busy, tone = 'maroon', children, title }) {
  const tones = {
    maroon: 'bg-maroon text-white hover:bg-maroon-dark',
    gold: 'bg-gold text-maroon hover:brightness-105',
    light: 'bg-white text-stone/70 border border-stone/15 hover:text-maroon hover:border-maroon/30',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:pointer-events-none ${tones[tone]}`}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

function SpecLine({ icon: Icon, title, spec }) {
  return (
    <div className="flex gap-2 text-xs text-stone/60">
      <Icon className="w-4 h-4 shrink-0 text-gold mt-0.5" />
      <div>
        <b className="text-stone/80">{title}: </b>
        {spec.ratioTolerance != null
          ? <>required <b className="text-maroon">{spec.width} × {spec.height} px</b> (proportion {(spec.width / spec.height).toFixed(2)}:1, at least {spec.minWidth || Math.round(spec.width * 0.6)} px wide). </>
          : <>recommended <b className="text-maroon">{spec.width} × {spec.height} px</b>, at least {spec.minWidth} px wide. </>}
        {spec.note}
        <span className="block text-stone/40">JPEG, PNG or WebP, up to 15 MB.</span>
      </div>
    </div>
  );
}

// The banner in its real shape: desktop box 1920:555 (fit as on the site); phone box 375 wide
function BannerPreview({ spec, src, mobileSrc, label, mobile }) {
  const fit = spec.fit === 'stretch' ? '100% 100%' : spec.fit === 'contain' ? 'contain' : 'cover';
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-stone/40 mb-1">{label}</p>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[240px] rounded-md border border-stone/15 overflow-hidden bg-[#1A0303]"
          style={{ aspectRatio: '1920 / 555', backgroundImage: src ? `url('${src}')` : undefined, backgroundSize: fit, backgroundPosition: 'center', backgroundRepeat: 'no-repeat', ...(spec.fit === 'contain' ? { backgroundOrigin: 'content-box', padding: '3%' } : {}) }} />
        {mobile && (
          <div className="rounded-md border border-stone/15 overflow-hidden bg-[#1A0303] shrink-0" title="Phone (375 px wide)"
            style={{ width: 120, height: 84, backgroundImage: `url('${mobileSrc || src}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}
      </div>
    </div>
  );
}

function BannerSlot({ slot, onChanged }) {
  const def = BANNERS[slot.key] || { image: slot.defaultImage, text: {} };
  const row = slot.row;
  const published = row?.published || null;
  const draft = row?.draft || null;
  const effective = draft ? (draft.reset ? {} : draft) : (published || {});
  const [text, setText] = useState({});
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
  const mobileRef = useRef(null);

  // Text inputs start from the draft / published text, else the built-in text
  const textValue = useCallback((key, lang) => {
    const k = `${key}_${lang}`;
    if (k in text) return text[k];
    if (effective[k] != null) return effective[k];
    return (def.text[key] || {})[lang] || '';
  }, [text, effective, def]);
  const textDirty = Object.keys(text).length > 0;

  const run = async (label, fn, ok) => {
    setBusy(label); setMsg(null);
    try { const m = await fn(); setMsg(m || (ok ? { tone: 'ok', text: ok } : null)); await onChanged(); }
    catch (e) { setMsg({ tone: 'error', text: errorText(e) }); }
    finally { setBusy(''); }
  };

  const upload = async (file, variant) => {
    if (!file) return;
    const spec = slot[variant];
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) { setMsg({ tone: 'error', text: 'Banners must be JPEG, PNG or WebP images.' }); return; }
    if (file.size > 15 * 1024 * 1024) { setMsg({ tone: 'error', text: 'Banner images can be at most 15 MB.' }); return; }
    const check = preCheck(spec, await readSize(file));
    if (check.error) { setMsg({ tone: 'error', text: check.error }); return; }
    run(`upload:${variant}`, async () => {
      const fd = new FormData();
      fd.append('variant', variant);
      fd.append('image', file);
      const r = await axios.post(`${API}/site-banners/${slot.key}/image`, fd);
      return { tone: r.data.warning ? 'warn' : 'ok', text: r.data.warning || 'Image uploaded to the draft. Check the preview, then publish.' };
    });
  };

  const saveText = () => run('text', async () => {
    const body = {};
    for (const t of slot.text) for (const lang of ['ta', 'en']) body[`${t.key}_${lang}`] = textValue(t.key, lang);
    await axios.put(`${API}/site-banners/${slot.key}`, body);
    setText({});
  }, 'Text saved to the draft.');

  const publish = () => {
    if (textDirty) { window.alert('Save the text first, then publish.'); return; }
    if (!window.confirm('Publish this banner? Visitors will see it immediately.')) return;
    run('publish', () => axios.post(`${API}/site-banners/${slot.key}/publish`, {}), 'Published. The website now shows this banner.');
  };
  const discard = () => run('discard', async () => { await axios.post(`${API}/site-banners/${slot.key}/discard`, {}); setText({}); }, 'Draft discarded.');
  const reset = () => {
    if (!window.confirm('Go back to the original banner (image and text)? It takes effect when you publish.')) return;
    run('reset', async () => { await axios.post(`${API}/site-banners/${slot.key}/reset`, {}); setText({}); }, 'Original banner restored in the draft. Publish to apply it.');
  };
  const removeMobile = () => run('nomobile', () => axios.post(`${API}/site-banners/${slot.key}/remove-mobile`, {}), 'Mobile image removed from the draft.');
  const previewPage = () => run('preview', async () => {
    const win = window.open('about:blank', '_blank');
    const r = await axios.post(`${API}/site-content-preview-token`, {});
    const url = `${window.location.origin}${PAGE_PATH(slot.key)}?cms_preview=${encodeURIComponent(r.data.token)}`;
    if (win) win.location.href = url; else window.open(url, '_blank');
  });

  const publishedImg = imgUrl(published?.image) || def.image;
  const publishedMobile = imgUrl(published?.image_mobile);
  const draftImg = draft ? (draft.reset ? def.image : imgUrl(draft.image) || def.image) : null;
  const draftMobile = draft && !draft.reset ? imgUrl(draft.image_mobile) : null;
  const status = draft ? (draft.reset ? 'Restore original — not published' : 'Draft — not published') : published ? 'Published (replaced)' : 'Original banner';
  const tone = draft ? 'bg-amber-50 text-amber-700 border-amber-200' : published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-stone/5 text-stone/50 border-stone/15';

  return (
    <section className={`bg-white rounded-2xl shadow-sm border p-6 ${draft ? 'border-amber-300' : 'border-stone/5'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-base font-bold text-maroon" style={{ fontFamily: '"Noto Sans Tamil", Inter, sans-serif' }}>{slot.page}</p>
          <p className="text-xs text-stone/50">{slot.section} · <a href={PAGE_PATH(slot.key)} target="_blank" rel="noopener noreferrer" className="hover:text-maroon inline-flex items-center gap-1">{PAGE_PATH(slot.key)} <ExternalLink className="w-3 h-3" /></a></p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${tone}`}>{status}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <BannerPreview spec={slot.desktop} src={publishedImg} mobileSrc={publishedMobile} mobile={!!slot.mobile} label="On the website now" />
          {draftImg && <BannerPreview spec={slot.desktop} src={draftImg} mobileSrc={draftMobile} mobile={!!slot.mobile} label="Draft (after publishing)" />}
        </div>
        <div className="space-y-3">
          <SpecLine icon={Monitor} title={slot.mobile ? 'Desktop and tablet' : 'Image'} spec={slot.desktop} />
          {slot.mobile && <SpecLine icon={Smartphone} title="Phone image (optional)" spec={slot.mobile} />}
          <div className="flex flex-wrap gap-2 pt-1">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { upload(e.target.files[0], 'desktop'); e.target.value = ''; }} />
            <Btn onClick={() => fileRef.current.click()} icon={Upload} busy={busy === 'upload:desktop'} disabled={!!busy}>{slot.mobile ? 'Upload desktop image' : 'Upload image'}</Btn>
            {slot.mobile && (
              <>
                <input ref={mobileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={e => { upload(e.target.files[0], 'mobile'); e.target.value = ''; }} />
                <Btn onClick={() => mobileRef.current.click()} icon={Smartphone} busy={busy === 'upload:mobile'} disabled={!!busy} tone="light">Upload phone image</Btn>
                {(draft ? draft.image_mobile : published?.image_mobile) && <Btn onClick={removeMobile} icon={ImageOff} busy={busy === 'nomobile'} disabled={!!busy} tone="light">Remove phone image</Btn>}
              </>
            )}
          </div>
        </div>
      </div>

      {slot.text.length > 0 && (
        <div className="mt-6 border-t border-stone/8 pt-5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-stone/40 mb-3">Banner text</p>
          <div className="space-y-3">
            {slot.text.map(t => (
              <div key={t.key} className="grid md:grid-cols-[180px_1fr_1fr] gap-3 items-start">
                <span className="text-sm font-bold text-stone/70 pt-2">{t.label}</span>
                {['ta', 'en'].map(lang => (
                  <label key={lang} className="block">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone/40">{lang === 'ta' ? 'Tamil / தமிழ்' : 'English (empty = Tamil is shown)'}</span>
                    <input lang={lang} value={textValue(t.key, lang)} onChange={e => setText(x => ({ ...x, [`${t.key}_${lang}`]: e.target.value }))}
                      className="w-full border border-stone/15 rounded-lg px-3 py-2 text-[15px] outline-none focus:border-gold focus:ring-2 focus:ring-gold/15"
                      style={{ fontFamily: lang === 'ta' ? '"Noto Sans Tamil", sans-serif' : undefined }} />
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3"><Btn onClick={saveText} icon={Save} disabled={!textDirty || !!busy} busy={busy === 'text'}>Save text</Btn></div>
        </div>
      )}

      {msg && (
        <div className={`mt-4 rounded-lg px-4 py-2.5 text-sm border flex gap-2 ${msg.tone === 'error' ? 'bg-red-50 text-red-700 border-red-200' : msg.tone === 'warn' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {msg.tone !== 'ok' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}{msg.text}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 justify-end border-t border-stone/8 pt-4">
        <Btn onClick={previewPage} icon={Eye} busy={busy === 'preview'} disabled={!!busy} tone="light">Preview on the page</Btn>
        {draft && <Btn onClick={discard} icon={Undo2} busy={busy === 'discard'} disabled={!!busy} tone="light">Discard draft</Btn>}
        {(published || (draft && !draft.reset)) && <Btn onClick={reset} icon={RotateCcw} busy={busy === 'reset'} disabled={!!busy} tone="light">Restore original</Btn>}
        <Btn onClick={publish} icon={Send} busy={busy === 'publish'} disabled={!draft || !!busy} tone="gold">Publish</Btn>
      </div>
    </section>
  );
}
