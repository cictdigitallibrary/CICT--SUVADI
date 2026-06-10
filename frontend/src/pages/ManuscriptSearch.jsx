import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Eye, ChevronDown, BookOpen, Filter, ZoomIn, ZoomOut,
  RotateCw, X, Maximize, FileText, ChevronLeft, ChevronRight,
  Scroll, Layers, SlidersHorizontal, Info, ChevronUp, Database
} from 'lucide-react';
import PageHero from '../components/PageHero';

const API = 'http://localhost:3001';

/* ─── Animation Variants ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/* ─── Step badge ──────────────────────────────────────── */
const StepBadge = ({ n, active }) => (
  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black border transition-all duration-300
    ${active ? 'bg-maroon text-gold border-maroon shadow-sm' : 'bg-maroon/8 text-maroon/40 border-maroon/15'}`}>
    {n}
  </span>
);

/* ─── Styled Select ───────────────────────────────────── */
const StyledSelect = ({ value, onChange, disabled, children }) => (
  <div className="relative group">
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full appearance-none border rounded-sm px-4 py-2.5 pr-10 text-sm font-bold outline-none
        transition-all duration-200 cursor-pointer
        ${disabled
          ? 'bg-stone/3 border-maroon/8 text-maroon/25 cursor-not-allowed'
          : 'bg-white border-maroon/15 text-maroon hover:border-maroon/30 focus:border-gold focus:ring-2 focus:ring-gold/10'
        }`}
      style={{ fontFamily: '"Baloo Thambi 2", sans-serif' }}
    >
      {children}
    </select>
    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors
      ${disabled ? 'text-maroon/15' : 'text-maroon/35 group-focus-within:text-gold'}`} />
  </div>
);

/* ─── Main Component ──────────────────────────────────── */
const ManuscriptSearch = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  const [books, setBooks] = useState([]);
  const [manuscripts, setManuscripts] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [selectedBook, setSelectedBook] = useState(searchParams.get('book_id') || '');
  const [selectedMS, setSelectedMS] = useState(searchParams.get('cid') || '');
  const [selectedSub, setSelectedSub] = useState('');

  const [searchType, setSearchType] = useState('by_number');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [browseResults, setBrowseResults] = useState(null);
  const [browsePage, setBrowsePage] = useState(1);
  const [browsing, setBrowsing] = useState(false);
  const [activeView, setActiveView] = useState(null);

  // Layout states
  const [showInstructions, setShowInstructions] = useState(true);
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/texts`).then(res => setBooks(res.data));
  }, []);

  useEffect(() => {
    if (selectedBook) {
      axios.get(`${API}/api/manuscripts?book_id=${selectedBook}`).then(res => {
        setManuscripts(res.data);
        setSelectedMS(''); setSubcategories([]); setSelectedSub('');
        setResults(null); setBrowseResults(null);
      });
    } else {
      setManuscripts([]); setSelectedMS(''); setSubcategories([]); setSelectedSub('');
    }
  }, [selectedBook]);

  useEffect(() => {
    if (selectedMS) {
      axios.get(`${API}/api/subcategories?cid=${selectedMS}`).then(res => {
        setSubcategories(res.data); setSelectedSub('');
        setResults(null); setBrowseResults(null);
      });
    } else {
      setSubcategories([]); setSelectedSub('');
    }
  }, [selectedMS]);

  const handleSearch = async e => {
    e.preventDefault();
    if (!selectedSub || !query.trim()) return;
    setLoading(true); setBrowseResults(null);
    try {
      const res = await axios.get(
        `${API}/api/manuscripts/search?sub_id=${selectedSub}&type=${searchType}&q=${encodeURIComponent(query)}`
      );
      setResults(res.data);
      setShowInstructions(false); // Hide guidelines once user executes search
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleBrowse = async (page = 1) => {
    if (!selectedSub) return;
    setBrowsing(true); setResults(null); setBrowsePage(page);
    try {
      const res = await axios.get(`${API}/api/songs?sub_id=${selectedSub}&page=${page}&limit=12`);
      setBrowseResults(res.data);
      setShowInstructions(false); // Hide guidelines on browse
    } catch (err) { console.error(err); }
    finally { setBrowsing(false); }
  };

  const selectedManuscript = manuscripts.find(m => String(m.id) === String(selectedMS));
  const selectedSubData    = subcategories.find(s => String(s.id) === String(selectedSub));
  const selectedBookData   = books.find(b => String(b.id) === String(selectedBook));

  const totalBrowsePages = browseResults ? Math.ceil(browseResults.total / 12) : 1;

  return (
    <div className="min-h-screen bg-ivory selection:bg-maroon selection:text-white">

      {/* ── Page Hero ─────────────────────────────────────── */}
      <PageHero
        label={t('இணையவழிச் செவ்வியல்', 'ONLINE CLASSICAL ARCHIVES')}
        title={t('சுவடித் தேடல்', 'Manuscript Search')}
        subtitle={t(
          'பாடலின் எண்ணிட்டுத் தேடும் வசதியும் பாடலின் குறிப்பிட்ட சொல்லைக் கொண்டு தேடும் முறையும் உருவாக்கப்பட்டுள்ளது.',
          'Search precisely by poem number or explore literary themes through keyword-based queries across digitised palm-leaf manuscripts.'
        )}
        glyphs={['சுவடி', 'ஏடு', 'பாடல்', 'மூலம்', 'தேடல்', 'ஆய்வு']}
      />

      <div className="container mx-auto px-4 sm:px-6 max-w-6xl py-10">

        {/* ── Filter Panel ────────────────────────────────── */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="show"
          className="bg-white border border-maroon/10 shadow-lg rounded-sm mb-6 overflow-hidden"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-maroon/[0.03] border-b border-maroon/8">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-maroon/50" />
              <span className="tamil-label text-[10px] uppercase tracking-[0.35em] font-black text-maroon/60">
                {t('தேடல் வடிகட்டி', 'Search Filters')}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowInstructions(!showInstructions)}
                className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-sm border transition-all duration-200
                  ${showInstructions 
                    ? 'bg-gold/15 text-gold-dark border-gold/30' 
                    : 'bg-stone/5 text-stone/50 border-transparent hover:bg-stone/10'}`}
              >
                <Info className="w-3 h-3" />
                {t('தேடல் வழிகாட்டி', 'Guidelines')}
              </button>
              
              {selectedSub && (
                <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                  {t('தயார்', 'READY')}
                </span>
              )}
            </div>
          </div>

          {/* Interactive Search Instructions / Guidelines */}
          <AnimatePresence>
            {showInstructions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden bg-gold/5 border-b border-gold/10"
              >
                <div className="p-5 flex gap-3.5 items-start">
                  <span className="text-xl leading-none select-none mt-0.5">💡</span>
                  <div>
                    <p className="tamil-label text-[10px] font-black text-bronze uppercase tracking-[0.18em] mb-1.5">
                      {t('பாடல்களை எளிதாகக் கண்டறியும் முறை:', 'How to find manuscripts easily:')}
                    </p>
                    <ul className="tamil-text text-[11px] text-stone/60 space-y-1 list-decimal list-inside font-bold">
                      <li>{t('செவ்வியல் நூலை முதலில் தேர்வு செய்யவும்', 'First, select an authoritative Book Title')}</li>
                      <li>{t('பின்பு அந்தப் பாடத்தின் சுவடி வகையைத் தேர்வு செய்யவும்', 'Select the specific Manuscript category available')}</li>
                      <li>{t('தேடல் வசதியைப் பயன்படுத்தி பாடல் எண் அல்லது சொல் இட்டுத் தேடலாம்', 'Perform your search using either Verse Number or Keyword query')}</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSearch} className="p-6">
            {/* Step selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

              {/* Step 1 — Book */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 tamil-label text-[10px] uppercase tracking-widest font-black text-stone/45">
                  <StepBadge n="1" active={!!selectedBook} />
                  <BookOpen className="w-3 h-3" />
                  {t('தொகுதி', 'Book Title')}
                </label>
                <StyledSelect value={selectedBook} onChange={e => setSelectedBook(e.target.value)}>
                  <option value="">{t('-- தேர்வு செய்யவும் --', '-- Select Book --')}</option>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title_tamil}</option>)}
                </StyledSelect>
              </div>

              {/* Step 2 — Manuscript */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 tamil-label text-[10px] uppercase tracking-widest font-black text-stone/45">
                  <StepBadge n="2" active={!!selectedMS} />
                  <Layers className="w-3 h-3" />
                  {t('செம்மை நூல்', 'Classical Text')}
                </label>
                <StyledSelect
                  value={selectedMS}
                  onChange={e => { setSelectedMS(e.target.value); setResults(null); setBrowseResults(null); }}
                  disabled={!selectedBook}
                >
                  <option value="">{t('-- தேர்வு செய்யவும் --', '-- Select Text --')}</option>
                  {manuscripts.map(m => <option key={m.id} value={m.id}>{m.title_tamil}</option>)}
                </StyledSelect>
              </div>

              {/* Step 3 — Subcategory */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 tamil-label text-[10px] uppercase tracking-widest font-black text-stone/45">
                  <StepBadge n="3" active={!!selectedSub} />
                  <Scroll className="w-3 h-3" />
                  {t('சுவடித் தெரிவு', 'Manuscript Source')}
                </label>
                <StyledSelect
                  value={selectedSub}
                  onChange={e => { setSelectedSub(e.target.value); setResults(null); setBrowseResults(null); }}
                  disabled={!selectedMS}
                >
                  <option value="">{t('-- தேர்வு செய்யவும் --', '-- Select Source --')}</option>
                  {subcategories.map(s => <option key={s.id} value={s.id}>{s.title_tamil}</option>)}
                </StyledSelect>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-maroon/6 mb-5" />

            {/* Search method + Query row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">

              {/* Search type */}
              <div className="flex flex-col gap-1.5">
                <label className="tamil-label text-[10px] uppercase tracking-widest font-black text-stone/45">
                  {t('தேடல் முறை', 'Search Method')}
                </label>
                <div className="flex rounded-sm overflow-hidden border border-maroon/15 h-10">
                  {[
                    { val: 'by_number', ta: 'எண் வழி', en: 'By Number' },
                    { val: 'by_word',   ta: 'சொல் வழி', en: 'By Keyword' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setSearchType(opt.val)}
                      className={`flex-1 tamil-label text-[11px] font-black transition-all duration-200
                        ${searchType === opt.val
                          ? 'bg-maroon text-white'
                          : 'bg-white text-maroon/50 hover:bg-maroon/5'
                        }`}
                    >
                      {t(opt.ta, opt.en)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Query input */}
              <div className="flex flex-col gap-1.5">
                <label className="tamil-label text-[10px] uppercase tracking-widest font-black text-stone/45">
                  {t('தேடல் சொல் / எண்', 'Search Query')}
                </label>
                <div className="flex h-10 rounded-sm overflow-hidden border border-maroon/15 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/10 transition-all">
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={searchType === 'by_number' ? t('எ.கா. 5', 'e.g. 5') : t('எ.கா. வான்', 'e.g. வான்')}
                    className="flex-grow bg-white px-4 text-sm text-maroon font-bold outline-none"
                    style={{ fontFamily: '"Baloo Thambi 2", sans-serif' }}
                  />
                  <button
                    type="submit"
                    disabled={!selectedSub || !query.trim() || loading}
                    className="bg-maroon text-white px-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider
                      hover:bg-maroon-light transition-colors disabled:opacity-35"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {t('தேடு', 'Search')}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom action row */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-maroon/5">
              <p className="tamil-text text-[11px] text-stone/45 italic">
                {selectedSub
                  ? <span className="text-bronze font-bold not-italic">{selectedSubData?.title_tamil}</span>
                  : t('சுவடியைத் தேர்வுசெய்து தேடலை மேற்கொள்ளவும்', 'Select a manuscript source to begin your search')}
              </p>
              {selectedSub && (
                <button
                  type="button"
                  onClick={() => handleBrowse(1)}
                  disabled={browsing}
                  className="flex items-center gap-2 tamil-label text-[10px] font-black uppercase tracking-[0.18em]
                    text-maroon border border-maroon/20 px-4 py-1.5 rounded-sm
                    hover:bg-maroon hover:text-white hover:border-maroon transition-all duration-200 group"
                >
                  <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  {t('அனைத்து ஏடுகள்', 'Browse All Folios')}
                </button>
              )}
            </div>
          </form>
        </motion.div>

        {/* ── Empty-state (manuscript selected, nothing searched yet) ── */}
        <AnimatePresence>
          {selectedManuscript && !results && !browseResults && !loading && !browsing && (
            <motion.div
              variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0 }}
              className="bg-white border border-maroon/10 rounded-sm shadow-md p-10 text-center"
            >
              <div className="w-14 h-14 bg-maroon/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📜</span>
              </div>
              <h2 className="tamil-heading text-xl text-maroon mb-1">{selectedManuscript.title_tamil}</h2>
              {selectedBookData && (
                <p className="font-cinzel text-[9px] text-bronze font-bold uppercase tracking-[0.3em] mb-4">
                  {selectedBookData.title_tamil}
                </p>
              )}
              <p className="tamil-body text-stone/50 text-xs max-w-sm mx-auto">
                {t(
                  'பதிவேற்றம் செய்யப்பட்டுள்ள அனைத்துப் பக்கங்களையும் காண "அனைத்து ஏடுகள்" பொத்தானை அழுத்தவும்.',
                  'Use the "Browse All Folios" button above to explore the complete digitised archive page by page.'
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading Indicator ───────────────────────────── */}
        <AnimatePresence>
          {(loading || browsing) && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-3"
            >
              <div className="w-8 h-8 border-2 border-maroon/8 border-t-gold rounded-full animate-spin" />
              <p className="font-cinzel tracking-[0.4em] text-bronze animate-pulse uppercase text-[9px]">
                {t('நூலக அடுக்குகளில் தேடுகிறோம்…', 'SCANNING ARCHIVAL REPOSITORY…')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Search Results ──────────────────────────────── */}
        <AnimatePresence mode="wait">
          {results && !loading && (
            <motion.div key="search-results" variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0 }}>

              {/* Result count header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-grow bg-maroon/8" />
                <span className="tamil-label text-[10px] text-bronze uppercase tracking-[0.25em] font-black whitespace-nowrap">
                  {results.count > 0
                    ? t(`${results.count} ஏட்டுப் பக்கங்கள் கிடைத்தன`, `${results.count} FOLIO${results.count !== 1 ? 'S' : ''} FOUND`)
                    : t('முடிவுகள் இல்லை', 'NO MATCHES FOUND')}
                </span>
                <div className="h-px flex-grow bg-maroon/8" />
              </div>

              {results.count === 0 ? (
                <div className="text-center py-16 bg-white border border-maroon/8 rounded-sm text-stone/30 italic tamil-body text-xs">
                  {t('இந்தத் தேடலுக்கு சுவடி ஏடுகள் எதுவும் கிடைக்கவில்லை.', 'No archival fragments matched your query.')}
                </div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 gap-6">
                  {results.results.map((res, i) => (
                    <SongCard key={i} res={res} i={i} t={t} onOpen={setActiveView} />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Browse Results ──────────────────────────────── */}
        <AnimatePresence mode="wait">
          {browseResults && !browsing && (
            <motion.div key="browse-results" variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0 }}>

              {/* Browse count header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-grow bg-maroon/8" />
                <span className="tamil-label text-[10px] text-bronze uppercase tracking-[0.25em] font-black whitespace-nowrap">
                  {t(`பக்கம் ${browsePage} / ${totalBrowsePages} — மொத்தம் ${browseResults.total} ஏடுகள்`,
                     `PAGE ${browsePage} / ${totalBrowsePages} — ${browseResults.total} TOTAL FOLIOS`)}
                </span>
                <div className="h-px flex-grow bg-maroon/8" />
              </div>

              <motion.div
                variants={stagger} initial="hidden" animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8"
              >
                {browseResults.results.map((res, i) => (
                  <SongCard key={i} res={res} i={i} t={t} compact onOpen={setActiveView} />
                ))}
              </motion.div>

              {/* Pagination */}
              <div className="flex justify-center items-center gap-2 pt-5 border-t border-maroon/8">
                <button
                  onClick={() => handleBrowse(browsePage - 1)}
                  disabled={browsePage <= 1}
                  className="flex items-center gap-1 px-4 py-2 border border-maroon/15 text-maroon text-[10px] font-black
                    uppercase tracking-widest tamil-label rounded-sm hover:bg-maroon hover:text-white hover:border-maroon
                    transition-all disabled:opacity-25 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> {t('முந்தைய', 'Prev')}
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalBrowsePages, 5) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => handleBrowse(p)}
                        className={`w-7 h-7 font-cinzel text-xs font-black rounded-sm transition-all
                          ${browsePage === p ? 'bg-maroon text-white' : 'text-maroon/40 hover:bg-maroon/8'}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  {totalBrowsePages > 5 && <span className="text-maroon/30 font-cinzel text-xs px-1 select-none">…</span>}
                </div>

                <button
                  onClick={() => handleBrowse(browsePage + 1)}
                  disabled={browseResults.results.length < 12}
                  className="flex items-center gap-1 px-4 py-2 bg-maroon text-white text-[10px] font-black
                    uppercase tracking-widest tamil-label rounded-sm hover:bg-maroon-light
                    transition-all disabled:opacity-25 disabled:pointer-events-none"
                >
                  {t('அடுத்தது', 'Next')} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Collapsible Archival Holdings Inventory Section ── */}
        <div className="mt-12 border-t border-maroon/8 pt-8">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowInventory(!showInventory)}
              className="flex items-center gap-2 bg-maroon/[0.04] border border-maroon/10 rounded-sm px-6 py-2.5 text-maroon hover:bg-maroon hover:text-white hover:border-maroon transition-all duration-300 shadow-sm"
            >
              <Database className="w-4 h-4 text-gold" />
              <span className="tamil-label text-xs uppercase tracking-wider font-black">
                {showInventory 
                  ? t('காப்பக விவரங்களை மறை (14 நூல்கள்)', 'Hide Archival Holdings') 
                  : t('பதிவேற்றப்பட்டுள்ள காப்பக விவரங்கள் (14 நூல்கள்)', 'View Archival Holdings')}
              </span>
              {showInventory ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>
          </div>

          <AnimatePresence>
            {showInventory && (
              <motion.section
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="overflow-hidden mt-6"
              >
                <div className="pb-8">
                  <div className="text-center mb-6">
                    <p className="font-cinzel text-[9px] text-bronze font-bold uppercase tracking-[0.4em] mb-1.5">
                      {t('தரவுப்பட்டியல்', 'System Inventory')}
                    </p>
                    <h2 className="tamil-heading text-2xl text-maroon">
                      {t('பதிவேற்றம் செய்யப்பட்டுள்ள சுவடிகள்', 'Archival Holdings')}
                    </h2>
                  </div>
                  <ManuscriptsInfoTable t={t} />
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* ── Folio Viewer Modal ──────────────────────────────── */}
      <AnimatePresence>
        {activeView && (
          <ManuscriptViewer folio={activeView} onClose={() => setActiveView(null)} t={t} />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Song / Folio Card ──────────────────────────────── */
const SongCard = ({ res, i, t, compact, onOpen }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      variants={fadeUp}
      className={`bg-white border border-maroon/10 rounded-sm shadow-md overflow-hidden group
        hover:border-gold/30 hover:shadow-xl transition-all duration-400
        ${compact ? 'flex flex-col h-full' : ''}`}
    >
      <div className={`grid ${compact ? 'grid-cols-1' : 'md:grid-cols-5'} h-full`}>

        {/* Image pane */}
        <div
          onClick={() => onOpen(res)}
          className={`relative bg-stone/3 flex items-center justify-center overflow-hidden
            cursor-zoom-in border-b md:border-b-0 md:border-r border-maroon/8
            group-hover:bg-ivory transition-colors duration-400
            ${compact ? 'h-40' : 'md:col-span-2 min-h-56'}`}
        >
          {res.image_url && !imgError ? (
            <>
              <img
                src={`${API}${res.image_url}`}
                alt={`Folio ${res.page_number}`}
                className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-700 ease-out"
                onError={() => setImgError(true)}
              />
              <div className="absolute inset-0 bg-maroon/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-2.5 border border-white/20">
                  <Maximize className="text-white w-4.5 h-4.5" />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center p-6 opacity-20">
              <div className="text-4xl mb-2">📜</div>
              <p className="font-cinzel text-[9px] uppercase tracking-widest font-bold">
                {t('சுவடிப் பக்கம்', 'PAGE IMAGE')}
              </p>
            </div>
          )}
        </div>

        {/* Text pane */}
        <div className={`p-6 flex flex-col ${compact ? 'flex-1' : 'md:col-span-3'}`}>

          {/* Card header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col gap-0.5">
              {res.book_name && (
                <span className="tamil-label text-[10px] font-black text-maroon/70 uppercase tracking-widest group-hover:text-gold transition-colors">
                  {res.book_name}
                </span>
              )}
              {res.manuscript_name && (
                <span className="tamil-text text-[11px] text-stone/40 font-bold">{res.manuscript_name}</span>
              )}
            </div>
            <div className="shrink-0 bg-maroon text-gold px-2.5 py-1 text-[9px] font-black tracking-widest shadow rounded-sm">
              {t('ஏடு', 'FOLIO')} #{res.page_number}
            </div>
          </div>

          {/* Text content */}
          {res.text_content ? (
            <div
              className={`tamil-heading text-maroon/85 font-serif leading-[2] group-hover:text-maroon transition-colors
                ${compact ? 'text-xs line-clamp-4' : 'text-lg'}`}
              style={{ fontStyle: 'normal' }}
              dangerouslySetInnerHTML={{
                __html: res.text_content.replace(/<br\/>/g, '<br/>').replace(/\\r\\n/g, ' ')
              }}
            />
          ) : (
            <p className="text-stone/30 italic text-sm">{t('படியெடுக்கப்படவில்லை', 'Transcription pending')}</p>
          )}

          {/* Card footer */}
          <div className="mt-auto pt-4 border-t border-maroon/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-gold/60" />
              <span className="font-cinzel text-[9px] text-stone/35 font-bold uppercase tracking-widest">
                {t('ஓலைச்சுவடிப் படிமம்', 'PALM LEAF FRAGMENT')}
              </span>
            </div>
            {res.image_url && !imgError && (
              <a
                href={`${API}${res.image_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tamil-label text-gold text-[10px] font-black hover:text-maroon transition-colors
                  uppercase tracking-[0.1em] border-b border-gold/30 pb-0.5"
              >
                {t('முழு படிமம்', 'FULL SCAN')} ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Archival Holdings Table ────────────────────────── */
const ManuscriptsInfoTable = ({ t }) => {
  const info = [
    { bk: { ta: 'பதினெண் கீழ்க்கணக்கு', en: 'Patinenkilkanakku' }, ms: { ta: 'நாலடியார்',          en: 'Naladiyar' },           cd: '313',           pg: 400  },
    { bk: { ta: 'சிலப்பதிகாரம்',         en: 'Silappatikaram' },    ms: { ta: 'பதிகம்',              en: 'Patikam' },              cd: '313',           pg: 20   },
    { bk: { ta: 'பத்துப்பாட்டு',          en: 'Pattupattu' },        ms: { ta: 'திருமுருகாற்றுப்படை', en: 'Thirumurugatruppadai' }, cd: '314',           pg: 317  },
    { bk: { ta: 'எட்டுத்தொகை',           en: 'Ettuthokai' },        ms: { ta: 'ஐங்குறுநூறு',         en: 'Aingurunuru' },          cd: '8A',            pg: 500  },
    { bk: { ta: 'தொல்காப்பியம்',          en: 'Tolkappiyam' },       ms: { ta: 'பொருள்-அகம்',         en: 'Porul-Akam' },           cd: '313 (1-30)',    pg: 30   },
    { bk: { ta: 'தொல்காப்பியம்',          en: 'Tolkappiyam' },       ms: { ta: 'பொருள்-புறம்',         en: 'Porul-Puram' },          cd: '313 (1-36)',    pg: 36   },
    { bk: { ta: 'பதினெண் கீழ்க்கணக்கு', en: 'Patinenkilkanakku' }, ms: { ta: 'திருக்குறள்',          en: 'Thirukkural' },          cd: '314',           pg: 1330 },
    { bk: { ta: 'எட்டுத்தொகை',           en: 'Ettuthokai' },        ms: { ta: 'அகநானூறு',            en: 'Akananuru' },            cd: '112(301-400)',  pg: 100  },
    { bk: { ta: 'தொல்காப்பியம்',          en: 'Tolkappiyam' },       ms: { ta: 'சொல்-சேனா',           en: 'Sol-Sena' },             cd: '112(485-947)', pg: 462  },
    { bk: { ta: 'தொல்காப்பியம்',          en: 'Tolkappiyam' },       ms: { ta: 'மூலம் (எழுத்து)',      en: 'Mulam (Eluthu)' },       cd: '247 (1-484)',  pg: 484  },
    { bk: { ta: 'தொல்காப்பியம்',          en: 'Tolkappiyam' },       ms: { ta: 'மூலம் (பொருள்)',       en: 'Mulam (Porul)' },        cd: '100 (948-1614)',pg: 666  },
    { bk: { ta: 'பதினெண் கீழ்க்கணக்கு', en: 'Patinenkilkanakku' }, ms: { ta: 'ஏலாதி',               en: 'Elathi' },               cd: '143',           pg: 80   },
    { bk: { ta: 'பதினெண் கீழ்க்கணக்கு', en: 'Patinenkilkanakku' }, ms: { ta: 'திரிகடுகம்',           en: 'Thirikadukam' },         cd: '179',           pg: 100  },
    { bk: { ta: 'முத்தொள்ளாயிரம்',        en: 'Muttollayiram' },     ms: { ta: 'முத்தொள்ளாயிரம்',     en: 'Muttollayiram' },        cd: '19',            pg: 109  },
  ];

  const total = info.reduce((acc, r) => acc + r.pg, 0);

  return (
    <div className="overflow-x-auto border border-maroon/10 rounded-sm shadow-md bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-maroon text-gold">
            <th className="px-4 py-3 tamil-label text-[10px] uppercase font-black tracking-widest border-r border-white/10">
              {t('செவ்வியல் நூல்', 'Classical Text')}
            </th>
            <th className="px-4 py-3 tamil-label text-[10px] uppercase font-black tracking-widest border-r border-white/10">
              {t('சுவடி வகை', 'Manuscript Category')}
            </th>
            <th className="px-4 py-3 tamil-label text-[10px] uppercase font-black tracking-widest text-center border-r border-white/10">
              {t('குறுந்தகடு', 'CD No.')}
            </th>
            <th className="px-4 py-3 tamil-label text-[10px] uppercase font-black tracking-widest text-right">
              {t('ஏட்டு எண்ணிக்கை', 'Leaf Count')}
            </th>
          </tr>
        </thead>
        <tbody>
          {info.map((row, i) => (
            <tr key={i} className={`border-b border-maroon/5 group hover:bg-gold/3 transition-colors
              ${i % 2 === 0 ? 'bg-white' : 'bg-ivory/40'}`}>
              <td className="px-4 py-2.5 tamil-label text-xs text-stone/55 font-black group-hover:text-maroon transition-colors">
                {t(row.bk.ta, row.bk.en)}
              </td>
              <td className="px-4 py-2.5 tamil-label text-xs text-maroon font-black">
                {t(row.ms.ta, row.ms.en)}
              </td>
              <td className="px-4 py-2.5 font-cinzel text-[10px] text-stone/40 text-center font-bold">
                {row.cd}
              </td>
              <td className="px-4 py-2.5 text-right font-cinzel text-xs font-black text-maroon">
                {row.pg.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-maroon/3 border-t border-maroon/10">
            <td colSpan={3} className="px-4 py-2.5 tamil-label text-[10px] font-black text-maroon/50 uppercase tracking-widest">
              {t('மொத்தம்', 'Total')}
            </td>
            <td className="px-4 py-2.5 text-right font-cinzel text-xs font-black text-maroon">
              {total.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

/* ─── Manuscript Viewer Modal ────────────────────────── */
const ManuscriptViewer = ({ folio, onClose, t }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showText, setShowText] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 backdrop-blur-xl p-4 md:p-8"
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }} />

      <div className="relative w-full h-full max-w-7xl flex flex-col bg-ivory shadow-2xl border border-gold/15 overflow-hidden rounded-sm">

        {/* Viewer header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-maroon/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-maroon rounded-sm shadow">
              <BookOpen className="w-3.5 h-3.5 text-gold" />
            </div>
            <div>
              <h3 className="tamil-label text-xs text-maroon font-black leading-tight">{folio.book_name}</h3>
              <p className="tamil-text text-[9px] text-stone/50 font-bold">
                {folio.manuscript_name} — {t('ஏடு', 'Folio')} #{folio.page_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom */}
            <div className="flex items-center gap-0.5 bg-stone/5 rounded-full p-1 border border-maroon/8">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
                className="p-1 hover:bg-white rounded-full text-maroon/40 hover:text-maroon transition-all">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-cinzel text-[9px] font-black w-8 text-center text-maroon">
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                className="p-1 hover:bg-white rounded-full text-maroon/40 hover:text-maroon transition-all">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Rotate */}
            <button onClick={() => setRotation(r => r + 90)}
              className="p-1.5 hover:bg-stone/8 rounded-full text-maroon/50 transition-all border border-maroon/8">
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            {/* Toggle text */}
            <button onClick={() => setShowText(!showText)}
              className={`p-1.5 rounded-full transition-all border
                ${showText ? 'bg-maroon text-white border-maroon shadow' : 'bg-white text-maroon/50 border-maroon/8'}`}>
              <FileText className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-6 bg-maroon/10 mx-1" />
            {/* Close */}
            <button onClick={onClose}
              className="p-1.5 bg-stone/5 hover:bg-red-500 hover:text-white text-maroon/60 rounded-full transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Image pane */}
          <div className="flex-grow relative overflow-hidden bg-[#111] flex items-center justify-center p-6">
            <motion.div
              animate={{ scale: zoom, rotate: rotation }}
              drag
              dragConstraints={{ top: -500, bottom: 500, left: -500, right: 500 }}
              className="relative cursor-grab active:cursor-grabbing"
            >
              <img
                src={`${API}${folio.image_url}`}
                className="max-w-full max-h-[70vh] shadow-[0_0_80px_rgba(0,0,0,0.7)] border border-white/5"
                alt="Archival Scan"
              />
            </motion.div>
            <div className="absolute bottom-4 right-4 bg-black/60 text-white/30 font-cinzel text-[9px]
              uppercase tracking-[0.3em] px-3 py-1.5 rounded-full border border-white/5">
              {t('நிறுவனக் காப்பகம்', 'Institutional Archive')}
            </div>
          </div>

          {/* Transcription pane */}
          <AnimatePresence>
            {showText && (
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                className="w-full md:w-72 bg-white border-l border-maroon/10 flex flex-col overflow-hidden"
              >
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-maroon/8 bg-maroon/[0.02]">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <h4 className="tamil-label text-[10px] text-maroon font-black uppercase tracking-widest">
                    {t('எழுத்துப் பிரதி', 'Transcription')}
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="tamil-body text-stone leading-[2.1] text-sm">
                    {folio.text_content || t('இந்த ஏட்டிற்கு எழுத்துப் பிரதி இல்லை.', 'No transcription available for this folio.')}
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-maroon/8 bg-maroon/[0.02]">
                  <p className="font-cinzel text-[8px] text-stone/30 uppercase tracking-[0.3em] text-center">
                    © CICT | All archival rights reserved.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ManuscriptSearch;
