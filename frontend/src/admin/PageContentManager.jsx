/**
 * PageContentManager — admin "Page Content": the editable sections of the public pages.
 *
 * Choose a page; its sections are listed in page order (a content window with heading and
 * text, a group of short texts / numbers, or a list), starting from the page's built-in
 * content. Changes are saved as a draft; the public site changes only when the page is
 * published. Preview opens the page with the drafts in a new tab. Nothing here touches
 * books, manuscripts or e-book editions.
 */
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, Send, Undo2, RotateCcw, Save, Loader2, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { PAGES, builtInValue } from '../content/siteDefaults';
import RichTextEditor from './RichTextEditor';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API = `${BASE}/api/admin`;
const errorText = (e) => e?.response?.data?.error || e?.message || 'Request failed';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// What the editor starts from: the draft, else the published value, else the built-in one
function working(def, row) {
  const v = row?.draft ? (row.draft.reset ? null : row.draft) : row?.published;
  const builtIn = builtInValue(def);
  if (!v) return builtIn;
  if (def.kind === 'fields') return { values: { ...builtIn.values, ...(v.values || {}) } };
  return v;
}
function statusOf(row) {
  if (row?.draft?.reset) return { label: 'Restore original — not published', tone: 'amber' };
  if (row?.draft) return { label: 'Draft — not published', tone: 'amber' };
  if (row?.published) return { label: 'Published (edited)', tone: 'green' };
  return { label: 'Original content', tone: 'stone' };
}
const TONES = { amber: 'bg-amber-50 text-amber-700 border-amber-200', green: 'bg-green-50 text-green-700 border-green-200', stone: 'bg-stone/5 text-stone/50 border-stone/15' };
const Chip = ({ s }) => <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${TONES[s.tone]}`}>{s.label}</span>;
const inputCls = 'w-full border border-stone/15 rounded-lg px-3 py-2 text-[15px] outline-none focus:border-gold focus:ring-2 focus:ring-gold/15 bg-white';
const Label = ({ children }) => <span className="text-[10px] uppercase tracking-wider font-bold text-stone/40">{children}</span>;

export default function PageContentManager() {
  const pageKeys = Object.keys(PAGES);
  const [pageKey, setPageKey] = useState(pageKeys[0]);
  const [rows, setRows] = useState({});          // section key → stored row
  const [edits, setEdits] = useState({});        // section key → edited value
  const [status, setStatus] = useState({});      // page key → { pending }
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const page = PAGES[pageKey];

  const loadStatus = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/site-content/status`);
      setStatus(Object.fromEntries(r.data.pages.map(p => [p.page_key, p])));
    } catch { /* shown when the page loads */ }
  }, []);

  const loadPage = useCallback(async (key) => {
    setLoading(true); setMessage(null);
    try {
      const r = await axios.get(`${API}/site-content/${key}`);
      setRows(Object.fromEntries(r.data.map(row => [row.item_key, row])));
      setEdits({});
    } catch (e) { setMessage({ tone: 'error', text: `Could not load the page content: ${errorText(e)}` }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPage(pageKey); }, [pageKey, loadPage]);
  useEffect(() => { loadStatus(); }, [loadStatus]);

  const valueOf = (key) => edits[key] ?? working(page.sections[key], rows[key]);
  const setValue = (key, v) => setEdits(e => ({ ...e, [key]: v }));
  const unsaved = Object.keys(edits).filter(k => !same(edits[k], working(page.sections[k], rows[k])));
  const pending = Object.values(rows).filter(r => r.draft).length;

  useEffect(() => {
    if (!unsaved.length) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [unsaved.length]);

  const choosePage = (key) => {
    if (key === pageKey) return;
    if (unsaved.length && !window.confirm('You have unsaved changes on this page. Leave without saving them?')) return;
    setPageKey(key);
  };

  const run = async (label, fn, ok) => {
    setBusy(label); setMessage(null);
    try { await fn(); if (ok) setMessage({ tone: 'ok', text: ok }); }
    catch (e) { setMessage({ tone: 'error', text: errorText(e) }); }
    finally { setBusy(''); }
  };
  const put = async (key, body) => {
    const r = await axios.put(`${API}/site-content/${pageKey}/${key}`, { kind: page.sections[key].kind, ...body });
    setRows(rs => ({ ...rs, [key]: r.data }));
    setEdits(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const saveItem = (key) => run(`save:${key}`, async () => { await put(key, { value: valueOf(key) }); loadStatus(); },
    'Draft saved. Publish the page to show it on the website.');
  const saveAll = () => run('saveall', async () => { for (const key of unsaved) await put(key, { value: valueOf(key) }); loadStatus(); },
    'All changes saved as draft.');
  const restoreItem = (key) => {
    if (!window.confirm('Restore the original content of this section? It takes effect on the website when you publish the page.')) return;
    run(`reset:${key}`, async () => { await put(key, { reset: true }); loadStatus(); }, 'Original content restored in the draft.');
  };
  const discardItem = (key) => run(`discard:${key}`, async () => {
    await axios.post(`${API}/site-content/${pageKey}/discard`, { item: key });
    await loadPage(pageKey); loadStatus();
  }, 'Draft discarded.');
  const publish = () => {
    if (unsaved.length) { window.alert('Save your changes first (Save all changes), then publish.'); return; }
    if (!window.confirm(`Publish ${pending} change(s) to the "${page.label}" page? Visitors will see them immediately.`)) return;
    run('publish', async () => {
      const r = await axios.post(`${API}/site-content/${pageKey}/publish`, {});
      await loadPage(pageKey); loadStatus();
      setMessage({ tone: 'ok', text: `Published ${r.data.published} change(s). The website now shows them.` });
    });
  };
  const discardAll = () => {
    if (!window.confirm('Discard all unpublished drafts of this page? The website is not affected.')) return;
    run('discardall', async () => { await axios.post(`${API}/site-content/${pageKey}/discard`, {}); await loadPage(pageKey); loadStatus(); }, 'Drafts discarded.');
  };
  const preview = () => run('preview', async () => {
    const win = window.open('about:blank', '_blank');
    const r = await axios.post(`${API}/site-content-preview-token`, {});
    const url = `${window.location.origin}${page.path}?cms_preview=${encodeURIComponent(r.data.token)}`;
    if (win) win.location.href = url; else window.open(url, '_blank');
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Pages */}
      <div className="w-full lg:w-64 shrink-0 bg-white rounded-2xl shadow-sm border border-stone/5 overflow-hidden lg:sticky lg:top-24">
        <p className="px-4 py-3 text-[10px] uppercase tracking-[0.25em] font-bold text-stone/40 border-b border-stone/8">Website pages</p>
        {pageKeys.map(k => (
          <button key={k} onClick={() => choosePage(k)}
            className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2 border-b border-stone/5 transition-colors ${k === pageKey ? 'bg-maroon/5 text-maroon font-bold' : 'text-stone/70 hover:bg-stone/5'}`}>
            <span className="text-sm" style={{ fontFamily: '"Noto Sans Tamil", Inter, sans-serif' }}>{PAGES[k].label}</span>
            {status[k]?.pending > 0 && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5" title="Unpublished drafts">{status[k].pending}</span>}
          </button>
        ))}
      </div>

      {/* Sections of the page */}
      <div className="flex-1 min-w-0 w-full space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-stone/5 px-6 py-4 flex flex-wrap items-center justify-between gap-3 sticky top-[72px] z-[5]">
          <div className="min-w-0">
            <h3 className="font-bold text-maroon text-lg" style={{ fontFamily: '"Noto Sans Tamil", Inter, sans-serif' }}>{page.label}</h3>
            <a href={page.path} target="_blank" rel="noopener noreferrer" className="text-xs text-stone/50 hover:text-maroon inline-flex items-center gap-1">
              {page.path} <ExternalLink className="w-3 h-3" />
            </a>
            <span className="ml-3 text-xs text-stone/50">{pending ? `${pending} unpublished draft(s)` : 'No unpublished drafts'}{unsaved.length ? ` · ${unsaved.length} unsaved change(s)` : ''}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={saveAll} disabled={!unsaved.length || !!busy} icon={Save} busy={busy === 'saveall'}>Save all changes</Btn>
            <Btn onClick={preview} disabled={!!busy} icon={Eye} busy={busy === 'preview'} tone="light">Preview</Btn>
            <Btn onClick={discardAll} disabled={!pending || !!busy} icon={Undo2} busy={busy === 'discardall'} tone="light">Discard drafts</Btn>
            <Btn onClick={publish} disabled={!pending || !!busy} icon={Send} busy={busy === 'publish'} tone="gold">Publish page</Btn>
          </div>
        </div>

        {message && (
          <div className={`rounded-xl px-5 py-3 text-sm border ${message.tone === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{message.text}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-12 flex justify-center text-stone/40"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : Object.entries(page.sections).map(([key, def]) => {
          const dirty = unsaved.includes(key);
          const props = { def, value: valueOf(key), onChange: v => setValue(key, v) };
          return (
            <section key={`${pageKey}:${key}`} className={`bg-white rounded-2xl shadow-sm border p-6 ${dirty ? 'border-amber-300' : 'border-stone/5'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-base font-bold text-maroon" style={{ fontFamily: '"Noto Sans Tamil", Inter, sans-serif' }}>{def.label}</p>
                  {def.help && <p className="text-xs text-stone/50 mt-1 max-w-3xl">{def.help}</p>}
                </div>
                <div className="flex items-center gap-2">{dirty && <span className="text-[10px] font-bold text-amber-600 uppercase">Unsaved</span>}<Chip s={statusOf(rows[key])} /></div>
              </div>
              {def.kind === 'section' ? <SectionEditor {...props} /> : def.kind === 'fields' ? <FieldsEditor {...props} /> : <ListEditor {...props} />}
              <div className="mt-4 flex flex-wrap gap-2 justify-end border-t border-stone/8 pt-4">
                {rows[key]?.draft && <Btn onClick={() => discardItem(key)} disabled={!!busy} icon={Undo2} busy={busy === `discard:${key}`} tone="light">Discard draft</Btn>}
                {(rows[key]?.published || (rows[key]?.draft && !rows[key].draft.reset)) && <Btn onClick={() => restoreItem(key)} disabled={!!busy} icon={RotateCcw} busy={busy === `reset:${key}`} tone="light" title="Back to the page's original content">Restore original</Btn>}
                <Btn onClick={() => saveItem(key)} disabled={!dirty || !!busy} icon={Save} busy={busy === `save:${key}`}>Save draft</Btn>
              </div>
            </section>
          );
        })}
      </div>
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

// Content window: heading (optional) + rich text, Tamil and English
function SectionEditor({ def, value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      {def.heading !== false && (
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block"><Label>Heading — Tamil</Label>
            <input className={inputCls} lang="ta" value={value.title_ta} onChange={e => set({ title_ta: e.target.value })} style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }} />
          </label>
          <label className="block"><Label>Heading — English (empty = Tamil is shown)</Label>
            <input className={inputCls} lang="en" value={value.title_en} onChange={e => set({ title_en: e.target.value })} />
          </label>
        </div>
      )}
      <div className="grid 2xl:grid-cols-2 gap-4">
        <div><Label>Text — Tamil</Label><RichTextEditor lang="ta" value={value.body_ta} onChange={html => set({ body_ta: html })} minHeight={220} /></div>
        <div><Label>Text — English (empty = Tamil is shown)</Label><RichTextEditor lang="en" value={value.body_en} onChange={html => set({ body_en: html })} minHeight={220} /></div>
      </div>
    </div>
  );
}

// Short texts / numbers
function FieldsEditor({ def, value, onChange }) {
  const set = (k, lang, v) => onChange({ values: { ...value.values, [k]: { ...value.values[k], [lang]: v } } });
  return (
    <div className="space-y-3">
      {def.fields.map(fd => {
        const Input = fd.multiline ? 'textarea' : 'input';
        const extra = fd.multiline ? { rows: 3 } : { type: 'text' };
        const v = value.values[fd.key] || { ta: '', en: '' };
        return (
          <div key={fd.key} className={`grid gap-3 items-start ${fd.single ? 'md:grid-cols-[260px_1fr]' : 'md:grid-cols-[220px_1fr_1fr]'}`}>
            <span className="text-sm font-bold text-stone/70 pt-2" style={{ fontFamily: '"Noto Sans Tamil", Inter, sans-serif' }}>{fd.label}</span>
            <label className="block">{!fd.single && <Label>Tamil / தமிழ்</Label>}
              <Input {...extra} className={inputCls} lang="ta" value={v.ta} onChange={e => set(fd.key, 'ta', e.target.value)} style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }} />
            </label>
            {!fd.single && (
              <label className="block"><Label>English (empty = Tamil is shown)</Label>
                <Input {...extra} className={inputCls} lang="en" value={v.en} onChange={e => set(fd.key, 'en', e.target.value)} />
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Rows of a list page (the 41 classical texts)
const ROW_TYPES = [['heading', 'Heading'], ['subheading', 'Sub-heading'], ['item', 'Text'], ['gap', 'Gap']];
function ListEditor({ value, onChange }) {
  const rows = value.rows;
  const setRows = (next) => onChange({ ...value, rows: next });
  const update = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const insert = (i) => setRows([...rows.slice(0, i + 1), { type: 'item', ta: '', en: '' }, ...rows.slice(i + 1)]);
  const remove = (i) => {
    const r = rows[i];
    if (r.type !== 'gap' && (r.ta || r.en) && !window.confirm(`Remove the row "${r.ta || r.en}"?`)) return;
    setRows(rows.filter((_, j) => j !== i));
  };
  let n = 0;
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block"><Label>List heading — Tamil</Label>
          <input className={inputCls} lang="ta" value={value.title_ta} onChange={e => onChange({ ...value, title_ta: e.target.value })} style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }} />
        </label>
        <label className="block"><Label>List heading — English (empty = Tamil is shown)</Label>
          <input className={inputCls} lang="en" value={value.title_en} onChange={e => onChange({ ...value, title_en: e.target.value })} />
        </label>
      </div>
      <div className="border border-stone/10 rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[48px_140px_1fr_1fr_76px] gap-2 px-3 py-2 bg-stone/[0.04] text-[10px] uppercase tracking-wider font-bold text-stone/40">
          <span>No.</span><span>Row</span><span>Tamil</span><span>English / transliteration</span><span />
        </div>
        {rows.map((r, i) => {
          const num = r.type === 'item' ? `${++n}.` : '';
          return (
            <div key={i} className={`grid grid-cols-[48px_1fr_76px] md:grid-cols-[48px_140px_1fr_1fr_76px] gap-2 px-3 py-1.5 items-center border-t border-stone/5 ${r.type === 'heading' || r.type === 'subheading' ? 'bg-maroon/[0.03]' : ''}`}>
              <span className="text-xs font-bold text-stone/40">{num}</span>
              <select value={r.type} onChange={e => update(i, e.target.value === 'gap' ? { type: 'gap', ta: undefined, en: undefined } : { type: e.target.value, ta: r.ta || '', en: r.en || '' })}
                className="border border-stone/15 rounded-md px-2 py-1.5 text-xs bg-white md:col-auto col-span-1">
                {ROW_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <div className="flex gap-1 justify-end md:order-last">
                <button type="button" title="Insert a row below" onClick={() => insert(i)} className="p-1.5 rounded hover:bg-stone/10 text-stone/50 hover:text-maroon"><Plus className="w-4 h-4" /></button>
                <button type="button" title="Remove this row" onClick={() => remove(i)} className="p-1.5 rounded text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
              {r.type === 'gap' ? (
                <span className="md:col-span-2 col-span-3 text-xs text-stone/30 italic">(space between groups)</span>
              ) : (
                <>
                  <input className={`${inputCls} py-1.5 md:col-auto col-span-3`} lang="ta" value={r.ta} onChange={e => update(i, { ta: e.target.value })} style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }} />
                  <input className={`${inputCls} py-1.5 md:col-auto col-span-3`} lang="en" value={r.en} placeholder={r.type === 'item' ? '' : '(empty = Tamil is shown)'} onChange={e => update(i, { en: e.target.value })} />
                </>
              )}
            </div>
          );
        })}
        {!rows.length && <div className="p-4"><Btn onClick={() => setRows([{ type: 'item', ta: '', en: '' }])} icon={Plus} tone="light">Add a row</Btn></div>}
      </div>
    </div>
  );
}
