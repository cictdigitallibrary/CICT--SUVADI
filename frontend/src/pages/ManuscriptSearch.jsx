import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import { Search, Eye, ChevronDown, BookOpen, Filter, ArrowRight, ArrowLeft, ZoomIn, ZoomOut, RotateCw, RefreshCw, X, Maximize, FileText } from 'lucide-react';

const API = 'http://localhost:3001';

const ManuscriptSearch = () => {
  const { t, language } = useLanguage();
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

  // Load books
  useEffect(() => {
    axios.get(`${API}/api/texts`).then(res => setBooks(res.data));
  }, []);

  // Load manuscripts (Classical Books) when book selected
  useEffect(() => {
    if (selectedBook) {
      axios.get(`${API}/api/manuscripts?book_id=${selectedBook}`).then(res => {
        setManuscripts(res.data);
        setSelectedMS('');
        setSubcategories([]);
        setSelectedSub('');
        setResults(null);
        setBrowseResults(null);
      });
    } else {
      setManuscripts([]);
      setSelectedMS('');
      setSubcategories([]);
      setSelectedSub('');
    }
  }, [selectedBook]);

  // Load subcategories (Manuscript Selections) when manuscript selected
  useEffect(() => {
    if (selectedMS) {
      axios.get(`${API}/api/subcategories?cid=${selectedMS}`).then(res => {
        setSubcategories(res.data);
        setSelectedSub('');
        setResults(null);
        setBrowseResults(null);
      });
    } else {
      setSubcategories([]);
      setSelectedSub('');
    }
  }, [selectedMS]);

  const handleSearch = async e => {
    e.preventDefault();
    if (!selectedSub || !query.trim()) return;
    setLoading(true);
    setBrowseResults(null);
    try {
      const res = await axios.get(
        `${API}/api/manuscripts/search?sub_id=${selectedSub}&type=${searchType}&q=${encodeURIComponent(query)}`
      );
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowse = async (page = 1) => {
    if (!selectedSub) return;
    setBrowsing(true);
    setResults(null);
    setBrowsePage(page);
    try {
      const res = await axios.get(`${API}/api/songs?sub_id=${selectedSub}&page=${page}&limit=12`);
      setBrowseResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setBrowsing(false);
    }
  };

  const selectedManuscript = manuscripts.find(m => String(m.id) === String(selectedMS));
  const selectedSubData = subcategories.find(s => String(s.id) === String(selectedSub));
  const selectedBookData = books.find(b => String(b.id) === String(selectedBook));

  return (
    <div className="pt-32 pb-24 min-h-screen bg-ivory selection:bg-maroon selection:text-white">
      <div className="container mx-auto px-6 max-w-6xl">

        {/* Header */}
        <header className="mb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-bronze font-cinzel text-[10px] uppercase tracking-[0.5em] mb-4">
              {t('இணையவழிச் செவ்வியல்', 'ONLINE CLASSICAL ARCHIVES')}
            </p>
            <h1 className="tamil-heading text-5xl md:text-6xl text-maroon mb-6 italic">
              {t('சுவடித் தேடல்', 'Manuscript Search')}
            </h1>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-[1px] w-12 bg-gold/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
              <div className="h-[1px] w-12 bg-gold/50" />
            </div>
            <p className="tamil-body text-stone/60 leading-relaxed max-w-2xl mx-auto font-medium">
              {t(
                'பாடலின் எண்ணிட்டுத் தேடும் வசதியும் பாடலின் குறிப்பிட்ட சொல்லைக் கொண்டு தேடும் முறையும் உருவாக்கப்பட்டுள்ளது.',
                'Search precisely by poem number or explore literary themes through keyword-based queries across digitised palm-leaf manuscripts.'
              )}
            </p>
          </motion.div>
        </header>

        {/* Search Instructions */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-maroon/[0.03] border border-maroon/10 p-6 mb-10 relative"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-maroon/20" />
          <p className="tamil-label text-maroon mb-3 font-extrabold uppercase tracking-wide flex items-center gap-2">
            <span className="text-lg">💡</span>
            {t('தேடல் முறை:', 'How to Search:')}</p>
          <ol className="tamil-text list-decimal list-inside space-y-2 text-stone/65 font-bold">
            <li>{t('செவ்வியல் நூலை முதலில் தேர்வு செய்யவும்', 'First, select an authoritative Classical Text')}</li>
            <li>{t('பின்பு அந்தப் பாடத்தின் சுவடி வகையைத் தேர்வு செய்யவும்', 'Select the specific Manuscript category available')}</li>
            <li>{t('எண் வழி அல்லது சொல் வழிச் தேடல் மேற்கொள்க', 'Perform your search by Verse Number or Keyword')}</li>
          </ol>
        </motion.div>

        {/* Search Form Panel */}
        <div className="bg-white border border-maroon/10 shadow-2xl p-8 md:p-12 mb-16 relative overflow-hidden">
          {/* Subtle watermark */}
          <div className="absolute -bottom-8 -right-8 text-8xl opacity-[0.02] pointer-events-none text-maroon select-none">SEARCH</div>

          <form onSubmit={handleSearch} className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">

              {/* Book Select */}
              <div className="flex flex-col gap-3 group">
                <label className="tamil-label text-[10px] uppercase tracking-widest font-black text-bronze/60 flex items-center gap-2 group-focus-within:text-gold transition-colors">
                  <BookOpen className="w-3 h-3" />
                  {t('தலைப்புத் தொகுதி', 'BOOK TITLE')}
                </label>
                <div className="relative">
                  <select
                    value={selectedBook}
                    onChange={e => setSelectedBook(e.target.value)}
                    className="w-full appearance-none bg-ivory/50 border-2 border-maroon/5 p-5 pr-12 text-maroon text-sm font-bold outline-none focus:border-gold focus:ring-4 focus:ring-gold/5 transition-all cursor-pointer hover:bg-white hover:border-maroon/10"
                    style={{ fontFamily: '"Baloo Thambi 2", sans-serif' }}
                  >
                    <option value="">{t('-- தொகுதி தேர்வு --', '-- Select Book --')}</option>
                    {books.map(b => (
                      <option key={b.id} value={b.id}>{b.title_tamil}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-maroon/30 pointer-events-none group-focus-within:text-gold transition-colors" />
                </div>
              </div>

              {/* Manuscript Select (Classical Book) */}
              <div className="flex flex-col gap-3 group">
                <label className="tamil-label text-[10px] uppercase tracking-widest font-black text-bronze/60 flex items-center gap-2 group-focus-within:text-gold transition-colors">
                  <Filter className="w-3 h-3" />
                   {t('இலக்கியத் தலைப்பு', 'CLASSICAL BOOK')}
                </label>
                <div className="relative">
                  <select
                    value={selectedMS}
                    onChange={e => { setSelectedMS(e.target.value); setResults(null); setBrowseResults(null); }}
                    disabled={!selectedBook}
                    className="w-full appearance-none bg-ivory/50 border-2 border-maroon/5 p-5 pr-12 text-maroon text-sm font-bold outline-none focus:border-gold focus:ring-4 focus:ring-gold/5 transition-all disabled:opacity-30 cursor-pointer hover:bg-white hover:border-maroon/10"
                    style={{ fontFamily: '"Baloo Thambi 2", sans-serif' }}
                  >
                    <option value="">{t('-- செம்மை நூல் தேர்வு --', '-- Select Text --')}</option>
                    {manuscripts.map(m => (
                      <option key={m.id} value={m.id}>{m.title_tamil}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-maroon/30 pointer-events-none group-focus-within:text-gold transition-colors" />
                </div>
              </div>

              {/* SubCategory Select (Manuscript Selection) */}
              <div className="flex flex-col gap-3 group">
                <label className="tamil-label text-[10px] uppercase tracking-widest font-black text-bronze/60 flex items-center gap-2 group-focus-within:text-gold transition-colors">
                   <Search className="w-3 h-3" />
                   {t('சுவடித் தெரிவு', 'MANUSCRIPT SELECTION')}
                </label>
                <div className="relative">
                  <select
                    value={selectedSub}
                    onChange={e => { setSelectedSub(e.target.value); setResults(null); setBrowseResults(null); }}
                    disabled={!selectedMS}
                    className="w-full appearance-none bg-ivory/50 border-2 border-maroon/5 p-5 pr-12 text-maroon text-sm font-bold outline-none focus:border-gold focus:ring-4 focus:ring-gold/5 transition-all disabled:opacity-30 cursor-pointer hover:bg-white hover:border-maroon/10"
                    style={{ fontFamily: '"Baloo Thambi 2", sans-serif' }}
                  >
                    <option value="">{t('-- சுவடித் தெரிவு --', '-- Select Source --')}</option>
                    {subcategories.map(s => (
                      <option key={s.id} value={s.id}>{s.title_tamil}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-maroon/30 pointer-events-none group-focus-within:text-gold transition-colors" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Search Type Toggle */}
              <div className="flex flex-col gap-3">
                <label className="tamil-label text-[10px] uppercase tracking-widest font-black text-bronze">
                  {t('தேடல் முறை', 'SEARCH METHOD')}
                </label>
                <div className="flex gap-2 h-full min-h-[50px]">
                  {[
                    { val: 'by_number', ta: 'எண் வழி', en: 'Verse No.' },
                    { val: 'by_word',   ta: 'சொல் வழி', en: 'Keyword' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setSearchType(opt.val)}
                      className={`flex-1 tamil-label text-xs font-black border transition-all duration-300 ${
                        searchType === opt.val
                          ? 'bg-maroon text-white border-maroon shadow-lg'
                          : 'bg-white border-maroon/20 text-maroon hover:bg-maroon/5'
                      }`}
                    >
                      {t(opt.ta, opt.en)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Query + Submit */}
              <div className="flex flex-col gap-3">
                <label className="tamil-label text-[10px] uppercase tracking-widest font-black text-bronze">
                  {t('தேடல்', 'QUERY')}
                </label>
                <div className="flex h-full min-h-[50px]">
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={searchType === 'by_number' ? (t('எ.கா. 5', 'e.g. 5')) : (t('எ.கா. வான்', 'e.g. வான்'))}
                    className="flex-grow bg-ivory border border-maroon/15 px-4 text-sm text-maroon font-bold outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all font-baloo"
                  />
                  <button
                    type="submit"
                    disabled={!selectedSub || !query.trim() || loading}
                    className="bg-maroon text-white px-6 font-bold hover:bg-maroon-light transition-all shadow-lg hover:shadow-maroon/25 text-sm disabled:opacity-40"
                  >
                    {t('தேடு', 'SEARCH')}
                  </button>
                </div>
              </div>
            </div>

            {/* Premium action strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-maroon/5 gap-4">
               {selectedSub ? (
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                   <div className="flex flex-col">
                     <p className="tamil-label text-[10px] text-bronze font-black uppercase tracking-widest">
                       {t('தேடலுக்குத் தயார்', 'READY FOR RESEARCH')}
                     </p>
                     <p className="tamil-text text-[11px] text-stone/50 font-bold">
                       {selectedSubData?.title_tamil}
                     </p>
                   </div>
                 </div>
               ) : (
                 <p className="tamil-text text-[11px] text-stone/40 italic">{t('நூலைத் தேர்வு செய்யவும்', 'Please select a manuscript to begin search')}</p>
               )}
               
               {selectedSub && (
                 <button
                   type="button"
                   onClick={() => handleBrowse(1)}
                   disabled={browsing}
                   className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-maroon hover:text-gold transition-all group"
                 >
                   <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                   {t('அனைத்துப் பக்கங்கள்', 'BROWSE ALL FOLIOS')}
                 </button>
               )}
            </div>
          </form>
        </div>

        {/* Empty State / Prompt */}
        {selectedManuscript && !results && !browseResults && !loading && !browsing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-maroon/10 p-12 mb-10 text-center shadow-xl"
          >
            <div className="w-20 h-20 bg-maroon/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📜</span>
            </div>
            <h2 className="tamil-heading text-2xl text-maroon mb-2">{selectedManuscript.title_tamil}</h2>
            {selectedBookData && (
              <p className="font-cinzel text-[10px] text-bronze font-bold uppercase tracking-[0.3em] mb-6">
                ARCHIVE: {selectedBookData.title_tamil}
              </p>
            )}
            <p className="tamil-body text-stone/50 max-w-md mx-auto">
              {t('பதிவேற்றம் செய்யப்பட்டுள்ள அனைத்துப் பக்கங்களையும் காண "முழு சுவடி காண்க" பொத்தானை அழுத்தவும்.',
                'To explore the full digitised volume page by page, please click the "Browse Complete Archive" button above.')}
            </p>
          </motion.div>
        )}

        {/* Loading Indicator */}
        {(loading || browsing) && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <div className="w-12 h-12 border-2 border-maroon/5 border-t-gold rounded-full animate-spin" />
             <p className="font-cinzel tracking-[0.4em] text-bronze animate-pulse uppercase text-[10px]">
               {t('நூலக அடுக்குகளில் தேடுகிறோம்…', 'SCANNING ARCHIVAL REPOSITORY…')}
             </p>
          </div>
        )}

        {/* Search Results Display */}
        <AnimatePresence mode='wait'>
          {results && !loading && (
            <motion.div 
              key="search-results"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-6 mb-10">
                <div className="h-[1px] flex-grow bg-maroon/10" />
                <span className="tamil-label text-xs text-bronze uppercase tracking-[0.2em] font-black">
                  {results.count > 0
                    ? t(`தேடலில் கிடைத்தவை: ${results.count} ஏட்டுப் பக்கங்கள்`, `${results.count} MATCING LEAVES FOUND`)
                    : t('முடிவுகள் எதுவும் இல்லை', 'NO FRAGMENTS MATCHED')}
                </span>
                <div className="h-[1px] flex-grow bg-maroon/10" />
              </div>

              {results.count === 0 && (
                <div className="text-center py-20 bg-white border border-maroon/5 text-stone/30 italic tamil-body">
                  {t('இந்தக் குறிப்பிட்ட தேடல் சொல்லுக்கு அல்லது எண்ணுக்குச் சுவடி ஏடுகள் எதுவும் கிடைக்கவில்லை.', 'The repository contains no matches for your specific archival query.')}
                </div>
              )}

              <div className="grid grid-cols-1 gap-12">
                {results.results.map((res, i) => (
                  <SongCard key={i} res={res} i={i} t={t} onOpen={setActiveView} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Browse Results Display */}
        {browseResults && !browsing && (
          <motion.div 
            key="browse-results"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-6 mb-10">
              <div className="h-[1px] flex-grow bg-maroon/10" />
              <span className="tamil-label text-[10px] text-bronze uppercase tracking-[0.2em] font-black">
                {t(`ஏடு ${browsePage} — மொத்தம் ${browseResults.total} ஏடுகள்`,
                  `FOLIO ${browsePage} — TOTAL ${browseResults.total} LEAVES`)}
              </span>
              <div className="h-[1px] flex-grow bg-maroon/10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {browseResults.results.map((res, i) => (
                <SongCard key={i} res={res} i={i} t={t} compact onOpen={setActiveView} />
              ))}
            </div>

            {/* Advanced Pagination */}
            <div className="flex justify-center items-center gap-8 pt-8 border-t border-maroon/10">
              <button
                onClick={() => handleBrowse(browsePage - 1)}
                disabled={browsePage <= 1}
                className="tamil-label px-8 py-3 bg-white border border-maroon text-maroon text-[11px] font-black uppercase tracking-widest hover:bg-maroon hover:text-white transition-all disabled:opacity-20 shadow-md"
              >
                ← {t('முந்தைய', 'PREV')}
              </button>
              
              <div className="font-cinzel text-xs font-bold text-maroon/40 tracking-widest">
                {browsePage} / {Math.ceil(browseResults.total / 12)}
              </div>

              <button
                onClick={() => handleBrowse(browsePage + 1)}
                disabled={browseResults.results.length < 12}
                className="tamil-label px-8 py-3 bg-maroon text-white text-[11px] font-black uppercase tracking-widest hover:bg-maroon-dark transition-all disabled:opacity-20 shadow-lg"
              >
                {t('அடுத்தது', 'NEXT')} →
              </button>
            </div>
          </motion.div>
        )}

          {/* Institutional Resource Table */}
          <section className="mt-32 pt-20 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gold/10" />
            <div className="text-center mb-12">
              <h2 className="tamil-heading text-3xl text-maroon mb-4">
                {t('பதிவேற்றம் செய்யப்பட்டுள்ள சுவடிகள்', 'Archival Holdings Summary')}
              </h2>
              <div className="flex items-center justify-center gap-3">
                <div className="h-[1px] w-10 bg-gold/30" />
                <div className="text-[10px] text-bronze font-bold uppercase tracking-[0.4em]">{t('தரவுப்பட்டியல்', 'System Inventory')}</div>
                <div className="h-[1px] w-10 bg-gold/30" />
              </div>
            </div>
            <ManuscriptsInfoTable t={t} />
          </section>
        </div>

        {/* Modern Scholarly Viewer Modal */}
        <AnimatePresence>
          {activeView && (
            <ManuscriptViewer 
              folio={activeView} 
              onClose={() => setActiveView(null)} 
              t={t}
            />
          )}
        </AnimatePresence>
      </div>
  );
};

// Manuscript Folio Card
const SongCard = ({ res, i, t, compact, onOpen }) => {
  const { language } = useLanguage();
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.05 }}
      className={`bg-white border border-maroon/10 shadow-xl overflow-hidden group hover:border-gold/30 transition-all duration-500 ${compact ? 'h-full flex flex-col' : ''}`}
    >
      <div className={`grid ${compact ? 'grid-cols-1' : 'md:grid-cols-5'} h-full`}>
        {/* Visual Fragment */}
        <div 
          onClick={() => onOpen(res)}
          className={`bg-[#F9F7F3] flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-maroon/10 group-hover:bg-ivory transition-colors duration-500 cursor-zoom-in relative ${compact ? 'h-48' : 'md:col-span-2 min-h-64'}`}
        >
          {res.image_url && !imgError ? (
            <>
              <img
                src={`${API}${res.image_url}`}
                alt={`Page ${res.page_number}`}
                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-1000 ease-in-out"
                onError={() => setImgError(true)}
              />
              <div className="absolute inset-0 bg-maroon/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize className="text-white w-8 h-8" />
              </div>
            </>
          ) : (
            <div className="text-center p-8 opacity-20">
              <div className="text-6xl mb-4">📜</div>
              <p className="font-cinzel text-[10px] uppercase tracking-widest font-bold">
                {t('சுவடிப் பக்கம்', 'PAGE IMAGE')}
              </p>
            </div>
          )}
        </div>

        {/* Scholarly Transcription */}
        <div className={`p-8 md:p-10 flex flex-col ${compact ? 'flex-1' : 'md:col-span-3'}`}>
          <div className="flex items-start justify-between mb-8">
            <div className="flex flex-col gap-1">
              {res.book_name && (
                <span className="tamil-label text-[10px] font-black text-maroon/80 uppercase tracking-widest group-hover:text-gold transition-colors">
                  {res.book_name}
                </span>
              )}
              {res.manuscript_name && (
                <span className="tamil-text text-[11px] text-stone/40 font-bold">
                  {res.manuscript_name}
                </span>
              )}
            </div>
            <div className="bg-maroon text-gold px-4 py-2 text-[10px] font-black tracking-widest shadow-lg">
              {t('ஏடு', 'FOLIO')} #{res.page_number}
            </div>
          </div>

          {res.text_content ? (
            <div
              className={`tamil-heading text-maroon/90 font-serif leading-[2] group-hover:text-maroon transition-colors ${compact ? 'text-xs line-clamp-4' : 'text-xl'}`}
              style={{ fontStyle: 'normal' }}
              dangerouslySetInnerHTML={{
                __html: res.text_content.replace(/<br\/>/g, '<br/>').replace(/\\r\\n/g, ' ')
              }}
            />
          ) : (
            <p className="text-stone/30 italic text-sm">{t('படியெடுக்கப்படவில்லை', 'Transcription pending')}</p>
          )}

          <div className="mt-auto pt-8 border-t border-maroon/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
               <span className="font-cinzel text-[9px] text-stone/40 font-bold uppercase tracking-widest leading-none">
                 {t('ஓலைச்சுவடிப் படிமம்', 'PALM LEAF FRAGMENT')}
               </span>
            </div>
            {res.image_url && !imgError && (
              <a
                href={`${API}${res.image_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tamil-label text-gold text-[10px] font-black hover:text-maroon transition-colors uppercase tracking-[0.1em] border-b border-gold/30 pb-0.5"
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

// Summary Table Component
const ManuscriptsInfoTable = ({ t }) => {
  const info = [
    { bk: { ta: 'பதினெண் கீழ்க்கணக்கு', en: 'Patinenkilkanakku' }, ms: { ta: 'நாலடியார்', en: 'Naladiyar' }, cd: '313', pg: 400 },
    { bk: { ta: 'சிலப்பதிகாரம்', en: 'Silappatikaram' }, ms: { ta: 'பதிகம்', en: 'Patikam' }, cd: '313', pg: 20 },
    { bk: { ta: 'பத்துப்பாட்டு', en: 'Pattupattu' }, ms: { ta: 'திருமுருகாற்றுப்படை', en: 'Thirumurugatruppadai' }, cd: '314', pg: 317 },
    { bk: { ta: 'எட்டுத்தொகை', en: 'Ettuthokai' }, ms: { ta: 'ஐங்குறுநூறு', en: 'Aingurunuru' }, cd: '8A', pg: 500 },
    { bk: { ta: 'தொல்காப்பியம்', en: 'Tolkappiyam' }, ms: { ta: 'பொருள்-அகம்', en: 'Porul-Akam' }, cd: '313 (1-30)', pg: 30 },
    { bk: { ta: 'தொல்காப்பியம்', en: 'Tolkappiyam' }, ms: { ta: 'பொருள்-புறம்', en: 'Porul-Puram' }, cd: '313 (1-36)', pg: 36 },
    { bk: { ta: 'பதினெண் கீழ்க்கணக்கு', en: 'Patinenkilkanakku' }, ms: { ta: 'திருக்குறள்', en: 'Thirukkural' }, cd: '314', pg: 1330 },
    { bk: { ta: 'எட்டுத்தொகை', en: 'Ettuthokai' }, ms: { ta: 'அகநானூறு', en: 'Akananuru' }, cd: '112(301-400)', pg: 100 },
    { bk: { ta: 'தொல்காப்பியம்', en: 'Tolkappiyam' }, ms: { ta: 'சொல்-சேனா', en: 'Sol-Sena' }, cd: '112(485-947)', pg: 462 },
    { bk: { ta: 'தொல்காப்பியம்', en: 'Tolkappiyam' }, ms: { ta: 'மூலம் (எழுத்து)', en: 'Mulam (Eluthu)' }, cd: '247 (1-484)', pg: 484 },
    { bk: { ta: 'தொல்காப்பியம்', en: 'Tolkappiyam' }, ms: { ta: 'மூலம் (பொருள்)', en: 'Mulam (Porul)' }, cd: '100 (948-1614)', pg: 666 },
    { bk: { ta: 'பதினெண் கீழ்க்கணக்கு', en: 'Patinenkilkanakku' }, ms: { ta: 'ஏலாதி', en: 'Elathi' }, cd: '143', pg: 80 },
    { bk: { ta: 'பதினெண் கீழ்க்கணக்கு', en: 'Patinenkilkanakku' }, ms: { ta: 'திரிகடுகம்', en: 'Thirikadukam' }, cd: '179', pg: 100 },
    { bk: { ta: 'முத்தொள்ளாயிரம்', en: 'Muttollayiram' }, ms: { ta: 'முத்தொள்ளாயிரம்', en: 'Muttollayiram' }, cd: '19', pg: 109 },
  ];
  return (
    <div className="overflow-x-auto border border-maroon/10 shadow-2xl bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-maroon text-gold">
            <th className="p-5 tamil-label text-[10px] uppercase font-black tracking-widest border-r border-white/10">{t('செவ்வியல் நூல்', 'ARCHIVAL TEXT')}</th>
            <th className="p-5 tamil-label text-[10px] uppercase font-black tracking-widest border-r border-white/10">{t('சுவடி வகை', 'CATEGORY')}</th>
            <th className="p-5 tamil-label text-[10px] uppercase font-black tracking-widest text-center border-r border-white/10">{t('குறுந்தகடு', 'CD NO.')}</th>
            <th className="p-5 tamil-label text-[10px] uppercase font-black tracking-widest text-right">{t('எண்ணிக்கை', 'LEAF COUNT')}</th>
          </tr>
        </thead>
        <tbody>
          {info.map((row, i) => (
            <tr key={i} className={`border-b border-maroon/5 group hover:bg-ivory/80 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-ivory/30'}`}>
              <td className="p-5 tamil-label text-xs text-maroon/60 font-black group-hover:text-maroon transition-colors">{t(row.bk.ta, row.bk.en)}</td>
              <td className="p-5 tamil-label text-xs text-maroon font-black">{t(row.ms.ta, row.ms.en)}</td>
              <td className="p-5 font-cinzel text-[10px] text-stone/40 text-center font-black transition-colors">{row.cd}</td>
              <td className="p-5 text-right font-cinzel text-xs font-black text-maroon">{row.pg.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// End of file
// --- SCHOLARLY VIEWER ---
const ManuscriptViewer = ({ folio, onClose, t }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showText, setShowText] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 backdrop-blur-xl p-4 md:p-10"
    >
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] scale-150 rotate-12" />
      </div>

      <div className="relative w-full h-full max-w-7xl flex flex-col bg-ivory shadow-2xl rounded-sm border border-gold/20 overflow-hidden">
        {/* Viewer Header */}
        <div className="flex items-center justify-between p-6 border-b border-maroon/10 bg-white/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-maroon rounded-sm shadow-lg">
              <BookOpen className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="tamil-label text-sm text-maroon font-black uppercase tracking-widest">{folio.book_name}</h3>
              <p className="tamil-text text-[11px] text-stone/50 font-bold">{folio.manuscript_name} — {t('ஏடு', 'FOLIO')} #{folio.page_number}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-ivory rounded-full p-1 border border-maroon/5 shadow-inner">
               <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 hover:bg-white rounded-full text-maroon/40 hover:text-maroon transition-all"><ZoomOut className="w-4 h-4" /></button>
               <span className="font-cinzel text-[10px] font-black w-10 text-center text-maroon">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-2 hover:bg-white rounded-full text-maroon/40 hover:text-maroon transition-all"><ZoomIn className="w-4 h-4" /></button>
            </div>
            <button onClick={() => setRotation(r => r + 90)} className="p-3 hover:bg-white rounded-full text-maroon/60 transition-all border border-maroon/5"><RotateCw className="w-5 h-5" /></button>
            <button onClick={() => setShowText(!showText)} className={`p-3 rounded-full transition-all border ${showText ? 'bg-maroon text-white border-maroon shadow-lg' : 'bg-white text-maroon/60 border-maroon/5'}`}><FileText className="w-5 h-5" /></button>
            <div className="w-[1px] h-8 bg-maroon/10 mx-2" />
            <button onClick={onClose} className="p-3 bg-stone/5 hover:bg-red-500 hover:text-white rounded-full transition-all"><X className="w-6 h-6" /></button>
          </div>
        </div>

        {/* Viewer Main Area */}
        <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
          {/* Image Pane */}
          <div className="flex-grow relative overflow-hidden bg-[#121212] flex items-center justify-center p-8">
             <motion.div
               animate={{ scale: zoom, rotate: rotation }}
               drag
               dragConstraints={{ top: -500, bottom: 500, left: -500, right: 500 }}
               className="relative cursor-grab active:cursor-grabbing"
             >
               <img
                 src={`${API}${folio.image_url}`}
                 className="max-w-full max-h-[70vh] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5"
                 alt="Archival Scan"
               />
             </motion.div>
             <div className="absolute bottom-6 right-6 bg-ink/80 text-white/40 font-cinzel text-[9px] uppercase tracking-[0.3em] px-4 py-2 rounded-full border border-white/5">
               {t('நிறுவனக் காப்பகம்', 'Institutional Archive')}
             </div>
          </div>

          {/* Transcription Pane */}
          <AnimatePresence>
            {showText && (
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="w-full md:w-96 bg-white border-l border-maroon/10 p-10 overflow-y-auto"
              >
                <div className="flex items-center gap-3 mb-10 pb-6 border-b border-maroon/5">
                  <div className="w-2 h-2 rounded-full bg-gold" />
                  <h4 className="tamil-label text-xs text-maroon font-black uppercase tracking-widest">{t('எழுத்துப் பிரதி', 'TRANSCRIPTION')}</h4>
                </div>
                <div className="tamil-body text-stone leading-[2.2] text-lg">
                  {folio.text_content || t('படிமத்திலிருந்து எழுத்துகள் அறியப்படவில்லை.', 'No transcription available for this folio.')}
                </div>
                
                <div className="mt-20 pt-10 border-t border-maroon/10 opacity-30 italic text-[11px] tamil-text">
                   {t('மத்தியத் தமிழாராய்ச்சி நிறுவனம் | அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை', '© CICT | All archival rights reserved.')}
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
 

