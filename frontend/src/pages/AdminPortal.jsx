import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  Plus, Edit, Trash2, Save, X, Book, Layers, FileText, Users,
  ChevronRight, LayoutDashboard, Search, Mail, UserCheck,
  BookOpen, MessageSquare, Eye, TrendingUp, Database,
  Scroll, Shield, ChevronDown, ChevronUp, RotateCcw,
  ExternalLink, FileIcon, Info,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const API = 'http://localhost:3001/api/admin';
const BASE = 'http://localhost:3001';
const limit = 10;

/* ─── tiny helpers ─── */
const fmt = n => Number(n || 0).toLocaleString();
const stripTags = s => (s || '').replace(/<[^>]+>/g, '').replace(/\r?\n/g, ' ');

/* ─── debounce hook ─── */
function useDebounce(value, delay = 300) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

/* ─── reusable UI atoms ─── */
const StatCard = ({ label, value, icon: Icon, color = 'maroon', sub }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-stone/5 p-6 flex h-full group hover:border-gold/30 hover:shadow-md transition-all justify-between items-start gap-4">
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="text-[10px] text-stone/40 font-bold uppercase tracking-widest mb-1">{label}</div>
        <div className="text-3xl font-black text-maroon tabular-nums">{fmt(value)}</div>
      </div>
      {sub && <div className="text-[10px] text-stone/30 mt-2">{sub}</div>}
    </div>
    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all
      ${color === 'gold'   ? 'bg-gold/10 text-gold group-hover:bg-gold group-hover:text-maroon'
      : color === 'green'  ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
      : color === 'blue'   ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
      : color === 'orange' ? 'bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white'
      : color === 'purple' ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
      : 'bg-maroon/5 text-maroon group-hover:bg-maroon group-hover:text-white'}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

const Field = ({ label, children, hint }) => (
  <div>
    <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-2">{label}</label>
    {children}
    {hint && <p className="text-[9px] text-stone/30 mt-1">{hint}</p>}
  </div>
);

const InputCls = "w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 text-sm text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none";
const TamilInputCls = "w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 tamil-body font-bold text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none";

const StatusPill = ({ value }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase
    ${value ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-red-50 text-red-500 border border-red-200'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-red-400'}`} />
    {value ? 'Active' : 'Off'}
  </span>
);

const StatusToggle = ({ value, onChange }) => (
  <button type="button" onClick={() => onChange(value ? 0 : 1)}
    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border
      ${value ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
    <span className={`w-2 h-2 rounded-full ${value ? 'bg-emerald-500' : 'bg-red-500'}`} />
    {value ? 'Active' : 'Disabled'}
  </button>
);

const Th = ({ children, className = '' }) => (
  <th className={`px-5 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5 whitespace-nowrap ${className}`}>
    {children}
  </th>
);

const Td = ({ children, className = '' }) => (
  <td className={`px-5 py-3.5 ${className}`}>{children}</td>
);

/* ─── BookSelect / CategorySelect / SubCatSelect ─── */
const BookSelect = ({ value, onChange, books, placeholder = '— Select Book —', required }) => (
  <select required={required} value={value || ''} onChange={e => onChange(e.target.value)}
    className={InputCls + ' font-bold'}>
    <option value="">{placeholder}</option>
    {books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
  </select>
);
const CatSelect = ({ value, onChange, cats, placeholder = '— Select Category —', required }) => (
  <select required={required} value={value || ''} onChange={e => onChange(e.target.value)}
    className={InputCls + ' font-bold'}>
    <option value="">{placeholder}</option>
    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
  </select>
);
const SubCatSelect = ({ value, onChange, subcats, placeholder = '— Select Sub-Category —', required }) => (
  <select required={required} value={value || ''} onChange={e => onChange(e.target.value)}
    className={InputCls + ' font-bold'}>
    <option value="">{placeholder}</option>
    {subcats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
  </select>
);

/* ─── Pagination bar ─── */
const Pager = ({ page, totalPages, onPage, total, limit }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="px-6 py-4 border-t border-stone/8 flex items-center justify-between bg-stone/[0.015]">
      <span className="text-[10px] text-stone/40 font-bold">
        Showing <span className="text-maroon">{from} to {to}</span> of <span className="text-maroon">{fmt(total)}</span> entries
      </span>
      <div className="flex items-center gap-2">
        <button onClick={() => onPage(1)} disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border border-stone/10 text-[10px] font-black text-stone/40 hover:text-maroon hover:border-maroon/20 disabled:opacity-30 transition-all">«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="px-4 py-1.5 rounded-lg border border-stone/10 text-[10px] font-black text-stone/50 hover:text-maroon hover:border-maroon/20 disabled:opacity-30 transition-all">Prev</button>
        <span className="px-3 py-1.5 bg-maroon text-white rounded-lg text-[10px] font-black tabular-nums">
          {page} / {totalPages}
        </span>
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="px-4 py-1.5 rounded-lg border border-stone/10 text-[10px] font-black text-stone/50 hover:text-maroon hover:border-maroon/20 disabled:opacity-30 transition-all">Next</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg border border-stone/10 text-[10px] font-black text-stone/40 hover:text-maroon hover:border-maroon/20 disabled:opacity-30 transition-all">»</button>
      </div>
    </div>
  );
};

/* ─── Search bar ─── */
const SearchBar = ({ value, onChange, placeholder = 'Search…', children }) => (
  <div className="p-5 border-b border-stone/8 bg-stone/[0.015] flex items-center gap-3">
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone/30" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon/10" />
    </div>
    {children}
  </div>
);

/* ─── Empty / Loading row ─── */
const EmptyRow = ({ cols, loading, msg = 'No records found.' }) => (
  <tr>
    <td colSpan={cols} className="p-20 text-center">
      {loading
        ? <span className="text-stone/30 font-cinzel italic text-sm animate-pulse">Loading…</span>
        : <span className="text-stone/30 italic text-sm">{msg}</span>}
    </td>
  </tr>
);

/* ─── Inline action buttons ─── */
const ActionBtns = ({ onEdit, onDelete, extraBtns }) => (
  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
    {extraBtns}
    {onEdit && (
      <button onClick={onEdit}
        className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all" title="Edit">
        <Edit className="w-3.5 h-3.5" />
      </button>
    )}
    {onDelete && (
      <button onClick={onDelete}
        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all" title="Delete">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
const AdminPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  /* Per-module table state */
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [search, setSearch]     = useState('');
  const dSearch = useDebounce(search);

  /* Dashboard */
  const [dashStats, setDashStats] = useState(null);

  /* Upload Stats Chart */
  const [chartYear, setChartYear]     = useState('all');
  const [chartData, setChartData]     = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  /* Dropdown option lists for forms */
  const [books, setBooks]     = useState([]);
  const [cats, setCats]       = useState([]);
  const [subcats, setSubcats] = useState([]);

  /* All sub-categories flat list — for the songs form dropdown */
  const [allSubcats, setAllSubcats] = useState([]);

  /* Multi-row song entries for Add New form (+ சேர்) */
  const [songRows, setSongRows] = useState([{ fid: '', fname: '' }]);

  /* Cascade state inside the form */
  const [fmBookId, setFmBookId] = useState('');
  const [fmCatId,  setFmCatId]  = useState('');

  /* Modal / form */
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [fd, setFd]                   = useState({ status: 1 }); // form data

  /* Manuscripts trash toggle */
  const [showTrash, setShowTrash] = useState(false);

  /* Contact detail modal */
  const [contactDetail, setContactDetail] = useState(null);

  const tabs = [
    { id: 'dashboard',     name: 'Dashboard',     icon: LayoutDashboard, label: 'கட்டுப்பாடு' },
    { id: 'books',         name: 'Books',          icon: Book,            label: 'நூல்கள்' },
    { id: 'categories',    name: 'Main Category',  icon: Layers,          label: 'முதல் பிரிவு' },
    { id: 'subcategories', name: 'Sub-Category',   icon: Scroll,          label: 'துணை பிரிவு' },
    { id: 'songs',         name: 'Manuscripts',    icon: FileText,        label: 'பாடல்கள்' },
    { id: 'users',         name: 'Users',          icon: Shield,          label: 'உள்நுழைவு விவரங்கள்' },
  ];

  const totalPages = Math.max(1, Math.ceil(total / limit));

  /* ── dropdown loaders ── */
  const loadBooks = useCallback(async () => {
    try { const r = await axios.get(`${API}/books/select`); setBooks(r.data); } catch {}
  }, []);

  const loadCats = useCallback(async (bookId) => {
    try {
      const url = bookId ? `${API}/categories/select?book_id=${bookId}` : `${API}/categories/select`;
      const r = await axios.get(url); setCats(r.data);
    } catch {}
  }, []);

  const loadSubcats = useCallback(async (catId) => {
    try {
      const url = catId ? `${API}/subcategories/select?category_id=${catId}` : `${API}/subcategories/select`;
      const r = await axios.get(url); setSubcats(r.data);
    } catch {}
  }, []);

  /* Load flat sub-category list for the songs form */
  const loadAllSubcats = useCallback(async () => {
    try { const r = await axios.get(`${API}/subcategories/select`); setAllSubcats(r.data); } catch {}
  }, []);

  useEffect(() => { loadBooks(); loadAllSubcats(); }, [loadBooks, loadAllSubcats]);

  /* cascade: book → cats */
  useEffect(() => {
    if (fmBookId) { loadCats(fmBookId); setFmCatId(''); setSubcats([]); }
    else { setCats([]); setFmCatId(''); setSubcats([]); }
  }, [fmBookId, loadCats]);

  /* cascade: cat → subcats */
  useEffect(() => {
    if (fmCatId) loadSubcats(fmCatId);
    else setSubcats([]);
  }, [fmCatId, loadSubcats]);

  /* reset page+search on tab change */
  useEffect(() => {
    setPage(1); setSearch(''); setShowTrash(false);
  }, [activeTab]);

  /* main data fetch */
  useEffect(() => {
    if (activeTab === 'dashboard') { fetchDashStats(); return; }
    fetchData();
  }, [activeTab, page, dSearch, showTrash]);

  const fetchDashStats = async () => {
    try { const r = await axios.get(`${API}/dashboard-stats`); setDashStats(r.data); } catch {}
  };

  const fetchChartData = useCallback(async () => {
    setChartLoading(true);
    try {
      // We only need the monthly aggregation from the backend now
      const r = await axios.get(`http://localhost:3001/api/admin/dashboard/upload-stats?view=monthly`);
      setChartData(r.data);
    } catch {}
    finally { setChartLoading(false); }
  }, []);

  // Re-fetch chart whenever the dashboard is open
  useEffect(() => {
    if (activeTab === 'dashboard') fetchChartData();
  }, [activeTab, fetchChartData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ep = activeTab === 'ebook-editions' ? 'ebook-editions'
        : activeTab === 'team' ? 'team' : activeTab;
      const params = { page, limit: limit, search: dSearch };
      if (activeTab === 'songs') params.trash = showTrash ? '1' : '0';
      const r = await axios.get(`${API}/${ep}`, { params });
      if (r.data.rows !== undefined) {
        setData(r.data.rows);
        setTotal(r.data.total);
      } else {
        setData(Array.isArray(r.data) ? r.data : []);
        setTotal(Array.isArray(r.data) ? r.data.length : 0);
      }
    } catch { setData([]); setTotal(0); }
    finally { setLoading(false); }
  };

  const refresh = () => { fetchData(); fetchDashStats(); };

  /* ── form helpers ── */
  const set = (k, v) => setFd(p => ({ ...p, [k]: v }));

  const openCreate = () => {
    setEditingItem(null);
    setFd({ status: 1 });
    setFmBookId(''); setFmCatId('');
    setSongRows([{ fid: '', fname: '' }]);
    setModalOpen(true);
  };

  const openEdit = item => {
    setEditingItem(item);
    setFd({ ...item });
    if (activeTab === 'categories') {
      setFmBookId(String(item.book_id || ''));
    }
    if (activeTab === 'subcategories') {
      setFmBookId(String(item.book_id || ''));
      setTimeout(() => setFmCatId(String(item.main_category_id || '')), 120);
    }
    if (activeTab === 'songs') {
      // Songs use flat sub-category dropdown — no book/category cascade needed
      setSongRows([{ fid: String(item.fid || ''), fname: item.fname || '' }]);
    }
    if (activeTab === 'ebook-editions') {
      setFmBookId(String(item.book_id || ''));
    }
    setModalOpen(true);
  };

  const rowId = item =>
    activeTab === 'books'      ? item.book_id
    : activeTab === 'categories' ? item.cid
    : item.id;

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const ep = activeTab === 'ebook-editions' ? 'ebook-editions'
        : activeTab === 'team' ? 'team' : activeTab;

      if (activeTab === 'songs') {
        // Songs always use FormData (image upload possible)
        const formData = new FormData();
        formData.append('cid',    fd.cid    ?? '');
        formData.append('status', fd.status ?? 1);
        if (fd.imageFile) formData.append('image', fd.imageFile);

        if (editingItem) {
          // Edit: update single row only
          const row = songRows[0] || { fid: '', fname: '' };
          formData.append('fid',   row.fid   ?? '');
          formData.append('fname', row.fname  ?? '');
          await axios.put(`${API}/songs/${rowId(editingItem)}`, formData,
            { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
          // Create: each songRow → separate DB record sharing the same image
          songRows.forEach(row => {
            formData.append('fid',   row.fid   ?? '');
            formData.append('fname', row.fname  ?? '');
          });
          await axios.post(`${API}/songs`, formData,
            { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      } else {
        // All other tabs
        let payload;
        if (fd.imageFile) {
          payload = new FormData();
          Object.entries(fd).forEach(([k, v]) => { if (k !== 'imageFile') payload.append(k, v ?? ''); });
          payload.append('image', fd.imageFile);
        } else {
          payload = { ...fd };
          delete payload.imageFile;
        }
        const cfg = payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        if (editingItem) {
          await axios.put(`${API}/${ep}/${rowId(editingItem)}`, payload, cfg);
        } else {
          await axios.post(`${API}/${ep}`, payload, cfg);
        }
      }

      setModalOpen(false); setEditingItem(null); setFd({ status: 1 });
      setSongRows([{ fid: '', fname: '' }]);
      refresh();
    } catch (err) { console.error('Submit error:', err); }
  };

  const handleDelete = async (id, label = 'Delete this record?') => {
    if (!window.confirm(label)) return;
    const ep = activeTab === 'ebook-editions' ? 'ebook-editions'
      : activeTab === 'team' ? 'team' : activeTab;
    try { await axios.delete(`${API}/${ep}/${id}`); refresh(); } catch {}
  };

  const handleTrashSong  = id => handleDelete(id, 'Move this folio to trash?');
  const handleRestoreSong = async id => {
    try { await axios.put(`${API}/songs/${id}/restore`); refresh(); } catch {}
  };
  const handlePurgeSong = async id => {
    if (!window.confirm('Permanently delete this record? This cannot be undone.')) return;
    try { await axios.delete(`${API}/songs/${id}/purge`); refresh(); } catch {}
  };

  const markContactRead = async id => {
    try { await axios.put(`${API}/contacts/${id}/read`); refresh(); } catch {}
  };

  /* ── active tab meta ── */
  const activeMeta = tabs.find(t => t.id === activeTab) || tabs[0];

  /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div className="h-screen overflow-hidden bg-[#F0F2F5] flex">

      {/* ── Sidebar ── */}
      <aside className="w-72 bg-maroon text-white flex flex-col shadow-2xl z-20 shrink-0">
        <div className="p-7 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center font-black text-maroon text-sm">S</div>
            <div>
              <h1 className="font-cinzel text-lg font-bold tracking-widest text-gold leading-tight">SUVADI</h1>
              <p className="text-[9px] opacity-40 uppercase tracking-[0.2em]">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-2 text-[9px] text-white/25 uppercase tracking-[0.3em] font-bold">Management</p>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group
                ${activeTab === tab.id ? 'bg-white/12 text-gold' : 'text-white/50 hover:bg-white/6 hover:text-white'}`}>
              <div className="flex items-center gap-3">
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-gold' : 'text-white/30 group-hover:text-gold/50'}`} />
                <div className="text-left">
                  <div className="text-[11px] font-bold font-cinzel tracking-wide">{tab.name}</div>
                  <div className="text-[9px] tamil-text opacity-35">{tab.label}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeTab === tab.id && <ChevronRight className="w-3.5 h-3.5 text-gold/60" />}
              </div>
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-white/5 bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center text-gold border border-gold/20 font-black text-xs">AD</div>
            <div>
              <div className="text-[11px] font-bold">Administrator</div>
              <div className="text-[9px] opacity-35 uppercase tracking-tighter">System Access Level 5</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto min-w-0 flex flex-col">

        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-stone/8 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
          <h2 className="text-xl font-cinzel font-black text-maroon flex items-center gap-3">
            <activeMeta.icon className="w-5 h-5 text-gold" />
            {activeMeta.name}
            <span className="text-stone/25 font-light mx-1">/</span>
            <span className="text-stone/35 text-sm uppercase tracking-widest font-sans">{activeMeta.label}</span>
          </h2>
          <div className="flex items-center gap-3">
            {activeTab === 'songs' && (
              <button onClick={() => { setShowTrash(v => !v); setPage(1); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all
                  ${showTrash ? 'bg-red-500 text-white border-red-500' : 'border-stone/15 text-stone/40 hover:text-maroon hover:border-maroon/20'}`}>
                <Trash2 className="w-3.5 h-3.5" />
                {showTrash ? 'Trash View' : 'View Trash'}
                {!showTrash && dashStats?.trashed_songs > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{dashStats.trashed_songs}</span>
                )}
              </button>
            )}
            {activeTab !== 'dashboard' && !showTrash && (
              <button onClick={openCreate}
                className="flex items-center gap-2 bg-maroon text-white px-5 py-2.5 rounded-xl hover:bg-maroon-dark transition-all shadow-md shadow-maroon/15 hover:scale-105 active:scale-95">
                <Plus className="w-4 h-4" />
                <span className="font-bold text-[11px] uppercase tracking-widest">Add New</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-8 max-w-[1500px] w-full mx-auto flex-1 flex flex-col">

          {/* ══ DASHBOARD ══ */}
          {activeTab === 'dashboard' && (
            <div className="flex-1 flex flex-col gap-6">
              {/* ── Stat cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <StatCard label="Books / நூல்கள்"            value={dashStats?.books}           icon={Book}     color="maroon" />
                <StatCard label="Main Cat / முதல் பிரிவு"   value={dashStats?.main_categories}  icon={Layers}   color="gold" />
                <StatCard label="Sub-Cat / துணை பிரிவு"      value={dashStats?.sub_categories}   icon={Scroll}   color="blue" />
                <StatCard label="Manuscripts / பாடல்கள்"     value={dashStats?.songs}            icon={FileText} color="maroon"
                  sub={dashStats?.trashed_songs ? `${dashStats.trashed_songs} in trash` : null} />
                <StatCard label="Users / உள்நுழைவு"          value={dashStats?.users}            icon={Shield}   color="green" />
              </div>

              {/* ── Upload Statistics Chart ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone/5 overflow-hidden flex-1 flex flex-col">
                {/* Chart header with toggle */}
                <div className="px-6 py-4 border-b border-stone/8 flex items-center justify-between gap-4 flex-wrap shrink-0">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gold" />
                    <h3 className="font-cinzel font-black text-sm text-maroon">Upload Activity</h3>
                    <span className="text-[9px] text-stone/30 font-cinzel">/ பாடல் பதிவேற்றங்கள்</span>
                    {chartData && (
                      <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-full border border-emerald-100">
                        {chartData.total.toLocaleString()} total
                      </span>
                    )}
                  </div>
                  {/* Year toggle */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(() => {
                      if (!chartData || !chartData.data) return null;
                      const years = new Set(chartData.data.map(d => d.period.split('-')[0]));
                      const yearArr = ['all', ...Array.from(years).sort()];
                      return yearArr.map(y => (
                        <button
                          key={y}
                          onClick={() => setChartYear(y)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                            chartYear === y
                              ? 'bg-maroon text-white shadow-sm'
                              : 'bg-stone/5 text-stone/50 hover:bg-stone/10 hover:text-maroon'
                          }`}
                        >
                          {y === 'all' ? 'All' : y}
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                {/* Chart body */}
                <div className="px-6 pt-6 pb-6 flex-1 min-h-[300px]">
                  {chartLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
                        <span className="text-[11px] text-stone/40 font-cinzel italic">Loading chart data…</span>
                      </div>
                    </div>
                  ) : !chartData || chartData.data.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <FileText className="w-10 h-10 text-stone/15 mx-auto mb-3" />
                        <p className="text-sm text-stone/30 font-cinzel italic">No upload data available yet</p>
                      </div>
                    </div>
                  ) : (() => {
                    
                    let labels = [];
                    let plotData = [];

                    if (chartYear === 'all') {
                      labels = chartData.data.map(d => {
                        const [y, m] = d.period.split('-');
                        return new Date(+y, +m - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
                      });
                      plotData = chartData.data.map(d => d.count);
                    } else {
                      // Filter for specific year and pad with 0s for missing months
                      const yearData = chartData.data.filter(d => d.period.startsWith(chartYear));
                      for (let m = 1; m <= 12; m++) {
                        const monthStr = m.toString().padStart(2, '0');
                        const periodStr = `${chartYear}-${monthStr}`;
                        const match = yearData.find(d => d.period === periodStr);
                        labels.push(new Date(+chartYear, m - 1).toLocaleString('en-IN', { month: 'short' }));
                        plotData.push(match ? match.count : 0);
                      }
                    }

                    return (
                      <Bar
                        data={{
                          labels,
                          datasets: [{
                            label: 'Manuscripts Uploaded',
                            data: plotData,
                            backgroundColor: 'rgba(107,15,15,0.82)',
                            hoverBackgroundColor: 'rgba(107,15,15,1)',
                            borderColor: 'rgba(107,15,15,0)',
                            hoverBorderColor: '#C79A2B',
                            borderWidth: 0,
                            hoverBorderWidth: 2,
                            borderRadius: 5,
                            borderSkipped: false,
                            barPercentage: 0.7,
                            categoryPercentage: 0.8
                          }],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          animation: { duration: 500, easing: 'easeOutQuart' },
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: '#1A0505',
                              titleColor: '#C79A2B',
                              bodyColor: '#F5E6D3',
                              borderColor: '#C79A2B',
                              borderWidth: 1,
                              padding: 12,
                              cornerRadius: 10,
                              callbacks: {
                                title: items => items[0].label,
                                label: item => ` ${item.raw.toLocaleString()} manuscript${item.raw !== 1 ? 's' : ''} uploaded`,
                              },
                            },
                          },
                          scales: {
                            x: {
                              grid: { display: false },
                              border: { display: false },
                              ticks: {
                                color: '#9B7B6B',
                                font: { size: 10, family: 'Cinzel, serif' },
                                maxRotation: 0,
                                minRotation: 0,
                                autoSkip: true,
                                maxTicksLimit: 20,
                              },
                            },
                            y: {
                              beginAtZero: true,
                              border: { display: false },
                              grid: { color: 'rgba(107,15,15,0.06)', drawBorder: false },
                              ticks: {
                                color: '#9B7B6B',
                                font: { size: 10, family: 'Cinzel, serif' },
                                callback: val => val.toLocaleString(),
                              },
                            },
                          },
                        }}
                      />
                    );
                  })()}
                </div>

                {/* Footer verification strip */}
                {chartData && (
                  <div className="px-6 py-3 bg-stone/[0.025] border-t border-stone/5 flex items-center justify-between text-[10px] text-stone/35 shrink-0">
                    <span>Source: <code className="font-mono">sv_songs.upload_date</code> · DATE_TRUNC grouping · live PostgreSQL</span>
                    <span className="font-black text-emerald-600">
                      ✓ {chartData.data.reduce((s, d) => s + d.count, 0).toLocaleString()} / {chartData.total.toLocaleString()} total records
                    </span>
                  </div>
                )}
              </div>


              <div className="bg-white rounded-2xl shadow-sm border border-stone/5 px-6 py-4 flex items-center gap-3">
                <Database className="w-4 h-4 text-gold shrink-0" />
                <span className="text-[11px] font-bold text-maroon">PostgreSQL</span>
                <span className="text-[10px] text-stone/30">·</span>
                <span className="text-[10px] text-stone/40">suvadi database · 5 modules · {dashStats?.songs?.toLocaleString() || '6,026'} manuscripts</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Connected</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ CONTACTS ══ */}
          {activeTab === 'contacts' && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone/5 overflow-hidden">
              <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name, email, subject…" />
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone/[0.025]">
                    <tr>
                      <Th />
                      <Th>Name</Th>
                      <Th>Email</Th>
                      <Th>Subject</Th>
                      <Th>Date</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone/5">
                    {loading || !data.length
                      ? <EmptyRow cols={6} loading={loading} msg="No contact messages found." />
                      : data.map(item => (
                        <tr key={item.id} className={`group hover:bg-ivory transition-colors ${!item.is_read ? 'bg-gold/[0.015]' : ''}`}>
                          <Td><div className={`w-2 h-2 rounded-full ${!item.is_read ? 'bg-gold' : 'bg-stone/15'}`} /></Td>
                          <Td><span className="font-bold text-xs text-maroon">{item.name}</span></Td>
                          <Td><span className="text-xs text-stone/50">{item.email}</span></Td>
                          <Td><span className="text-xs text-stone/60 max-w-xs truncate block">{item.subject || '—'}</span></Td>
                          <Td><span className="text-[10px] text-stone/35">{new Date(item.created_at).toLocaleString()}</span></Td>
                          <Td className="text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => setContactDetail(item)}
                                className="p-2 bg-stone/5 text-stone/50 rounded-lg hover:bg-maroon hover:text-white transition-all" title="View message">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {!item.is_read && (
                                <button onClick={() => markContactRead(item.id)}
                                  className="p-2 bg-gold/10 text-gold rounded-lg hover:bg-gold hover:text-maroon transition-all" title="Mark read">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => handleDelete(item.id, 'Delete this message?')}
                                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </Td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <Pager page={page} totalPages={totalPages} onPage={setPage} total={total} limit={limit} />
            </div>
          )}

          {/* ══ ALL OTHER TABS ══ */}
          {activeTab !== 'dashboard' && activeTab !== 'contacts' && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone/5 overflow-hidden">
              <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }}
                placeholder={activeTab === 'songs'
                  ? 'Search by ID, sub-category name (துணை பிரிவு), or description (பாடல்கள்)…'
                  : `Search ${activeMeta.name.toLowerCase()}…`}>
                <div className="ml-auto text-[10px] text-stone/35 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  {fmt(total)} records
                  {showTrash && <span className="ml-2 text-red-400 flex items-center gap-1"><Trash2 className="w-3 h-3"/>Trash View</span>}
                </div>
              </SearchBar>

              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '65vh' }}>
                <table className="w-full text-left">
                  <thead className="bg-white sticky top-0 z-10">
                    <tr>
                      <Th>ID</Th>
                      {/* Books */}
                      {activeTab === 'books' && <Th>Book Title (Tamil) / நூல் தலைப்பு</Th>}
                      {/* Categories */}
                      {activeTab === 'categories' && <>
                        <Th>பிரிவு பெயர்</Th>
                        <Th>நூல் பெயர்</Th>
                      </>}
                      {/* Sub-Categories */}
                      {activeTab === 'subcategories' && <>
                        <Th>நூல் பெயர்</Th>
                        <Th>பிரிவு பெயர்</Th>
                        <Th>துணை பிரிவு பெயர்</Th>
                      </>}
                      {/* Manuscripts */}
                      {activeTab === 'songs' && <>
                        <Th>துணை பிரிவு பெயர் (Sub Category Name)</Th>
                        <Th>பாடல்கள்</Th>
                      </>}
                      {/* Ebook Editions */}
                      {activeTab === 'ebook-editions' && <>
                        <Th>Edition Title / மின்நூல் தலைப்பு</Th>
                        <Th>Book</Th>
                        <Th>Local PDF</Th>
                        <Th>External PDF</Th>
                      </>}
                      {/* Team */}
                      {activeTab === 'team' && <>
                        <Th>Name</Th>
                        <Th>Role</Th>
                        <Th>Order</Th>
                      </>}
                      {/* Users */}
                      {activeTab === 'users' && <>
                        <Th>Username</Th>
                        <Th>Email</Th>
                        <Th>Role</Th>
                        <Th>Joined</Th>
                      </>}
                      <Th>Status</Th>
                      {(activeTab === 'songs' || activeTab === 'subcategories' || activeTab === 'categories') && <Th>Created At</Th>}
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone/5">
                    {loading || !data.length
                      ? <EmptyRow cols={12} loading={loading} />
                      : data.map(item => {
                          const id = rowId(item);
                          return (
                            <tr key={id} className="group hover:bg-ivory transition-colors">
                              <Td><span className="text-[10px] font-mono text-bronze/70">#{id}</span></Td>

                              {/* Books */}
                              {activeTab === 'books' && (
                                <Td><span className="tamil-text font-bold text-maroon">{item.name}</span></Td>
                              )}

                              {/* Categories */}
                              {activeTab === 'categories' && <>
                                <Td><span className="tamil-text font-bold text-maroon">{item.cname}</span></Td>
                                <Td><span className="tamil-text font-semibold text-stone/70">{item.book_name}</span></Td>
                              </>}

                              {/* Sub-Categories */}
                              {activeTab === 'subcategories' && <>
                                <Td><span className="tamil-text font-semibold text-stone/70">{item.book_name}</span></Td>
                                <Td><span className="tamil-text font-semibold text-stone/70">{item.category_name}</span></Td>
                                <Td><span className="tamil-text font-bold text-maroon">{item.sub_cat_name}</span></Td>
                              </>}

                              {/* Manuscripts */}
                              {activeTab === 'songs' && <>
                                <Td><span className="text-[11px] font-semibold text-maroon/80">{item.sub_cat_name || '—'}</span></Td>
                                <Td>
                                  <span className="tamil-text text-[11px] text-stone-600 max-w-sm truncate block" title={stripTags(item.fname)}>
                                    {stripTags(item.fname) || '—'}
                                  </span>
                                </Td>
                              </>}

                              {/* Ebook Editions */}
                              {activeTab === 'ebook-editions' && <>
                                <Td>
                                  <span className="tamil-text font-bold text-maroon text-sm max-w-xs truncate block">{item.title_tamil}</span>
                                </Td>
                                <Td><span className="text-[11px] text-stone/40 font-bold italic">{item.book_name}</span></Td>
                                <Td>
                                  {item.local_pdf_url
                                    ? <a href={`${BASE}/${item.local_pdf_url.replace(/^\//, '')}`} target="_blank" rel="noopener noreferrer"
                                        className="text-[10px] font-mono text-blue-500 hover:underline flex items-center gap-1">
                                        <FileIcon className="w-3 h-3" />
                                        {item.local_pdf_url.split('/').pop()}
                                      </a>
                                    : <span className="text-[10px] text-stone/30">—</span>
                                  }
                                  {item.is_missing && (
                                    <div className="text-[8px] text-red-400 flex items-center gap-1 mt-0.5 font-bold">
                                      <div className="w-1 h-1 rounded-full bg-red-400" /> File missing
                                    </div>
                                  )}
                                </Td>
                                <Td>
                                  {item.pdf_url
                                    ? <a href={item.pdf_url} target="_blank" rel="noopener noreferrer"
                                        className="text-[10px] text-stone/40 hover:text-blue-500 flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" /> External
                                      </a>
                                    : <span className="text-[10px] text-stone/25">—</span>
                                  }
                                </Td>
                              </>}

                              {/* Team */}
                              {activeTab === 'team' && <>
                                <Td><span className="font-bold text-maroon">{item.name}</span></Td>
                                <Td>
                                  <div className="text-[11px]">
                                    <div className="text-stone/60">{item.role_english}</div>
                                    <div className="tamil-text text-[10px] text-stone/40">{item.role_tamil}</div>
                                  </div>
                                </Td>
                                <Td><span className="font-cinzel text-[11px] text-bronze">{item.display_order}</span></Td>
                              </>}

                              {/* Users */}
                              {activeTab === 'users' && <>
                                <Td><span className="font-bold text-maroon">{item.username}</span></Td>
                                <Td><span className="text-xs text-stone/50">{item.email}</span></Td>
                                <Td>
                                  <span className="px-2.5 py-1 bg-maroon/5 text-maroon text-[9px] font-black uppercase rounded-full">{item.role}</span>
                                </Td>
                                <Td><span className="text-[10px] text-stone/35">{new Date(item.created_at).toLocaleDateString()}</span></Td>
                              </>}

                              <Td><StatusPill value={item.status} /></Td>

                              {activeTab === 'songs' && (
                                <Td>
                                  <span className="text-[10px] text-stone-500 tabular-nums">
                                    {item.upload_date 
                                      ? new Date(item.upload_date.replace(' ', 'T')).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) 
                                      : '—'}
                                  </span>
                                </Td>
                              )}
                              
                              {(activeTab === 'subcategories' || activeTab === 'categories') && (
                                <Td>
                                  <span className="text-[10.5px] font-mono text-stone-500 tabular-nums">
                                    {item.formatted_created_at || '—'}
                                  </span>
                                </Td>
                              )}

                              {/* Actions column for all tabs including songs */}
                              <Td className="text-right">
                                {activeTab === 'songs' ? (
                                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => openEdit(item)}
                                      className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all" title="Edit">
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    {showTrash ? (
                                      <>
                                        <button onClick={() => handleRestoreSong(id)}
                                          className="p-2 bg-emerald-50 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all" title="Restore">
                                          <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handlePurgeSong(id)}
                                          className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all" title="Permanently delete">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <button onClick={() => handleTrashSong(id)}
                                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all" title="Move to trash">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <ActionBtns
                                    onEdit={() => openEdit(item)}
                                    onDelete={() => handleDelete(id)}
                                  />
                                )}
                              </Td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
              <Pager page={page} totalPages={totalPages} onPage={setPage} total={total} limit={limit} />
            </div>
          )}

        </div>
      </main>

      {/* ══ CONTACT DETAIL MODAL ══ */}
      <AnimatePresence>
        {contactDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setContactDetail(null)} className="absolute inset-0 bg-ink/75 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden">
              <div className="bg-maroon px-7 py-5 text-white flex items-center justify-between">
                <div>
                  <p className="font-cinzel font-bold text-lg">{contactDetail.name}</p>
                  <p className="text-[10px] opacity-40">{contactDetail.email} · {new Date(contactDetail.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => setContactDetail(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-7 space-y-4">
                {contactDetail.subject && (
                  <div>
                    <p className="text-[10px] font-black text-stone/35 uppercase tracking-widest mb-1">Subject</p>
                    <p className="text-sm font-bold text-maroon">{contactDetail.subject}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-black text-stone/35 uppercase tracking-widest mb-2">Message</p>
                  <p className="text-sm text-stone/70 leading-relaxed whitespace-pre-wrap">{contactDetail.message}</p>
                </div>
                <div className="flex gap-3 pt-2">
                  {!contactDetail.is_read && (
                    <button onClick={() => { markContactRead(contactDetail.id); setContactDetail(p => ({ ...p, is_read: true })); }}
                      className="flex-1 bg-gold text-maroon py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-gold/80 transition-all">
                      Mark as Read
                    </button>
                  )}
                  <button onClick={() => setContactDetail(null)}
                    className="flex-1 bg-stone/5 text-stone/40 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-stone/10 transition-all">
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ EDIT / CREATE MODAL ══ */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)} className="absolute inset-0 bg-ink/75 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-maroon px-8 py-5 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-cinzel font-bold tracking-widest">
                    {editingItem ? 'Edit Record' : 'Create New Entry'}
                  </h3>
                  <p className="text-[10px] opacity-35 uppercase tracking-widest mt-0.5">
                    {activeMeta.name} · {activeMeta.label}
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">

                {/* ─ BOOKS ─ */}
                {activeTab === 'books' && (
                  <Field label="Book Title / நூல் தலைப்பு">
                    <input required type="text" value={fd.name || ''} onChange={e => set('name', e.target.value)}
                      className={TamilInputCls} placeholder="நூல் தலைப்பு உள்ளிடவும்…" />
                  </Field>
                )}

                {/* ─ CATEGORIES ─ */}
                {activeTab === 'categories' && (
                  <div className="space-y-5">
                    <Field label="Parent Book / நூல்">
                      <BookSelect required books={books}
                        value={fmBookId || fd.book_id}
                        onChange={v => { setFmBookId(v); set('book_id', v); }} />
                    </Field>
                    <Field label="Category Name / முதல் பிரிவு பெயர்">
                      <input required type="text" value={fd.cname || ''} onChange={e => set('cname', e.target.value)}
                        className={TamilInputCls} placeholder="பிரிவு பெயர்…" />
                    </Field>
                  </div>
                )}

                {/* ─ SUB-CATEGORIES ─ */}
                {activeTab === 'subcategories' && (
                  <div className="space-y-5">
                    <Field label="Parent Book / நூல்">
                      <BookSelect required books={books}
                        value={fmBookId || fd.book_id}
                        onChange={v => { setFmBookId(v); set('book_id', v); }} />
                    </Field>
                    <Field label="Parent Category / முதல் பிரிவு">
                      <CatSelect required cats={cats}
                        value={fmCatId || fd.main_category_id}
                        onChange={v => { setFmCatId(v); set('main_category_id', v); }}
                        placeholder={fmBookId ? '— Select Category —' : '— Select a book first —'} />
                    </Field>
                    <Field label="Sub-Category Name / துணைப் பிரிவு பெயர்">
                      <input required type="text" value={fd.sub_cat_name || ''} onChange={e => set('sub_cat_name', e.target.value)}
                        className={TamilInputCls} placeholder="துணைப் பிரிவு பெயர்…" />
                    </Field>
                  </div>
                )}

                {/* ─ MANUSCRIPTS / SONGS ─ */}
                {activeTab === 'songs' && (
                  <div className="space-y-6">

                    {/* 1. கோப்பினை தேர்ந்தெடு / Select a File */}
                    <Field label="கோப்பினை தேர்ந்தெடு / Select a File">
                      <input type="file" accept="image/*"
                        onChange={e => set('imageFile', e.target.files[0])}
                        className="w-full text-xs text-stone/50 cursor-pointer
                          file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0
                          file:text-xs file:font-black file:uppercase file:tracking-wide
                          file:bg-maroon/8 file:text-maroon hover:file:bg-maroon/15 file:transition-all" />
                      {editingItem?.filename && (
                        <p className="text-[10px] text-stone/40 mt-1.5 flex items-center gap-1.5">
                          <FileIcon className="w-3 h-3 shrink-0" />
                          Current: <span className="font-mono text-maroon/60">{editingItem.filename}</span>
                          <span className="text-stone/30">— leave blank to keep</span>
                        </p>
                      )}
                    </Field>

                    {/* File Details section */}
                    <div className="border border-stone/10 rounded-xl p-5 space-y-4 bg-stone/[0.015]">
                      <p className="text-[10px] font-black text-maroon/50 uppercase tracking-[0.2em]">
                        கோப்பின் தகவல்கள் / File Details
                      </p>

                      {/* 2. துணை பிரிவு / Sub Category — flat dropdown (all sub-categories) */}
                      <Field label="துணை பிரிவு / Sub Category">
                        <select required value={fd.cid || ''}
                          onChange={e => set('cid', e.target.value)}
                          className={InputCls + ' font-bold'}>
                          <option value="">--ஒரு பிரிவினை தேர்வு செய்--</option>
                          {allSubcats.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    {/* 3+4. Song rows — each row = பாடல் எண் + முழுப்பாடல்கள் */}
                    {songRows.map((row, i) => (
                      <div key={i} className={`space-y-4 ${i > 0 ? 'border-t-2 border-dashed border-stone/10 pt-5' : ''}`}>
                        {i > 0 && (
                          <p className="text-[10px] font-black text-gold/70 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[9px]">{i + 1}</span>
                            குறிப்பு / Note {i + 1}
                          </p>
                        )}
                        <Field label="பாடல் எண் / Song No.">
                          <input required type="text" value={row.fid}
                            onChange={e => setSongRows(prev =>
                              prev.map((r, idx) => idx === i ? { ...r, fid: e.target.value } : r)
                            )}
                            className={InputCls}
                            placeholder="பாடல் எண் உள்ளிடவும்…" />
                        </Field>
                        <Field label="முழுப்பாடல்கள் / Full Song">
                          <textarea required rows={4} value={row.fname}
                            onChange={e => setSongRows(prev =>
                              prev.map((r, idx) => idx === i ? { ...r, fname: e.target.value } : r)
                            )}
                            className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 tamil-body text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none resize-y text-sm"
                            placeholder="முழுப்பாடல்களை இங்கே உள்ளிடவும்…" />
                        </Field>
                      </div>
                    ))}

                    {/* 5. புதிய குறிப்பு சேர்க்க/நீக்க — only on Add New */}
                    {!editingItem && (
                      <div className="flex flex-wrap items-center gap-3 py-3 border-t border-stone/8">
                        <span className="text-[10px] font-black text-stone/40 uppercase tracking-widest whitespace-nowrap">
                          புதிய குறிப்பு சேர்க்க/நீக்க:
                        </span>
                        <button type="button"
                          disabled={songRows.length >= 10}
                          onClick={() => setSongRows(prev => [...prev, { fid: '', fname: '' }])}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-lg text-[11px] font-black hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                          <Plus className="w-3.5 h-3.5" /> சேர்
                        </button>
                        <button type="button"
                          disabled={songRows.length <= 1}
                          onClick={() => setSongRows(prev => prev.slice(0, -1))}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg text-[11px] font-black hover:bg-red-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                          <X className="w-3.5 h-3.5" /> நீக்கு
                        </button>
                        {songRows.length > 1 && (
                          <span className="ml-auto text-[10px] text-stone/35 font-bold">
                            {songRows.length} பாடல்கள் சேமிக்கப்படும் / {songRows.length} rows will be saved
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ─ EBOOK EDITIONS ─ */}
                {activeTab === 'ebook-editions' && (
                  <div className="space-y-5">
                    <Field label="Parent Book / நூல்">
                      <BookSelect required books={books}
                        value={fmBookId || fd.book_id}
                        onChange={v => { setFmBookId(v); set('book_id', v); }} />
                    </Field>
                    <Field label="Edition Title / மின்நூல் தலைப்பு (Tamil)">
                      <input required type="text" value={fd.title_tamil || ''} onChange={e => set('title_tamil', e.target.value)}
                        className={TamilInputCls} placeholder="மின்நூல் தலைப்பு…" />
                    </Field>
                    <Field label="Local PDF Path" hint="Relative path from project root, e.g. storage/pdfs/book.pdf">
                      <input type="text" value={fd.local_pdf_url || ''} onChange={e => set('local_pdf_url', e.target.value)}
                        className={InputCls} placeholder="storage/pdfs/…" />
                    </Field>
                    <Field label="External PDF URL (optional)">
                      <input type="url" value={fd.pdf_url || ''} onChange={e => set('pdf_url', e.target.value)}
                        className={InputCls} placeholder="https://…" />
                    </Field>
                  </div>
                )}

                {/* ─ TEAM MEMBERS ─ */}
                {activeTab === 'team' && (
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <Field label="Full Name">
                        <input required type="text" value={fd.name || ''} onChange={e => set('name', e.target.value)}
                          className={InputCls + ' font-bold'} />
                      </Field>
                    </div>
                    <Field label="Role (English)">
                      <input type="text" value={fd.role_english || ''} onChange={e => set('role_english', e.target.value)}
                        className={InputCls} />
                    </Field>
                    <Field label="பொறுப்பு (Tamil)">
                      <input type="text" value={fd.role_tamil || ''} onChange={e => set('role_tamil', e.target.value)}
                        className={TamilInputCls} />
                    </Field>
                    <Field label="Photo URL">
                      <input type="text" value={fd.photo_url || ''} onChange={e => set('photo_url', e.target.value)}
                        className={InputCls} placeholder="/images/team/name.jpg" />
                    </Field>
                    <Field label="Display Order">
                      <input type="number" min={0} value={fd.display_order ?? 0} onChange={e => set('display_order', e.target.value)}
                        className={InputCls} />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Bio / Description">
                        <textarea rows={3} value={fd.bio || ''} onChange={e => set('bio', e.target.value)}
                          className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-maroon/20 focus:outline-none resize-none" />
                      </Field>
                    </div>
                  </div>
                )}

                {/* ─ USERS ─ */}
                {activeTab === 'users' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <Field label="Username / பயனர் பெயர்">
                        <input required type="text" value={fd.username || ''} onChange={e => set('username', e.target.value)}
                          className={InputCls + ' font-bold'} />
                      </Field>
                      <Field label="Password / கடவுச்சொல்">
                        <input type="password" value={fd.password || ''} onChange={e => set('password', e.target.value)}
                          className={InputCls}
                          placeholder={editingItem ? '(leave blank to keep current)' : ''} />
                      </Field>
                    </div>
                    <Field label="Email Address / மின்னஞ்சல்">
                      <input type="email" value={fd.email || ''} onChange={e => set('email', e.target.value)}
                        className={InputCls} />
                    </Field>
                    <Field label="Role / பதவி">
                      <select value={fd.role || 'admin'} onChange={e => set('role', e.target.value)}
                        className={InputCls + ' font-bold'}>
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </Field>
                  </div>
                )}

                {/* Status + submit */}
                <div className="pt-2 border-t border-stone/8 flex items-center gap-4">
                  <StatusToggle value={fd.status} onChange={v => set('status', v)} />
                  <div className="flex gap-3 flex-1">
                    <button type="submit"
                      className="flex-1 bg-maroon text-white py-3.5 rounded-xl font-black uppercase tracking-widest hover:bg-maroon-dark transition-all shadow-lg shadow-maroon/20 flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      {editingItem ? 'Save Updates' : 'Create Record'}
                    </button>
                    <button type="button" onClick={() => setModalOpen(false)}
                      className="flex-1 bg-stone/5 text-stone/40 py-3.5 rounded-xl font-black uppercase tracking-widest hover:bg-stone/10 transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPortal;
