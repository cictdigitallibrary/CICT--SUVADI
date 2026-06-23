import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit, Trash2, Save, X, Book, Layers, FileText, Users,
  ChevronRight, LayoutDashboard, Search, Upload, Mail, UserCheck,
  BookOpen, Library, MessageSquare, Eye, EyeOff, RefreshCw,
  TrendingUp, Database, Scroll, Shield, ChevronDown,
} from 'lucide-react';

const API = 'http://localhost:3001/api/admin';
const BASE = 'http://localhost:3001';

/* ─── helpers ─── */
const fmt = n => Number(n || 0).toLocaleString();

/* ─── sub-components ─── */

// Stat card for the dashboard
const StatCard = ({ label, value, icon: Icon, color = 'maroon', sub }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-stone/5 p-6 flex items-center justify-between group hover:border-gold/30 hover:shadow-md transition-all">
    <div>
      <div className="text-[10px] text-stone/40 font-bold uppercase tracking-widest mb-1">{label}</div>
      <div className="text-3xl font-black text-maroon tabular-nums">{fmt(value)}</div>
      {sub && <div className="text-[10px] text-stone/30 mt-1">{sub}</div>}
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all
      ${color === 'gold' ? 'bg-gold/10 text-gold group-hover:bg-gold group-hover:text-maroon'
        : color === 'green' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
        : color === 'blue' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
        : color === 'orange' ? 'bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white'
        : 'bg-maroon/5 text-maroon group-hover:bg-maroon group-hover:text-white'}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

// Cascade dropdown: Book → Category
const BookSelect = ({ value, onChange, books, placeholder = '— Select Book —', required }) => (
  <select
    required={required}
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 text-sm text-maroon font-bold focus:ring-2 focus:ring-maroon/20 focus:outline-none"
  >
    <option value="">{placeholder}</option>
    {books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
  </select>
);

const CategorySelect = ({ value, onChange, categories, placeholder = '— Select Category —', required }) => (
  <select
    required={required}
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 text-sm text-maroon font-bold focus:ring-2 focus:ring-maroon/20 focus:outline-none"
  >
    <option value="">{placeholder}</option>
    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
  </select>
);

const SubCatSelect = ({ value, onChange, subcats, placeholder = '— Select Sub-Category —', required }) => (
  <select
    required={required}
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 text-sm text-maroon font-bold focus:ring-2 focus:ring-maroon/20 focus:outline-none"
  >
    <option value="">{placeholder}</option>
    {subcats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
  </select>
);

// Status toggle pill
const StatusToggle = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(value ? 0 : 1)}
    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all
      ${value ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'}`}
  >
    <div className={`w-2 h-2 rounded-full ${value ? 'bg-emerald-500' : 'bg-red-500'}`} />
    {value ? 'Active' : 'Disabled'}
  </button>
);

// Form field wrapper
const Field = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-2">{label}</label>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════
   Main Admin Portal
   ═══════════════════════════════════════════════════════ */
const AdminPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ status: 1 });
  const [dashStats, setDashStats] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterText, setFilterText] = useState('');

  // Dropdown option lists
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcats, setSubcats] = useState([]);

  // Cascade state for forms
  const [formBookId, setFormBookId] = useState('');
  const [formCatId, setFormCatId] = useState('');

  const tabs = [
    { id: 'dashboard',       name: 'Dashboard',       icon: LayoutDashboard, label: 'கட்டுப்பாடு' },
    { id: 'books',           name: 'Books',           icon: Book,            label: 'நூல்கள்' },
    { id: 'categories',      name: 'Categories',      icon: Layers,          label: 'முதல் பிரிவு' },
    { id: 'subcategories',   name: 'Sub-Categories',  icon: Scroll,          label: 'துணைப் பிரிவு' },
    { id: 'songs',           name: 'Manuscripts',     icon: FileText,        label: 'பாடல்கள்' },
    { id: 'ebook-editions',  name: 'Ebook Editions',  icon: BookOpen,        label: 'மின்நூல்' },
    { id: 'contacts',        name: 'Contacts',        icon: MessageSquare,   label: 'தொடர்பு' },
    { id: 'team',            name: 'Team Members',    icon: UserCheck,       label: 'குழுவினர்' },
    { id: 'users',           name: 'Users',           icon: Shield,          label: 'பயனர்கள்' },
  ];

  // ── fetch selects ───────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    try { const r = await axios.get(`${API}/books/select`); setBooks(r.data); } catch {}
  }, []);

  const fetchCategories = useCallback(async (bookId) => {
    try {
      const url = bookId ? `${API}/categories/select?book_id=${bookId}` : `${API}/categories/select`;
      const r = await axios.get(url); setCategories(r.data);
    } catch {}
  }, []);

  const fetchSubcats = useCallback(async (catId) => {
    try {
      const url = catId ? `${API}/subcategories/select?category_id=${catId}` : `${API}/subcategories/select`;
      const r = await axios.get(url); setSubcats(r.data);
    } catch {}
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  // Cascade: when formBookId changes → refresh categories
  useEffect(() => {
    if (formBookId) { fetchCategories(formBookId); setFormCatId(''); setSubcats([]); }
    else { setCategories([]); setFormCatId(''); setSubcats([]); }
  }, [formBookId, fetchCategories]);

  // Cascade: when formCatId changes → refresh subcats
  useEffect(() => {
    if (formCatId) fetchSubcats(formCatId);
    else setSubcats([]);
  }, [formCatId, fetchSubcats]);

  // ── data fetching ───────────────────────────────────────
  useEffect(() => { setPage(1); setFilterText(''); }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'dashboard') fetchData();
    else fetchDashStats();
  }, [activeTab, page]);

  const fetchDashStats = async () => {
    try {
      const r = await axios.get(`${API}/dashboard-stats`);
      setDashStats(r.data);
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'ebook-editions' ? 'ebook-editions'
        : activeTab === 'team' ? 'team'
        : activeTab;
      const r = await axios.get(`${API}/${endpoint}?page=${page}&limit=50`);
      if (r.data.rows) {
        setData(r.data.rows);
        setTotalPages(Math.ceil(r.data.total / 50));
      } else {
        setData(Array.isArray(r.data) ? r.data : []);
        setTotalPages(1);
      }
    } catch { setData([]); }
    finally { setLoading(false); }
  };

  // ── client-side filter ──────────────────────────────────
  const filteredData = useMemo(() => {
    if (!filterText.trim()) return data;
    const q = filterText.toLowerCase();
    return data.filter(item =>
      Object.values(item).some(v => String(v).toLowerCase().includes(q))
    );
  }, [data, filterText]);

  // ── form helpers ────────────────────────────────────────
  const openCreate = () => {
    setEditingItem(null);
    setFormData({ status: 1 });
    setFormBookId('');
    setFormCatId('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    const fd = { ...item };
    setFormData(fd);
    // Pre-populate cascade for forms that need it
    if (activeTab === 'categories') {
      setFormBookId(String(item.book_id || ''));
    }
    if (activeTab === 'subcategories') {
      setFormBookId(String(item.book_id || ''));
      setTimeout(() => setFormCatId(String(item.main_category_id || '')), 100);
    }
    if (activeTab === 'songs') {
      setFormBookId(String(item.book_id || ''));
      setTimeout(() => setFormCatId(String(item.main_category_id || '')), 100);
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = activeTab === 'ebook-editions' ? 'ebook-editions'
        : activeTab === 'team' ? 'team'
        : activeTab;

      let payload;
      if (activeTab === 'songs' && formData.imageFile) {
        payload = new FormData();
        Object.entries(formData).forEach(([k, v]) => {
          if (k !== 'imageFile') payload.append(k, v ?? '');
        });
        payload.append('image', formData.imageFile);
      } else {
        payload = { ...formData };
        delete payload.imageFile;
      }

      const isForm = payload instanceof FormData;
      const config = isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};

      if (editingItem) {
        const id = activeTab === 'books' ? editingItem.book_id
          : activeTab === 'categories' ? editingItem.cid
          : editingItem.id;
        await axios.put(`${API}/${endpoint}/${id}`, payload, config);
      } else {
        await axios.post(`${API}/${endpoint}`, payload, config);
      }
      setModalOpen(false);
      setEditingItem(null);
      setFormData({ status: 1 });
      fetchData();
      fetchDashStats();
    } catch (e) { console.error('Submit error:', e); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      const endpoint = activeTab === 'ebook-editions' ? 'ebook-editions'
        : activeTab === 'team' ? 'team'
        : activeTab;
      await axios.delete(`${API}/${endpoint}/${id}`);
      fetchData();
      fetchDashStats();
    } catch (e) { console.error(e); }
  };

  const markContactRead = async (id) => {
    try {
      await axios.put(`${API}/contacts/${id}/read`);
      fetchData();
      fetchDashStats();
    } catch (e) { console.error(e); }
  };

  const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  // ── render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F0F2F5] flex">

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

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[9px] text-white/25 uppercase tracking-[0.3em] font-bold">Management</div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group
                ${activeTab === tab.id
                  ? 'bg-white/12 text-gold shadow-inner'
                  : 'text-white/50 hover:bg-white/6 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-gold' : 'text-white/30 group-hover:text-gold/50'}`} />
                <div className="text-left">
                  <div className="text-[11px] font-bold font-cinzel tracking-wide">{tab.name}</div>
                  <div className="text-[9px] tamil-text opacity-35">{tab.label}</div>
                </div>
              </div>
              {activeTab === tab.id && <ChevronRight className="w-3.5 h-3.5 text-gold/60" />}
              {/* Unread badge for contacts */}
              {tab.id === 'contacts' && dashStats?.unread_contacts > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ml-auto mr-1">
                  {dashStats.unread_contacts > 9 ? '9+' : dashStats.unread_contacts}
                </span>
              )}
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

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto min-w-0">

        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-stone/8 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-cinzel font-black text-maroon flex items-center gap-3">
            {React.createElement(tabs.find(t => t.id === activeTab)?.icon || LayoutDashboard, { className: 'w-5 h-5 text-gold' })}
            {tabs.find(t => t.id === activeTab)?.name}
            <span className="text-stone/30 mx-1 font-light">/</span>
            <span className="text-stone/35 text-sm uppercase tracking-widest font-sans">
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
          </h2>
          {activeTab !== 'dashboard' && activeTab !== 'contacts' && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-maroon text-white px-6 py-2.5 rounded-xl
                hover:bg-maroon-dark transition-all shadow-lg shadow-maroon/20 hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="font-bold text-[11px] uppercase tracking-widest">Add New</span>
            </button>
          )}
          {activeTab === 'dashboard' && (
            <button onClick={fetchDashStats}
              className="flex items-center gap-2 border border-maroon/20 text-maroon px-4 py-2 rounded-xl hover:bg-maroon/5 transition-all text-[11px] font-bold">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
        </header>

        <div className="p-8 max-w-[1400px] mx-auto">

          {/* ════════════════════ DASHBOARD ════════════════════ */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Stat grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
                <StatCard label="Books" value={dashStats?.books} icon={Book} color="maroon" />
                <StatCard label="Main Categories" value={dashStats?.main_categories} icon={Layers} color="gold" />
                <StatCard label="Sub-Categories" value={dashStats?.sub_categories} icon={Scroll} color="blue" />
                <StatCard label="Active Folios" value={dashStats?.songs} icon={FileText} color="maroon"
                  sub={dashStats?.trashed_songs ? `${dashStats.trashed_songs} in trash` : null} />
                <StatCard label="Ebook Editions" value={dashStats?.ebook_editions} icon={BookOpen} color="orange" />
                <StatCard label="Contact Messages" value={dashStats?.contacts} icon={MessageSquare} color="green"
                  sub={dashStats?.unread_contacts ? `${dashStats.unread_contacts} unread` : 'All read'} />
                <StatCard label="Team Members" value={dashStats?.team_members} icon={UserCheck} color="blue" />
                <StatCard label="Admin Users" value={1} icon={Shield} color="maroon" />
              </div>

              {/* Database overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Recent contacts */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone/5 overflow-hidden">
                  <div className="px-6 py-4 border-b border-stone/8 flex items-center justify-between">
                    <h3 className="font-cinzel font-black text-sm text-maroon flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gold" /> Recent Messages
                    </h3>
                    <button onClick={() => setActiveTab('contacts')}
                      className="text-[10px] text-gold font-bold uppercase tracking-wider hover:underline">
                      View All →
                    </button>
                  </div>
                  <div className="divide-y divide-stone/5">
                    {dashStats?.recent_contacts?.length === 0 ? (
                      <p className="p-6 text-center text-stone/30 italic text-xs">No messages yet</p>
                    ) : (
                      dashStats?.recent_contacts?.map(c => (
                        <div key={c.id} className={`px-6 py-3.5 flex items-center gap-3 ${!c.is_read ? 'bg-gold/3' : ''}`}>
                          {!c.is_read && <div className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
                          {c.is_read && <div className="w-1.5 h-1.5 rounded-full bg-stone/20 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-maroon truncate">{c.name}</p>
                            <p className="text-[10px] text-stone/40 truncate">{c.subject || '(no subject)'} · {c.email}</p>
                          </div>
                          <p className="text-[9px] text-stone/30 ml-auto shrink-0">
                            {new Date(c.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick links */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone/5 overflow-hidden">
                  <div className="px-6 py-4 border-b border-stone/8">
                    <h3 className="font-cinzel font-black text-sm text-maroon flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gold" /> Quick Navigation
                    </h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {tabs.filter(t => t.id !== 'dashboard').map(t => (
                      <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className="flex items-center gap-2 p-3 rounded-xl border border-stone/8 hover:border-gold/30 hover:bg-gold/3 transition-all group text-left">
                        <t.icon className="w-4 h-4 text-maroon/40 group-hover:text-gold transition-colors" />
                        <div>
                          <div className="text-[11px] font-bold text-maroon">{t.name}</div>
                          <div className="text-[9px] tamil-text text-stone/35">{t.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DB status */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone/5 px-6 py-4 flex items-center gap-3">
                <Database className="w-4 h-4 text-gold" />
                <span className="text-[11px] font-bold text-maroon">PostgreSQL</span>
                <span className="text-[10px] text-stone/40">·</span>
                <span className="text-[10px] text-stone/40">suvadi database · connected</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════ CONTACTS ════════════════════ */}
          {activeTab === 'contacts' && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone/5 overflow-hidden">
              <div className="p-6 border-b border-stone/8 flex items-center justify-between bg-stone/[0.02]">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone/30" />
                  <input value={filterText} onChange={e => setFilterText(e.target.value)}
                    type="text" placeholder="Filter messages…"
                    className="w-full bg-white border border-stone/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/10" />
                </div>
                <button onClick={fetchData} className="flex items-center gap-1.5 text-stone/40 hover:text-maroon text-[10px] font-bold uppercase tracking-widest transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone/[0.03]">
                    <tr>
                      {['', 'Name', 'Email', 'Subject', 'Date', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone/5">
                    {loading ? (
                      <tr><td colSpan={6} className="p-16 text-center text-stone/30 italic font-cinzel">Loading…</td></tr>
                    ) : filteredData.length === 0 ? (
                      <tr><td colSpan={6} className="p-16 text-center text-stone/30 italic">No messages found.</td></tr>
                    ) : filteredData.map(item => (
                      <tr key={item.id} className={`group hover:bg-ivory transition-colors ${!item.is_read ? 'bg-gold/[0.02]' : ''}`}>
                        <td className="px-6 py-4">
                          <div className={`w-2 h-2 rounded-full ${!item.is_read ? 'bg-gold' : 'bg-stone/15'}`} />
                        </td>
                        <td className="px-6 py-4 font-bold text-xs text-maroon">{item.name}</td>
                        <td className="px-6 py-4 text-xs text-stone/50">{item.email}</td>
                        <td className="px-6 py-4 text-xs text-stone/60 max-w-xs truncate">{item.subject || '—'}</td>
                        <td className="px-6 py-4 text-[10px] text-stone/35">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            {!item.is_read && (
                              <button onClick={() => markContactRead(item.id)}
                                className="p-2 bg-gold/10 text-gold rounded-lg hover:bg-gold hover:text-maroon transition-all" title="Mark as read">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => handleDelete(item.id)}
                              className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════ ALL OTHER TABS ════════════════════ */}
          {activeTab !== 'dashboard' && activeTab !== 'contacts' && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone/5 overflow-hidden">
              {/* Table toolbar */}
              <div className="p-6 border-b border-stone/8 flex items-center justify-between bg-stone/[0.02]">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone/30" />
                  <input value={filterText} onChange={e => setFilterText(e.target.value)}
                    type="text" placeholder="Filter current records…"
                    className="w-full bg-white border border-stone/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/10" />
                </div>
                <div className="flex items-center gap-2 text-stone/35 text-[10px] font-bold uppercase">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Active System ·{' '}
                  <span className="text-maroon">{filteredData.length}</span> records
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh] min-h-[400px]">
                <table className="w-full text-left">
                  <thead className="bg-stone/[0.03]">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">ID</th>
                      {/* Dynamic columns per tab */}
                      {activeTab === 'books' && <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Book Title (Tamil)</th>}
                      {activeTab === 'categories' && <>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Category Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Parent Book</th>
                      </>}
                      {activeTab === 'subcategories' && <>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Sub-Category Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Category</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Book</th>
                      </>}
                      {activeTab === 'songs' && <>
                        <th className="px-4 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Image</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Folio #</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Transcription</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Image File</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Author</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Category</th>
                      </>}
                      {activeTab === 'ebook-editions' && <>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Edition Title</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Book</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Local File</th>
                      </>}
                      {activeTab === 'team' && <>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Role</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Order</th>
                      </>}
                      {activeTab === 'users' && <>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Username</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Email</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Role</th>
                      </>}
                      <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-stone/40 uppercase tracking-widest border-b border-stone/5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone/5">
                    {loading ? (
                      <tr><td colSpan={8} className="p-20 text-center text-stone/30 italic font-cinzel">Loading archival data…</td></tr>
                    ) : filteredData.length === 0 ? (
                      <tr><td colSpan={8} className="p-20 text-center text-stone/30 italic">No records found.</td></tr>
                    ) : filteredData.map(item => {
                      const id = activeTab === 'books' ? item.book_id
                        : activeTab === 'categories' ? item.cid
                        : item.id;
                      return (
                        <tr key={id} className="group hover:bg-ivory transition-colors">
                          <td className="px-6 py-4 text-[10px] font-mono text-bronze">#{id}</td>

                          {activeTab === 'books' && (
                            <td className="px-6 py-4 tamil-text font-bold text-maroon">{item.name}</td>
                          )}

                          {activeTab === 'categories' && <>
                            <td className="px-6 py-4 tamil-text font-bold text-maroon">{item.cname}</td>
                            <td className="px-6 py-4 text-[11px] text-stone/40 font-bold italic">{item.book_name}</td>
                          </>}

                          {activeTab === 'subcategories' && <>
                            <td className="px-6 py-4 tamil-text text-sm font-bold text-maroon max-w-xs">{item.sub_cat_name}</td>
                            <td className="px-6 py-4 text-[11px] text-stone/50">{item.category_name}</td>
                            <td className="px-6 py-4 text-[11px] text-stone/40 italic">{item.book_name}</td>
                          </>}

                          {activeTab === 'songs' && <>
                            <td className="px-4 py-2">
                              {item.mapped_url ? (
                                <a href={BASE + item.mapped_url} target="_blank" rel="noopener noreferrer" title={item.fname}>
                                  <img
                                    src={BASE + item.mapped_url}
                                    alt={`Folio ${item.fid}`}
                                    style={{ width: 52, height: 68, objectFit: 'cover' }}
                                    className="rounded border border-stone/15 hover:scale-150 transition-transform cursor-zoom-in shadow-sm"
                                    onError={e => {
                                      e.currentTarget.style.display = 'none';
                                      const fb = e.currentTarget.nextSibling;
                                      if (fb) fb.style.display = 'flex';
                                    }}
                                  />
                                  <div style={{ display: 'none', width: 52, height: 68 }} className="rounded border border-stone/10 bg-stone/5 items-center justify-center">
                                    <span className="text-[8px] text-stone/30 text-center px-1">No img</span>
                                  </div>
                                </a>
                              ) : (
                                <div style={{ width: 52, height: 68 }} className="rounded border border-red-200 bg-red-50/30 flex items-center justify-center">
                                  <span className="text-[8px] text-red-300 text-center px-1">Missing</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 font-cinzel font-black text-maroon">F{item.fid}</td>
                            <td className="px-6 py-4 tamil-text text-[11px] text-stone/50 max-w-[180px] truncate" title={item.description?.replace(/<[^>]+>/g, '').replace(/\r?\n/g, ' ')}>
                              {item.description?.replace(/<[^>]+>/g, '').replace(/\r?\n/g, ' ') || '—'}
                            </td>
                            <td className="px-6 py-4 text-[10px] font-mono">
                              {item.mapped_url ? (
                                <a href={BASE + item.mapped_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                  {item.fname}
                                </a>
                              ) : (
                                <span className="text-stone/40">{item.fname}</span>
                              )}
                              {item.is_missing && <div className="text-red-400 mt-1 flex items-center gap-1 font-bold uppercase tracking-widest text-[9px]"><div className="w-1.5 h-1.5 rounded-full bg-red-400"/> Missing</div>}
                            </td>
                            <td className="px-6 py-4 text-[10px] text-stone/40">{item.author || '—'}</td>
                            <td className="px-6 py-4 text-[10px] text-stone/40 max-w-[140px]">
                              <div className="font-semibold text-maroon/60 truncate">{item.book_name || '—'}</div>
                              <div className="truncate opacity-70 mt-0.5">{item.sub_cat_name || '—'}</div>
                            </td>
                          </>}

                          {activeTab === 'ebook-editions' && <>
                            <td className="px-6 py-4 tamil-text text-sm font-bold text-maroon max-w-xs truncate">{item.title_tamil}</td>
                            <td className="px-6 py-4 text-[11px] text-stone/40 font-bold">{item.book_name}</td>
                            <td className="px-6 py-4 text-[10px] text-stone/50">
                              <a href={`${BASE}/api/proxy/pdf?url=${encodeURIComponent(item.pdf_url)}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {item.local_pdf_url || 'N/A'}
                              </a>
                              {item.is_missing && <div className="text-red-400 mt-1 flex items-center gap-1 font-bold uppercase tracking-widest text-[9px]"><div className="w-1.5 h-1.5 rounded-full bg-red-400"/> Missing</div>}
                            </td>
                          </>}

                          {activeTab === 'team' && <>
                            <td className="px-6 py-4 font-bold text-maroon text-sm">{item.name}</td>
                            <td className="px-6 py-4 text-[11px] text-stone/50">
                              <div>{item.role_english}</div>
                              <div className="tamil-text text-[10px]">{item.role_tamil}</div>
                            </td>
                            <td className="px-6 py-4 font-cinzel text-[11px] text-bronze">{item.display_order}</td>
                          </>}

                          {activeTab === 'users' && <>
                            <td className="px-6 py-4 font-bold text-maroon">{item.username}</td>
                            <td className="px-6 py-4 text-xs text-stone/50">{item.email}</td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-maroon/5 text-maroon text-[9px] font-black uppercase rounded-full">{item.role}</span>
                            </td>
                          </>}

                          <td className="px-6 py-4">
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase
                              ${item.status ? 'text-emerald-600' : 'text-red-400'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${item.status ? 'bg-emerald-500' : 'bg-red-400'}`} />
                              {item.status ? 'Active' : 'Off'}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => openEdit(item)}
                                className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(id)}
                                className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-5 border-t border-stone/8 flex items-center justify-between bg-stone/[0.02]">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-5 py-2 bg-white border border-stone/15 rounded-xl text-[10px] font-black text-maroon
                      hover:bg-maroon hover:text-white disabled:opacity-30 transition-all uppercase tracking-widest">
                    ← Previous
                  </button>
                  <span className="text-[10px] font-black text-stone/40 uppercase tracking-widest">
                    Page <span className="text-maroon">{page}</span> of {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-5 py-2 bg-maroon text-white rounded-xl text-[10px] font-black
                      hover:bg-maroon-dark disabled:opacity-30 transition-all uppercase tracking-widest">
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ════════════════════ MODAL ════════════════════ */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-ink/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal header */}
              <div className="bg-maroon px-8 py-5 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-cinzel font-bold tracking-widest">
                    {editingItem ? 'Edit Record' : 'Create New Entry'}
                  </h3>
                  <p className="text-[10px] opacity-35 uppercase tracking-widest mt-0.5">
                    Table: {activeTab}
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)}
                  className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">

                {/* ── BOOKS ── */}
                {activeTab === 'books' && (
                  <Field label="Book Title (Tamil)">
                    <input required type="text" value={formData.name || ''} onChange={e => set('name', e.target.value)}
                      className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 tamil-body font-bold text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none"
                      placeholder="நூல் தலைப்பு…" />
                  </Field>
                )}

                {/* ── CATEGORIES ── */}
                {activeTab === 'categories' && (
                  <div className="space-y-5">
                    <Field label="Parent Book">
                      <BookSelect
                        required books={books}
                        value={formBookId || formData.book_id}
                        onChange={v => { setFormBookId(v); set('book_id', v); }}
                      />
                    </Field>
                    <Field label="Category Name (Tamil)">
                      <input required type="text" value={formData.cname || ''} onChange={e => set('cname', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 tamil-body font-bold text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none"
                        placeholder="பிரிவு பெயர்…" />
                    </Field>
                  </div>
                )}

                {/* ── SUB-CATEGORIES ── */}
                {activeTab === 'subcategories' && (
                  <div className="space-y-5">
                    <Field label="Parent Book">
                      <BookSelect required books={books}
                        value={formBookId || formData.book_id}
                        onChange={v => { setFormBookId(v); set('book_id', v); }} />
                    </Field>
                    <Field label="Parent Category">
                      <CategorySelect required categories={categories}
                        value={formCatId || formData.main_category_id}
                        onChange={v => { setFormCatId(v); set('main_category_id', v); }}
                        placeholder={formBookId ? '— Select Category —' : '— Select a book first —'} />
                    </Field>
                    <Field label="Sub-Category Name (Tamil)">
                      <input required type="text" value={formData.sub_cat_name || ''} onChange={e => set('sub_cat_name', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 tamil-body font-bold text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none"
                        placeholder="துணைப் பிரிவு பெயர்…" />
                    </Field>
                  </div>
                )}

                {/* ── SONGS / MANUSCRIPTS ── */}
                {activeTab === 'songs' && (
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <Field label="Parent Book">
                        <BookSelect books={books} value={formBookId}
                          onChange={v => { setFormBookId(v); set('book_id', v); }} />
                      </Field>
                    </div>
                    <div className="col-span-2">
                      <Field label="Category">
                        <CategorySelect categories={categories} value={formCatId}
                          onChange={v => { setFormCatId(v); }}
                          placeholder={formBookId ? '— Select Category —' : '— Select a book first —'} />
                      </Field>
                    </div>
                    <div className="col-span-2">
                      <Field label="Sub-Category">
                        <SubCatSelect required subcats={subcats} value={formData.cid}
                          onChange={v => set('cid', v)}
                          placeholder={formCatId ? '— Select Sub-Category —' : '— Select a category first —'} />
                      </Field>
                    </div>
                    <Field label="Folio / Page Number">
                      <input required type="number" value={formData.fid || ''} onChange={e => set('fid', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-maroon/20 focus:outline-none" />
                    </Field>
                    <Field label="Author">
                      <input type="text" value={formData.author || ''} onChange={e => set('author', e.target.value)}
                        placeholder="System"
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-maroon/20 focus:outline-none" />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Upload Folio Image (JPG/PNG)">
                        <input type="file" accept="image/*" onChange={e => set('imageFile', e.target.files[0])}
                          className="w-full text-xs text-stone/40 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-maroon/5 file:text-maroon hover:file:bg-maroon/10" />
                      </Field>
                    </div>
                    <div className="col-span-2">
                      <Field label="Scholarly Transcription (Tamil)">
                        <textarea rows={5} value={formData.description || ''} onChange={e => set('description', e.target.value)}
                          className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 tamil-body text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none resize-none"
                          placeholder="சுவடி வரி உரை…" />
                      </Field>
                    </div>
                  </div>
                )}

                {/* ── EBOOK EDITIONS ── */}
                {activeTab === 'ebook-editions' && (
                  <div className="space-y-5">
                    <Field label="Parent Book">
                      <BookSelect required books={books}
                        value={formBookId || formData.book_id}
                        onChange={v => { setFormBookId(v); set('book_id', v); }} />
                    </Field>
                    <Field label="Edition Title (Tamil)">
                      <input required type="text" value={formData.title_tamil || ''} onChange={e => set('title_tamil', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 tamil-body font-bold text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none"
                        placeholder="மின்நூல் தலைப்பு…" />
                    </Field>
                    <Field label="PDF URL">
                      <input required type="url" value={formData.pdf_url || ''} onChange={e => set('pdf_url', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-maroon/20 focus:outline-none"
                        placeholder="https://suvadi.cict.in/asp/pdf/…" />
                    </Field>
                  </div>
                )}

                {/* ── TEAM MEMBERS ── */}
                {activeTab === 'team' && (
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <Field label="Full Name">
                        <input required type="text" value={formData.name || ''} onChange={e => set('name', e.target.value)}
                          className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 font-bold text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none" />
                      </Field>
                    </div>
                    <Field label="Role (English)">
                      <input type="text" value={formData.role_english || ''} onChange={e => set('role_english', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-maroon/20 focus:outline-none" />
                    </Field>
                    <Field label="Role (Tamil)">
                      <input type="text" value={formData.role_tamil || ''} onChange={e => set('role_tamil', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 tamil-body text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none" />
                    </Field>
                    <Field label="Photo URL">
                      <input type="text" value={formData.photo_url || ''} onChange={e => set('photo_url', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-maroon/20 focus:outline-none"
                        placeholder="/images/team/name.jpg" />
                    </Field>
                    <Field label="Display Order">
                      <input type="number" min={0} value={formData.display_order ?? 0} onChange={e => set('display_order', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-maroon/20 focus:outline-none" />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Bio / Description">
                        <textarea rows={3} value={formData.bio || ''} onChange={e => set('bio', e.target.value)}
                          className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-maroon/20 focus:outline-none resize-none" />
                      </Field>
                    </div>
                  </div>
                )}

                {/* ── USERS ── */}
                {activeTab === 'users' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <Field label="Username">
                        <input required type="text" value={formData.username || ''} onChange={e => set('username', e.target.value)}
                          className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-maroon/20 focus:outline-none" />
                      </Field>
                      <Field label="Password">
                        <input type="password" value={formData.password || ''} onChange={e => set('password', e.target.value)}
                          className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-maroon/20 focus:outline-none"
                          placeholder={editingItem ? '(leave blank to keep current)' : ''} />
                      </Field>
                    </div>
                    <Field label="Email Address">
                      <input type="email" value={formData.email || ''} onChange={e => set('email', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-maroon/20 focus:outline-none" />
                    </Field>
                    <Field label="Role">
                      <select value={formData.role || 'admin'} onChange={e => set('role', e.target.value)}
                        className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 font-bold text-maroon focus:ring-2 focus:ring-maroon/20 focus:outline-none">
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </Field>
                  </div>
                )}

                {/* Status + submit */}
                <div className="flex items-center gap-3 pt-2">
                  <StatusToggle value={formData.status} onChange={v => set('status', v)} />
                </div>

                <div className="flex gap-4 pt-2">
                  <button type="submit"
                    className="flex-1 bg-maroon text-white py-3.5 rounded-xl font-black uppercase tracking-widest
                      hover:bg-maroon-dark transition-all shadow-lg shadow-maroon/20 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    {editingItem ? 'Save Updates' : 'Sync to Archive'}
                  </button>
                  <button type="button" onClick={() => setModalOpen(false)}
                    className="flex-1 bg-stone/5 text-stone/40 py-3.5 rounded-xl font-black uppercase tracking-widest hover:bg-stone/10 transition-all">
                    Cancel
                  </button>
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
