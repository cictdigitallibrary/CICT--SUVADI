import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Eye, ChevronDown, BookOpen, ZoomIn, ZoomOut,
  RotateCw, X, Maximize, FileText, ChevronLeft, ChevronRight,
  Scroll, Layers, SlidersHorizontal, Info, Languages
} from 'lucide-react';
import PageHero from '../components/PageHero';

const API = 'http://localhost:3001';

/* ─── Animation Variants ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
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

/* ─── Normalize raw DB text: <br> variants and escape sequences → \n */
const normalizeText = (raw) =>
  (raw || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\r\\n|\\n/g, '\n')
    .replace(/\r\n|\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/* ─── Highlight matching text ─────────────────────────── */
const HighlightText = ({ text, query }) => {
  const cleanText = normalizeText(text);

  if (!query) return <>{cleanText}</>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = cleanText.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-gold/25 text-maroon-dark rounded-[2px] px-0.5 font-black">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
};

/* ─── Transliteration helpers ─────────────────────────────── */
// Returns the trailing run of ASCII letters being typed (the "current word")
const getTransWord = (text) => (text.match(/[a-zA-Z]+$/) || [''])[0];

// Replace the trailing ASCII word with a Tamil suggestion
const applyTransSuggestion = (text, tamil) => text.replace(/[a-zA-Z]+$/, tamil);

/* ─── Official content — Search intro & manuscript register, verbatim from
   suvadi.cict.in/asp/suvadisearch.aspx ─────────────────────────────────── */
const SEARCH_INTRO_STEPS = [
  { ta: 'செவ்வியியல் நூலை முதலில் தேர்வு செய்யவும்;', en: 'First select the classical text;' },
  { ta: 'பின்பு சுவடியைத் தேர்வு செய்யவும்;', en: 'Then select the manuscript;' },
  { ta: 'அதன்பின் எண் வழித் தேடல்/பாடலின் ஒரு சொல் வழித் தேடல் மேற்கொள்க.', en: 'After that, proceed with search by number or by a word in the poem.' },
];

const SEARCH_INTRO_NOTES = [
  {
    ta_title: 'எண் வழித் தேடல்:',
    en_title: 'Search by Number:',
    ta: 'தேடலுக்குரிய பாடல்/ நூற்பா எண்ணைக் கொடுப்பதன் மூலம் உரிய சுவடி ஏட்டின் பக்கம் கிடைக்கப்பெறும்.',
    en: 'By giving the poem/verse number to be searched, the corresponding manuscript folio page will be retrieved.',
  },
  {
    ta_title: 'பாடலின் குறிப்பிட்ட ஏதெனும் ஒரு சொல் வழித் தேடல்:',
    en_title: 'Search by a Specific Word in the Poem:',
    ta: 'தேடலுக்குரிய பாடலின் சொல்லைக் கொடுப்பதன் மூலம் உரிய சுவடி ஏட்டின் பக்கம் கிடைக்கப்பெறும்.',
    en: 'By giving a word from the poem to be searched, the corresponding manuscript folio page will be retrieved.',
  },
];

const SEARCH_TABLE_ROWS = [
  { title_ta: 'பதினெண் கீழ்க்கணக்கு', title_en: 'Pathinen Kizhkanakku', text_ta: 'நாலடியார்', text_en: 'Naladiyar', cd_ta: 'எண்: 313', cd_en: 'No: 313', count: 400 },
  { title_ta: 'சிலப்பதிகாரம்', title_en: 'Silappathikaram', text_ta: 'பதிகம்', text_en: 'Pathigam', cd_ta: 'எண்: 313', cd_en: 'No: 313', count: 20 },
  { title_ta: 'பத்துப்பாட்டு', title_en: 'Pattuppattu', text_ta: 'திருமுருகாற்றுப்படை', text_en: 'Thirumurugatrupadai', cd_ta: 'எண்: 314', cd_en: 'No: 314', count: 317 },
  { title_ta: 'பத்துப்பாட்டு', title_en: 'Pattuppattu', text_ta: 'திருமுருகாற்றுப்படை', text_en: 'Thirumurugatrupadai', cd_ta: 'எண்: 314', cd_en: 'No: 314', count: 317 },
  { title_ta: 'எட்டுத்தொகை', title_en: 'Ettuthogai', text_ta: 'ஐங்குறுநூறு', text_en: 'Ainkurunuru', cd_ta: 'எண்: 8A', cd_en: 'No: 8A', count: 500 },
  { title_ta: 'தொல்காப்பியம்', title_en: 'Tholkappiyam', text_ta: 'பொருள் - அகம் - சி.வை.தா பதிப்பு', text_en: 'Porul - Agam - C.W. Thamotharampillai Edition', cd_ta: 'எண்: 313 (1-30)', cd_en: 'No: 313 (1-30)', count: 30 },
  { title_ta: 'தொல்காப்பியம்', title_en: 'Tholkappiyam', text_ta: 'பொருள் - புறம் - சி.வை.தா பதிப்பு', text_en: 'Porul - Puram - C.W. Thamotharampillai Edition', cd_ta: 'எண்: 313 (1-36)', cd_en: 'No: 313 (1-36)', count: 36 },
  { title_ta: 'பதினெண் கீழ்க்கணக்கு', title_en: 'Pathinen Kizhkanakku', text_ta: 'திருக்குறள்', text_en: 'Thirukkural', cd_ta: 'எண்: 314', cd_en: 'No: 314', count: 1330 },
  { title_ta: 'எட்டுத்தொகை', title_en: 'Ettuthogai', text_ta: 'அகநானூறு', text_en: 'Agananuru', cd_ta: 'எண்: 112(301-400)', cd_en: 'No: 112 (301-400)', count: 100 },
  { title_ta: 'தொல்காப்பியம்', title_en: 'Tholkappiyam', text_ta: 'சொல்.சேனா', text_en: 'Sol. Sena', cd_ta: 'எண்:112(485-947)', cd_en: 'No: 112 (485-947)', count: 462 },
  { title_ta: 'தொல்காப்பியம்', title_en: 'Tholkappiyam', text_ta: 'மூலம் (எழுத்து)', text_en: 'Moolam (Eluthu)', cd_ta: 'எண்:247 (1-484)', cd_en: 'No: 247 (1-484)', count: 484 },
  { title_ta: 'தொல்காப்பியம்', title_en: 'Tholkappiyam', text_ta: 'மூலம் (பொருள்)', text_en: 'Moolam (Porul)', cd_ta: 'எண்:100 (948-1614)', cd_en: 'No: 100 (948-1614)', count: 666 },
  { title_ta: 'பதினெண் கீழ்க்கணக்கு', title_en: 'Pathinen Kizhkanakku', text_ta: 'ஏலாதி', text_en: 'Elathi', cd_ta: 'எண்:143', cd_en: 'No: 143', count: 80 },
  { title_ta: 'பதினெண் கீழ்க்கணக்கு', title_en: 'Pathinen Kizhkanakku', text_ta: 'திரிகடுகம்', text_en: 'Thirikadukam', cd_ta: 'எண்:179', cd_en: 'No: 179', count: 100 },
  { title_ta: 'முத்தொள்ளாயிரம்', title_en: 'Muthollayiram', text_ta: 'முத்தொள்ளாயிரம்', text_en: 'Muthollayiram', cd_ta: 'எண்:19', cd_en: 'No: 19', count: 109 },
  { title_ta: 'சிலப்பதிகாரம்', title_en: 'Silappathikaram', text_ta: 'பதிகம்', text_en: 'Pathigam', cd_ta: 'எண்: 18 (1-90)', cd_en: 'No: 18 (1-90)', count: 90 },
  { title_ta: 'சிலப்பதிகாரம்', title_en: 'Silappathikaram', text_ta: 'புகார்க் காண்டம் - மங்கல வாழ்த்துப் பாடல்', text_en: 'Pugarkkandam - Mangala Vazhthu Padal', cd_ta: 'எண்: 18 (1-20)', cd_en: 'No: 18 (1-20)', count: 20 },
  { title_ta: 'சிலப்பதிகாரம்', title_en: 'Silappathikaram', text_ta: 'புகார்க் காண்டம் - மனையறம்படுத்த காதை', text_en: 'Pugarkkandam - Manaiarampadutha Kathai', cd_ta: 'எண்: 18 (1-90)', cd_en: 'No: 18 (1-90)', count: 90 },
  { title_ta: 'சிலப்பதிகாரம்', title_en: 'Silappathikaram', text_ta: 'புகார்க் காண்டம் - அரங்கேற்று காதை', text_en: 'Pugarkkandam - Arangetru Kathai', cd_ta: 'எண்: 18 (1-175)', cd_en: 'No: 18 (1-175)', count: 175 },
  { title_ta: 'சிலப்பதிகாரம்', title_en: 'Silappathikaram', text_ta: 'புகார்க் காண்டம் - அந்திமாலைச் சிறப்புசெய் காதை', text_en: 'Pugarkkandam - Anthimalai Sirappusey Kathai', cd_ta: 'எண்: 18 (1-84)', cd_en: 'No: 18 (1-84)', count: 84 },
  { title_ta: 'சிலப்பதிகாரம்', title_en: 'Silappathikaram', text_ta: 'புகார்க் காண்டம் - இந்திர விழவு ஊர் எடுத்த காதை', text_en: 'Pugarkkandam - Indira Vizhavu Ur Edutha Kathai', cd_ta: 'எண்: 18 (1-240)', cd_en: 'No: 18 (1-240)', count: 240 },
  { title_ta: 'சிலப்பதிகாரம்', title_en: 'Silappathikaram', text_ta: 'புகார்க் காண்டம் - கடலாடு காதை', text_en: 'Pugarkkandam - Kadaladu Kathai', cd_ta: 'எண்: 18 (1-174)', cd_en: 'No: 18 (1-174)', count: 174 },
  { title_ta: 'சிலப்பதிகாரம்', title_en: 'Silappathikaram', text_ta: 'புகார்க் காண்டம் - கானல் வரி', text_en: 'Pugarkkandam - Kanal Vari', cd_ta: 'எண்: 18 (1-52)', cd_en: 'No: 18 (1-52)', count: 52 },
  { title_ta: 'சிலப்பதிகாரம்', title_en: 'Silappathikaram', text_ta: 'புகார்க் காண்டம் - வேனிற் காதை', text_en: 'Pugarkkandam - Venir Kathai', cd_ta: 'எண்: 18 (1-80)', cd_en: 'No: 18 (1-80)', count: 80 },
];

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
const ManuscriptSearch = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  /* Hierarchical dropdown states — mirrors main site exactly */
  const [books, setBooks]                 = useState([]);
  const [manuscripts, setManuscripts]     = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [selectedBook, setSelectedBook]   = useState(searchParams.get('book_id') || '');
  const [selectedMS, setSelectedMS]       = useState(searchParams.get('cid') || '');
  const [selectedSub, setSelectedSub]     = useState('');

  /* Single unified query — just like main site */
  const [query, setQuery]                 = useState('');
  const [results, setResults]             = useState(null);
  const [loading, setLoading]             = useState(false);

  /* Browse mode */
  const [browseResults, setBrowseResults] = useState(null);
  const [browsePage, setBrowsePage]       = useState(1);
  const [browsing, setBrowsing]           = useState(false);

  /* Autocomplete */
  const [suggestions, setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimeout                    = useRef(null);

  /* UI state */
  const [activeView, setActiveView]       = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);

  /* Transliteration state */
  const [transSugs, setTransSugs]         = useState([]);
  const [showTrans, setShowTrans]         = useState(false);
  const [transIdx, setTransIdx]           = useState(0);
  const transTimeout                      = useRef(null);

  const searchInputRef = useRef(null);

  /* ── Transliteration: fetch suggestions for current English word ── */
  const fetchTransliteration = useCallback((word) => {
    if (!word) { setTransSugs([]); setShowTrans(false); return; }
    clearTimeout(transTimeout.current);
    transTimeout.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/api/proxy/transliterate?text=${encodeURIComponent(word)}&lang=ta`);
        const sugs = res.data.suggestions || [];
        setTransSugs(sugs);
        setTransIdx(0);
        setShowTrans(sugs.length > 0);
      } catch { setTransSugs([]); setShowTrans(false); }
    }, 200);
  }, []);

  /* ── Autocomplete suggestions (like main site's sdata.php) ─ */
  const fetchSuggestions = useCallback((val) => {
    if (!selectedSub || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    clearTimeout(suggestTimeout.current);
    suggestTimeout.current = setTimeout(async () => {
      try {
        const isNum = /^\d+$/.test(val.trim());
        const res = await axios.get(
          `${API}/api/manuscripts/search?sub_id=${selectedSub}&type=${isNum ? 'by_number' : 'by_word'}&q=${encodeURIComponent(val.trim())}`
        );
        if (res.data.results && res.data.results.length > 0) {
          const sugs = res.data.results.slice(0, 6).map(r => ({
            label: isNum
              ? `${t('ஏடு', 'Folio')} #${r.page_number}`
              : (r.text_content || '').replace(/<br\/>/g, ' ').replace(/\\r\\n/g, ' ').replace(/<[^>]+>/g, '').substring(0, 80) + '…',
            page_number: r.page_number,
          }));
          setSuggestions(sugs);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }, [selectedSub, t]);

  /* ── Apply a transliteration suggestion ── */
  const applyTrans = useCallback((tamil, addSpace = false) => {
    const newQ = applyTransSuggestion(query, tamil) + (addSpace ? ' ' : '');
    setQuery(newQ);
    setShowTrans(false);
    setTransSugs([]);
    if (newQ.trim()) fetchSuggestions(newQ.trim());
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [query, fetchSuggestions]);

  /* ── Load books on mount ─────────────────────────── */
  useEffect(() => {
    axios.get(`${API}/api/texts`).then(res => setBooks(res.data)).catch(console.error);
  }, []);

  /* ── When book changes → load categories ─────────── */
  useEffect(() => {
    if (selectedBook) {
      axios.get(`${API}/api/manuscripts?book_id=${selectedBook}`).then(res => {
        setManuscripts(res.data);
        setSelectedMS(''); setSubcategories([]); setSelectedSub('');
        setResults(null); setBrowseResults(null);
      }).catch(console.error);
    } else {
      setManuscripts([]); setSelectedMS(''); setSubcategories([]); setSelectedSub('');
    }
  }, [selectedBook]);

  /* ── When category changes → load sub-categories ─── */
  useEffect(() => {
    if (selectedMS) {
      axios.get(`${API}/api/subcategories?cid=${selectedMS}`).then(res => {
        setSubcategories(res.data); setSelectedSub('');
        setResults(null); setBrowseResults(null);
      }).catch(console.error);
    } else {
      setSubcategories([]); setSelectedSub('');
    }
  }, [selectedMS]);

  /* ── Search (unified: number OR word, exactly like main site)
       If query is empty → show all folios (browse mode) */
  const handleSearch = async (e) => {
    e && e.preventDefault();
    if (!selectedSub) return;

    // Empty query → browse all folios
    if (!query.trim()) {
      handleBrowse(1);
      return;
    }

    setShowSuggestions(false);
    setLoading(true);
    setBrowseResults(null);
    try {
      const q = query.trim();
      const isNumber = /^\d+$/.test(q);
      const searchType = isNumber ? 'by_number' : 'by_word';
      const res = await axios.get(
        `${API}/api/manuscripts/search?sub_id=${selectedSub}&type=${searchType}&q=${encodeURIComponent(q)}`
      );
      setResults(res.data);
      setShowInstructions(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Browse all folios ───────────────────────────── */
  const handleBrowse = async (page = 1) => {
    if (!selectedSub) return;
    setBrowsing(true); setResults(null); setBrowsePage(page);
    try {
      const res = await axios.get(`${API}/api/songs?sub_id=${selectedSub}&page=${page}&limit=12`);
      setBrowseResults(res.data);
      setShowInstructions(false);
    } catch (err) { console.error(err); }
    finally { setBrowsing(false); }
  };

  const selectedManuscript = manuscripts.find(m => String(m.id) === String(selectedMS));
  const selectedSubData    = subcategories.find(s => String(s.id) === String(selectedSub));
  const selectedBookData   = books.find(b => String(b.id) === String(selectedBook));
  const totalBrowsePages   = browseResults ? Math.ceil(browseResults.total / 12) : 1;

  return (
    <div className="min-h-screen bg-ivory selection:bg-maroon selection:text-white">

      {/* ── Page Hero ─────────────────────────────────────── */}
      <PageHero
        label={t('இணையவழிச் செவ்வியல்', 'ONLINE CLASSICAL ARCHIVES')}
        title={t('சுவடித் தேடல்', 'Manuscript Search')}
        subtitle={t(
          'பாடலின் எண்ணிட்டுத் தேடும் வசதியும் பாடலின் குறிப்பிட்ட சொல்லைக் கொண்டு தேடும் முறையும் உருவாக்கப்பட்டுள்ளது.',
          'Search by poem number or explore literary themes through keyword queries across digitised palm-leaf manuscripts.'
        )}
        glyphs={['சுவடி', 'ஏடு', 'பாடல்', 'மூலம்', 'தேடல்', 'ஆய்வு']}
        backgroundImage="/images/bg/search-hero.png"
        heroClass="search-hero-bg"
        align="left"
        headingStyle={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.6rem)', lineHeight: '1.3', fontWeight: '800', letterSpacing: '0.02em' }}
      />

      {/* ══════════════════════════════════════════════════
          OFFICIAL SEARCH INTRODUCTION — verbatim content from
          suvadi.cict.in/asp/suvadisearch.aspx
      ══════════════════════════════════════════════════ */}
      <div className="w-full px-4 sm:px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="search-intro-card w-[92%] sm:w-[90%] max-w-[1400px] mx-auto"
        >
          <h2 className="tamil-heading text-2xl md:text-3xl text-maroon font-black mb-5">
            {t(
              'செவ்வியல் சுவடித் தேடல் (Online Classical Tamil Manuscripts Search Engine)',
              'Classical Manuscript Search (Online Classical Tamil Manuscripts Search Engine)'
            )}
          </h2>

          <p className="search-intro-p">
            {t(
              'ஆய்வாளர்கள் எளிதாகச் செவ்வியல் சுவடிகளைப் படிப்பதற்கும், பாடவேறுபாடு கண்டறிவதற்கும் ஏற்றவாறு இணைய வழிச் சுவடித் தேடலில் பாடலின் எண்ணிட்டுத் தேடும் வசதியும் பாடலின் குறிப்பிட்ட ஏதெனும் ஒரு சொல்லைக் கொண்டு தேடும் முறையும் உருவாக்கப்பட்டுள்ளது.',
              "The online manuscript search engine has been designed so that researchers can easily read classical manuscripts and identify textual variations, with the facility to search by a poem's number and by any specific word in the poem."
            )}
          </p>

          <ul className="search-intro-steps">
            {SEARCH_INTRO_STEPS.map((s, i) => (
              <li key={i}>
                <StepBadge n={i + 1} active />
                <span>{t(s.ta, s.en)}</span>
              </li>
            ))}
          </ul>

          <h3 className="search-intro-subheading">
            {t('தேடல் குறிப்புகள்:', 'Search Notes:')}
          </h3>

          <div className="space-y-4 mb-8">
            {SEARCH_INTRO_NOTES.map((note, i) => (
              <p key={i} className="search-intro-p">
                <strong className="text-maroon">{i + 1}.{t(note.ta_title, note.en_title)}</strong>
                {' '}{t(note.ta, note.en)}
              </p>
            ))}
          </div>

          <h3 className="search-intro-subheading">
            {t(
              'இந்த சுவடித் தேடலில் பதிவேற்றம் செய்யப்பட்டடுள்ள ஓலைச்சுவடிகள் விபரம்:',
              'Details of the Palm-Leaf Manuscripts Uploaded to this Search Engine:'
            )}
          </h3>

          <div className="search-intro-table-wrap">
            <table className="search-intro-table">
              <thead>
                <tr>
                  <th>{t('நூல் தலைப்பு', 'Text Title')}</th>
                  <th>{t('செவ்வியல் நூல்', 'Classical Text')}</th>
                  <th>{t('செம்மொழி நிறுவனக் குறுந்தகடு எண்', 'CICT Compact Disc No.')}</th>
                  <th>{t('எண்ணிக்கை', 'Count')}</th>
                </tr>
              </thead>
              <tbody>
                {SEARCH_TABLE_ROWS.map((row, i) => (
                  <tr key={i}>
                    <td>{t(row.title_ta, row.title_en)}</td>
                    <td>{t(row.text_ta, row.text_en)}</td>
                    <td>{t(row.cd_ta, row.cd_en)}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="search-intro-p mt-8 mb-0">
            {t(
              'மேலும் பல மின்படியாக்கப்பட்ட சுவடிகள், இத்தேடலில் பதிவேற்றம் செய்யப்படும்.',
              'Many more digitised manuscripts will be uploaded to this search engine.'
            )}
          </p>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 max-w-6xl py-10">

        {/* ══════════════════════════════════════════════════
            SEARCH PANEL — mirrors main site: search.php
        ══════════════════════════════════════════════════ */}
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
                {t('தேடல் குறிப்புகள்', 'Search Hints')}
              </button>

              {selectedSub && (
                <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                  {t('தயார்', 'READY')}
                </span>
              )}
            </div>
          </div>

          {/* ── Search Hints — matching main site's help text ── */}
          <AnimatePresence>
            {showInstructions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden bg-gold/5 border-b border-gold/10"
              >
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tamil hints */}
                  <div>
                    <p className="tamil-label text-[10px] font-black text-bronze uppercase tracking-[0.18em] mb-3">
                      தேடல் குறிப்புகள்
                    </p>
                    <div className="space-y-3">
                      <div className="flex gap-2.5 items-start">
                        <span className="shrink-0 w-5 h-5 bg-maroon/8 rounded-full flex items-center justify-center text-[9px] font-black text-maroon/50 mt-0.5">1</span>
                        <div>
                          <p className="tamil-text text-[11px] text-stone/70 font-bold">எண் வழித் தேடல்:</p>
                          <p className="tamil-text text-[10px] text-stone/45 mt-0.5">தேடலுக்குரிய செவ்வியல் நூலின் பாடல்/ நூற்பா எண்ணைக் கொடுப்பதன் மூலம் உரிய சுவடியின் பக்கம் கிடைக்கப்பெறும்.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="shrink-0 w-5 h-5 bg-maroon/8 rounded-full flex items-center justify-center text-[9px] font-black text-maroon/50 mt-0.5">2</span>
                        <div>
                          <p className="tamil-text text-[11px] text-stone/70 font-bold">பாடலின் குறிப்பிட்ட சொல் வழித் தேடல்:</p>
                          <p className="tamil-text text-[10px] text-stone/45 mt-0.5">தேடலுக்குரிய செவ்வியல் நூல் பாடலின் குறிப்பிட்ட சொல்லைக் கொடுப்பதன் மூலம் உரிய சுவடியின் பக்கம் கிடைக்கப் பெறும்.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* English hints */}
                  <div>
                    <p className="tamil-label text-[10px] font-black text-bronze uppercase tracking-[0.18em] mb-3">
                      Search Hints
                    </p>
                    <div className="space-y-3">
                      <div className="flex gap-2.5 items-start">
                        <span className="shrink-0 w-5 h-5 bg-maroon/8 rounded-full flex items-center justify-center text-[9px] font-black text-maroon/50 mt-0.5">1</span>
                        <div>
                          <p className="tamil-text text-[11px] text-stone/70 font-bold">Search by Number:</p>
                          <p className="tamil-text text-[10px] text-stone/45 mt-0.5">By entering song/nūṟpā number you can get the particular page of the manuscript.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="shrink-0 w-5 h-5 bg-maroon/8 rounded-full flex items-center justify-center text-[9px] font-black text-maroon/50 mt-0.5">2</span>
                        <div>
                          <p className="tamil-text text-[11px] text-stone/70 font-bold">Search by Word:</p>
                          <p className="tamil-text text-[10px] text-stone/45 mt-0.5">By entering any word of the verse you can get the particular page of the manuscript.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Search Form — exactly like main site ─────── */}
          <form onSubmit={handleSearch} className="p-6">

            {/* 3 cascading dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

              {/* Step 1 — நூல் தலைப்பு (Book Title) */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 tamil-label text-[10px] uppercase tracking-widest font-black text-stone/45">
                  <StepBadge n="1" active={!!selectedBook} />
                  <BookOpen className="w-3 h-3" />
                  {t('நூல் தலைப்பு', 'Book Title')}
                </label>
                <StyledSelect value={selectedBook} onChange={e => setSelectedBook(e.target.value)}>
                  <option value="">{t('-- நூல் தலைப்பு --', '-- Book Title --')}</option>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title_tamil}</option>)}
                </StyledSelect>
              </div>

              {/* Step 2 — செவ்வியல் நூல் (Classical Text) */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 tamil-label text-[10px] uppercase tracking-widest font-black text-stone/45">
                  <StepBadge n="2" active={!!selectedMS} />
                  <Layers className="w-3 h-3" />
                  {t('செவ்வியல் நூல்', 'Classical Text')}
                </label>
                <StyledSelect
                  value={selectedMS}
                  onChange={e => { setSelectedMS(e.target.value); setResults(null); setBrowseResults(null); }}
                  disabled={!selectedBook}
                >
                  <option value="">{t('-- செவ்வியல் நூல் --', '-- Classical Text --')}</option>
                  {manuscripts.map(m => <option key={m.id} value={m.id}>{m.title_tamil}</option>)}
                </StyledSelect>
              </div>

              {/* Step 3 — சுவடித் தேர்வு (Manuscript Selection) */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 tamil-label text-[10px] uppercase tracking-widest font-black text-stone/45">
                  <StepBadge n="3" active={!!selectedSub} />
                  <Scroll className="w-3 h-3" />
                  {t('சுவடித் தேர்வு', 'Manuscript Selection')}
                </label>
                <StyledSelect
                  value={selectedSub}
                  onChange={e => { setSelectedSub(e.target.value); setResults(null); setBrowseResults(null); }}
                  disabled={!selectedMS}
                >
                  <option value="">{t('-- சுவடித் தேர்வு --', '-- Manuscript Selection --')}</option>
                  {subcategories.map(s => <option key={s.id} value={s.id}>{s.title_tamil}</option>)}
                </StyledSelect>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-maroon/6 mb-5" />

            {/* Single unified search input — exactly like main site's
                "எண்/பாடலின் குறிப்பிட்ட சொல்" field */}
            <div className="mb-5">
              <label className="flex items-center gap-2 tamil-label text-[10px] uppercase tracking-widest font-black text-stone/45 mb-1.5">
                <Search className="w-3 h-3" />
                {t('எண் / பாடலின் குறிப்பிட்ட சொல்', 'Number / Specific Word from Verse')}
              </label>

              <div className="relative">
                <div className={`flex h-11 rounded-sm overflow-hidden border shadow-sm transition-all
                  ${showTrans
                    ? 'border-gold/50 ring-2 ring-gold/15'
                    : 'border-maroon/15 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/10'}`}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={e => {
                      const val = e.target.value;
                      setQuery(val);
                      const word = getTransWord(val);
                      if (word) {
                        // Typing English → fetch transliteration, suppress DB suggest
                        fetchTransliteration(word);
                        setShowSuggestions(false);
                      } else {
                        // No trailing English → close trans, open DB suggest
                        setShowTrans(false);
                        setTransSugs([]);
                        fetchSuggestions(val);
                      }
                    }}
                    onFocus={() => {
                      if (transSugs.length > 0) setShowTrans(true);
                      else if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => {
                      setShowSuggestions(false);
                      setShowTrans(false);
                    }, 200)}
                    onKeyDown={e => {
                      if (showTrans && transSugs.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setTransIdx(i => Math.min(i + 1, transSugs.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setTransIdx(i => Math.max(i - 1, 0));
                        } else if (e.key === 'Enter' || e.key === 'Tab') {
                          e.preventDefault();
                          applyTrans(transSugs[transIdx]);
                        } else if (e.key === ' ') {
                          e.preventDefault();
                          applyTrans(transSugs[transIdx], true);
                        } else if (e.key === 'Escape') {
                          setShowTrans(false);
                          setTransSugs([]);
                        }
                      }
                    }}
                    disabled={!selectedSub}
                    placeholder={
                      !selectedSub
                        ? t('முதலில் சுவடியைத் தேர்வு செய்யவும்', 'Select a manuscript first')
                        : t('English phonetics → தமிழ் (e.g. "mayan" → மாயன்) | or Tamil directly | or folio number', 'English phonetics → Tamil (e.g. "mayan" → மாயன்) | Tamil word | or folio number')
                    }
                    className="flex-grow bg-white px-4 text-sm text-maroon font-bold outline-none
                      disabled:bg-stone/3 disabled:text-maroon/25 disabled:cursor-not-allowed
                      placeholder:text-stone/25"
                    style={{ fontFamily: '"Baloo Thambi 2", sans-serif' }}
                    autoComplete="off"
                    spellCheck={false}
                  />

                  {/* Transliteration active indicator */}
                  {showTrans && (
                    <div className="px-2.5 flex items-center border-l border-gold/20 bg-gold/8 shrink-0">
                      <Languages className="w-3.5 h-3.5 text-gold-dark animate-pulse" />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!selectedSub || loading}
                    className="bg-maroon text-white px-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider
                      hover:bg-maroon-light transition-colors disabled:opacity-35 shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {t('தேடுக', 'Search')}
                  </button>
                </div>

                {/* Transliteration dropdown — Google Indic Keyboard style */}
                <AnimatePresence>
                  {showTrans && transSugs.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gold/30 shadow-xl rounded-sm overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gold/[0.06] border-b border-gold/15">
                        <div className="flex items-center gap-1.5">
                          <Languages className="w-3 h-3 text-gold-dark/60" />
                          <span className="font-cinzel text-[8px] font-black text-stone/40 uppercase tracking-[0.3em]">
                            தமிழில் மாற்று · TRANSLITERATE
                          </span>
                        </div>
                        <span className="font-cinzel text-[8px] text-stone/25">
                          ↑↓ navigate · Enter/Space to pick
                        </span>
                      </div>
                      {/* Suggestion list */}
                      <div className="flex flex-wrap gap-0">
                        {transSugs.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); applyTrans(s); }}
                            className={`px-4 py-2.5 tamil-text text-sm font-bold border-r border-b border-maroon/5
                              transition-all duration-100 flex items-center gap-1.5
                              ${i === transIdx
                                ? 'bg-maroon text-white border-maroon'
                                : 'text-maroon hover:bg-gold/8 hover:text-maroon-dark'}`}
                          >
                            <span className={`font-cinzel text-[8px] font-black ${i === transIdx ? 'text-gold/60' : 'text-maroon/20'}`}>
                              {i + 1}
                            </span>
                            {s}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* DB autocomplete dropdown (folio number / word suggestions) */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && !showTrans && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-maroon/15 shadow-xl rounded-sm overflow-hidden"
                    >
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setQuery(String(s.page_number));
                            setShowSuggestions(false);
                            setTimeout(() => handleSearch(), 100);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm tamil-text text-stone/70 font-bold
                            hover:bg-gold/8 hover:text-maroon transition-colors border-b border-maroon/5 last:border-b-0
                            flex items-center gap-3"
                        >
                          <span className="shrink-0 w-6 h-6 bg-maroon/5 rounded-sm flex items-center justify-center
                            font-cinzel text-[9px] font-black text-maroon/40">
                            {s.page_number}
                          </span>
                          <span className="truncate text-xs">{s.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick tip */}
              <p className="mt-1.5 tamil-text text-[10px] text-stone/30 italic">
                {t(
                  'குறிப்பு: ஆங்கிலத்தில் உச்சரிப்பு வழி தட்டச்சிடும்போது (எ.கா. "mayan") தமிழ் மாற்றுகள் கீழே காட்டப்படும். Space / Enter ஐ அழுத்தி தேர்ந்தெடுக்கவும்.',
                  'Tip: Type English phonetics (e.g. "mayan") → pick Tamil from the popup (Space/Enter). Or type a folio number. Or type Tamil directly.'
                )}
              </p>
            </div>

            {/* Bottom row: status + browse */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-maroon/5">
              <p className="tamil-text text-[11px] text-stone/45 italic">
                {selectedSub
                  ? <span className="text-bronze font-bold not-italic">{selectedSubData?.title_tamil}</span>
                  : t('சுவடியைத் தேர்வுசெய்து தேடலை மேற்கொள்ளவும்', 'Select a manuscript to begin your search')}
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

        {/* ── Empty state (manuscript selected but nothing searched) ── */}
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
                <div className="text-center py-16 bg-white border border-maroon/8 rounded-sm">
                  <div className="text-4xl mb-3">📜</div>
                  <p className="tamil-body text-stone/40 text-sm">
                    {t('இந்தத் தேடலுக்கு சுவடி ஏடுகள் எதுவும் கிடைக்கவில்லை.', 'No archival fragments matched your query.')}
                  </p>
                  <p className="font-cinzel text-[9px] text-stone/25 mt-2 uppercase tracking-widest">
                    {t('வேறொரு எண் அல்லது சொல்லில் முயற்சிக்கவும்', 'Try a different number or word')}
                  </p>
                </div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 gap-6">
                  {results.results.map((res, i) => (
                    <SongCard key={i} res={res} i={i} t={t} query={query} onOpen={setActiveView} />
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

      </div>

      {/* ── Folio Viewer Modal ──────────────────────────────── */}
      <AnimatePresence>
        {activeView && (
          <ManuscriptViewer 
            folio={activeView} 
            onClose={() => setActiveView(null)} 
            t={t} 
            activeList={(results?.results || []).find(r => r.id === activeView.id) ? results?.results : (browseResults?.results || []).find(r => r.id === activeView.id) ? browseResults?.results : []}
            onNavigate={(newFolio) => setActiveView(newFolio)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Song / Folio Card
   ═══════════════════════════════════════════════════════ */
const SongCard = ({ res, i, t, compact, query, onOpen }) => {
  const [imgError, setImgError] = useState(false);

  if (compact) {
    /* ── Compact card (browse grid) — keeps existing horizontal-stack layout ── */
    return (
      <motion.div
        variants={fadeUp}
        className="bg-white border border-maroon/10 rounded-sm shadow-md overflow-hidden group
          hover:border-gold/30 hover:shadow-xl transition-all duration-400 flex flex-col h-full"
      >
        {/* Image */}
        <div
          onClick={() => onOpen(res)}
          className="relative bg-stone/3 flex items-center justify-center overflow-hidden
            cursor-zoom-in border-b border-maroon/8 group-hover:bg-ivory transition-colors duration-400 h-40"
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

        {/* Text */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              {res.book_name && (
                <span className="tamil-label text-[10px] font-black text-maroon/70 uppercase tracking-widest truncate">
                  {res.book_name}
                </span>
              )}
              {res.manuscript_name && (
                <span className="tamil-text text-[10px] text-stone/40 font-bold truncate">{res.manuscript_name}</span>
              )}
            </div>
            <div className="shrink-0 ml-2 bg-maroon text-gold px-2 py-0.5 text-[9px] font-black tracking-widest shadow rounded-sm">
              #{res.page_number}
            </div>
          </div>

          {res.text_content ? (
            <div
              className="tamil-heading text-xs text-maroon/85 leading-[2] group-hover:text-maroon transition-colors line-clamp-4"
              style={{ fontStyle: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}
            >
              <HighlightText text={res.text_content} query={query} />
            </div>
          ) : (
            <p className="text-stone/30 italic text-xs">{t('படியெடுக்கப்படவில்லை', 'Transcription pending')}</p>
          )}

          <div className="mt-auto pt-3 border-t border-maroon/5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-gold/60" />
              <span className="font-cinzel text-[8px] text-stone/30 font-bold uppercase tracking-widest">
                {t('ஓலைச்சுவடி', 'PALM LEAF')}
              </span>
            </div>
            {res.image_url && !imgError && (
              <a href={`${API}${res.image_url}`} target="_blank" rel="noopener noreferrer"
                className="tamil-label text-gold text-[9px] font-black hover:text-maroon transition-colors uppercase tracking-wider border-b border-gold/30 pb-0.5">
                {t('முழு படிமம்', 'FULL SCAN')} ↗
              </a>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── Full card (search results) — image on top, text below ── */
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white border border-maroon/10 rounded-sm shadow-md overflow-hidden group
        hover:border-gold/30 hover:shadow-xl transition-all duration-400"
    >
      {/* Palm-leaf image — full width, on top */}
      <div
        onClick={() => onOpen(res)}
        className="relative bg-stone/3 flex items-center justify-center overflow-hidden
          cursor-zoom-in border-b border-maroon/8 group-hover:bg-ivory transition-colors duration-400"
        style={{ height: '220px' }}
      >
        {res.image_url && !imgError ? (
          <>
            <img
              src={`${API}${res.image_url}`}
              alt={`Folio ${res.page_number}`}
              className="w-full h-full object-contain p-4 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-maroon/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 border border-white/20">
                <Maximize className="text-white w-5 h-5" />
              </div>
            </div>
            {/* Folio badge overlaid on image */}
            <div className="absolute top-3 right-3 bg-maroon text-gold px-2.5 py-1 text-[9px] font-black tracking-widest shadow-lg rounded-sm z-10">
              {t('ஏடு', 'FOLIO')} #{res.page_number}
            </div>
          </>
        ) : (
          <div className="text-center p-8 opacity-20">
            <div className="text-5xl mb-2">📜</div>
            <p className="font-cinzel text-[9px] uppercase tracking-widest font-bold">
              {t('சுவடிப் பக்கம்', 'PAGE IMAGE')}
            </p>
          </div>
        )}
      </div>

      {/* Description — below image */}
      <div className="px-6 pt-5 pb-6 flex flex-col">

        {/* Header: book / manuscript labels */}
        <div className="flex items-start justify-between mb-5">
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
          {/* Folio badge only when there is no image (image pane already shows it) */}
          {(!res.image_url || imgError) && (
            <div className="shrink-0 bg-maroon text-gold px-2.5 py-1 text-[9px] font-black tracking-widest shadow rounded-sm">
              {t('ஏடு', 'FOLIO')} #{res.page_number}
            </div>
          )}
        </div>

        {/* ── Manuscript reading container ── */}
        {res.text_content ? (
          <div className="mx-auto w-full max-w-[780px]">

            {/* Decorative top rule */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/30" />
              <span className="text-gold/50 text-[11px] select-none leading-none">✦</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/30" />
            </div>

            {/* Parchment reader box */}
            <div
              className="rounded-sm border border-maroon/10 px-8 py-7 sm:px-10 sm:py-8"
              style={{
                background: '#faf8f2',
                boxShadow: 'inset 0 1px 4px rgba(80,30,10,0.05), 0 2px 12px rgba(80,30,10,0.06)',
              }}
            >
              <div
                className="tamil-heading text-maroon/85 group-hover:text-maroon transition-colors"
                style={{
                  fontStyle: 'normal',
                  fontSize: '1.0625rem',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  textAlign: 'left',
                }}
              >
                <HighlightText text={res.text_content} query={query} />
              </div>
            </div>

            {/* Decorative bottom rule */}
            <div className="flex items-center gap-3 mt-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/20" />
              <span className="text-gold/35 text-[11px] select-none leading-none">✦</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/20" />
            </div>

          </div>
        ) : (
          <p className="text-stone/30 italic text-sm text-center">
            {t('படியெடுக்கப்படவில்லை', 'Transcription pending')}
          </p>
        )}

        {/* Card footer */}
        <div className="mt-6 pt-4 border-t border-maroon/5 flex items-center justify-between">
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
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════
   Manuscript Viewer Modal
   ═══════════════════════════════════════════════════════ */
const ManuscriptViewer = ({ folio, onClose, t, activeList = [], onNavigate }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showText, setShowText] = useState(true);

  const currentIndex = activeList.findIndex(r => r.id === folio.id);
  const totalFolios = activeList.length;

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
          <div className="flex items-center gap-6">
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

            {currentIndex !== -1 && totalFolios > 1 && (
              <div className="flex items-center gap-1.5 pl-5 border-l border-maroon/15 ml-1">
                {/* Previous button */}
                <button
                  onClick={() => onNavigate(activeList[currentIndex - 1])}
                  disabled={currentIndex === 0}
                  title={t('முந்தைய', 'Previous')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-cinzel font-black uppercase tracking-wider transition-all duration-200
                    ${currentIndex === 0
                      ? 'text-maroon/25 border border-maroon/10 cursor-not-allowed'
                      : 'bg-maroon text-gold border border-maroon hover:bg-maroon/90 active:scale-95 shadow-sm hover:shadow-md'}`}
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span className="hidden sm:inline">{t('முன்', 'Prev')}</span>
                </button>

                {/* Folio counter — shows actual page_number of current folio */}
                <div className="px-3 py-1.5 border border-gold/30 bg-gold/5 rounded-sm text-center min-w-[90px]">
                  <p className="font-cinzel text-[8px] uppercase tracking-[0.2em] text-maroon/40 leading-none mb-0.5">
                    {t('ஏடு', 'Folio')}
                  </p>
                  <p className="font-cinzel text-[11px] font-black text-maroon leading-none">
                    #{folio.page_number}
                    <span className="text-maroon/35 font-bold mx-1">/</span>
                    <span className="text-maroon/50">{activeList[totalFolios - 1]?.page_number ?? totalFolios}</span>
                  </p>
                </div>

                {/* Next button */}
                <button
                  onClick={() => onNavigate(activeList[currentIndex + 1])}
                  disabled={currentIndex === totalFolios - 1}
                  title={t('அடுத்தது', 'Next')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-cinzel font-black uppercase tracking-wider transition-all duration-200
                    ${currentIndex === totalFolios - 1
                      ? 'text-maroon/25 border border-maroon/10 cursor-not-allowed'
                      : 'bg-maroon text-gold border border-maroon hover:bg-maroon/90 active:scale-95 shadow-sm hover:shadow-md'}`}
                >
                  <span className="hidden sm:inline">{t('அடு', 'Next')}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
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
              title={showText ? t('சுருக்க', 'Collapse Panel') : t('விரிவாக்க', 'Expand Panel')}
              className={`p-1.5 rounded-full transition-all border
                ${showText ? 'bg-maroon text-white border-maroon shadow' : 'bg-white text-maroon/50 border-maroon/8 hover:text-maroon'}`}>
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
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#111]">
          {/* Image pane */}
          <div className="flex-grow relative overflow-hidden flex items-center justify-center p-8 md:p-14">
            <motion.div
              animate={{ scale: zoom, rotate: rotation }}
              drag
              dragConstraints={{ top: -500, bottom: 500, left: -500, right: 500 }}
              className="relative flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing"
            >
              <img
                src={`${API}${folio.image_url}`}
                className="w-full h-full object-contain shadow-[0_8px_50px_rgba(0,0,0,0.6)] border border-white/5"
                alt="Archival Scan"
                draggable={false}
              />
            </motion.div>
            <div className="absolute top-6 left-6 bg-black/60 text-white/40 font-cinzel text-[9px]
              uppercase tracking-[0.3em] px-3 py-1.5 rounded-full border border-white/5 pointer-events-none">
              {t('நிறுவனக் காப்பகம்', 'Institutional Archive')}
            </div>
          </div>

          {/* Transcription pane */}
          <AnimatePresence>
            {showText && (
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                className="w-full md:w-96 bg-white border-l border-maroon/10 flex flex-col shrink-0"
              >
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-maroon/8 bg-maroon/[0.02]">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <h4 className="tamil-label text-[10px] text-maroon font-black uppercase tracking-widest">
                    {t('எழுத்துப் பிரதி', 'Transcription')}
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <div
                    className="text-stone"
                    style={{
                      fontFamily: '"Noto Sans Tamil", "Noto Sans", sans-serif',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      lineHeight: 2.1,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {folio.text_content
                      ? folio.text_content
                          .replace(/<br\s*\/?>/gi, '\n')
                          .replace(/\\r\\n|\\n/g, '')
                          .replace(/\r\n|\r|\n/g, '\n')
                          .replace(/\t+/g, '')
                          .replace(/\n{3,}/g, '\n\n')
                          .trim()
                      : t('இந்த ஏட்டிற்கு எழுத்துப் பிரதி இல்லை.', 'No transcription available for this folio.')}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Footer */}
        <div className="px-5 py-3 border-t border-maroon/10 bg-ivory shrink-0 z-10">
          <p className="font-cinzel text-[9px] text-stone/50 uppercase tracking-[0.3em] text-center font-bold">
            © CICT | All archival rights reserved.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ManuscriptSearch;
