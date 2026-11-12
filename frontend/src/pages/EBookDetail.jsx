import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Download, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';
import CategoryBanner from '../components/CategoryBanner';
import { getBookCover } from '../utils/bookCovers';
import { downloadPdf } from '../utils/downloadPdf';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

// 12,345 → "12,345" (Indian grouping for large numbers: 1,23,456)
const formatCount = n => new Intl.NumberFormat('en-IN').format(Number(n) || 0);

const EBookDetail = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Scroll to absolute top immediately when the page loads
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Preload the reader (its code and the PDF.js worker it starts) once this page has
  // finished loading and the browser is idle, so pressing READ starts fetching the
  // PDF straight away. Waits for 'load' so it never competes with this page's own
  // banner and covers.
  React.useEffect(() => {
    let idle, timer;
    const preload = () => { import('./FlipbookReader').catch(() => {}); };
    const whenIdle = () => {
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(preload, { timeout: 3000 });
      else timer = setTimeout(preload, 1000);
    };
    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle, { once: true });
    return () => {
      window.removeEventListener('load', whenIdle);
      if (idle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle);
      clearTimeout(timer);
    };
  }, []);

  // `version` (the PDF's last change) is part of the link, so a PDF replaced in the admin
  // panel is never served from a browser's cached copy of the old one
  const handleDownload = (editionId, bookTitle, version) => {
    downloadPdf(`${API}/api/proxy/pdf/${editionId}${version ? `?v=${version}` : ''}`, bookTitle);
    // The server counts the download; show it straight away without reloading the list
    queryClient.setQueryData(['ebook-editions', id], list =>
      Array.isArray(list) ? list.map(e => (e.id === editionId ? { ...e, downloads: (e.downloads || 0) + 1 } : e)) : list);
  };

  // Fetch Parent Book Info
  const { data: book, isLoading: isBookLoading, isError: isBookError } = useQuery({
    queryKey: ['ebook', id],
    queryFn: async () => (await axios.get(`${API}/api/ebooks/${id}`)).data,
  });

  // Fetch Editions for this Book
  const { data: editions = [], isLoading: isEditionsLoading } = useQuery({
    queryKey: ['ebook-editions', id],
    queryFn: async () => (await axios.get(`${API}/api/ebooks/${id}/editions`)).data,
    enabled: !!id,
  });

  // The banner is static, so it renders straight away; only the editions list
  // waits for the API (previously the whole page, banner included, waited).
  if (isBookError || (!isBookLoading && !book)) {
    return (
      <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white flex flex-col items-center justify-center py-40 text-center">
        <h2 className="tamil-heading text-2xl text-maroon mb-6">
          {t('நூல் விவரம் கிடைக்கவில்லை', 'Book Details Not Found')}
        </h2>
        <Link
          to="/ebooks"
          className="inline-flex items-center gap-2 text-gold hover:text-maroon font-bold tamil-label text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('பின்செல்', 'BACK')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white">
      {/* Banner box: the banners' own 1920 × 555 shape at every screen width, so the
          image always fills it exactly. (A fixed 220px minimum on phones left the
          brown background showing below the shorter image.) */}
      <style>{`
        .ebook-detail-banner {
          aspect-ratio: 1920 / 555;
        }
      `}</style>

      {id === '9' ? (
        <section className="ebook-detail-banner relative w-full overflow-hidden bg-[#1A0303]">
          <img
            src="/images/bg/hero_ebook_9_panoramic_fit1920.png"
            alt="Category Banner"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        </section>
      ) : id === '13' ? (
        <section className="ebook-detail-banner relative w-full overflow-hidden bg-[#1A0303]">
          <img
            src="/images/bg/hero_ebook_13_panoramic_fit1920.png"
            alt="Category Banner"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        </section>
      ) : id === '11' ? (
        <section className="ebook-detail-banner relative w-full overflow-hidden bg-[#1A0303]">
          <img
            src="/images/bg/hero_ebook_11_panoramic_fit1920.png"
            alt="Category Banner"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        </section>
      ) : id === '15' ? (
        <section className="ebook-detail-banner relative w-full overflow-hidden bg-[#1A0303]">
          <img
            src="/images/bg/hero_ebook_15_panoramic_fit1920.png"
            alt="Category Banner"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        </section>
      ) : id === '16' ? (
        <section className="ebook-detail-banner relative w-full overflow-hidden bg-[#1A0303]">
          <img
            src="/images/bg/hero_ebook_16_panoramic_fit1920.png"
            alt="Category Banner"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        </section>
      ) : id === '17' ? (
        <section className="ebook-detail-banner relative w-full overflow-hidden bg-[#1A0303]">
          <img
            src="/images/bg/hero_ebook_17_panoramic_fit1920.png"
            alt="Category Banner"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        </section>
      ) : id === '12' ? (
        <section className="ebook-detail-banner relative w-full overflow-hidden bg-[#1A0303]">
          <img
            src="/images/bg/hero_panoramic_12_fit1920.png"
            alt="Category Banner"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        </section>
      ) : id === '10' ? (
        <section className="ebook-detail-banner relative w-full overflow-hidden bg-[#1A0303]">
          <img
            src="/hero_ebook_10.jpg"
            alt="Ettuthogai Banner"
            fetchPriority="high"
            className="w-full h-full object-contain p-2 sm:p-8 md:p-12 drop-shadow-2xl"
          />
        </section>
      ) : (
        <PageHero
          label={t('மின் நூலகம் · பதிப்புகள்', 'DIGITAL LIBRARY · EDITIONS')}
          title={book?.title_tamil}
          subtitle={book?.title_english}
          badge={editions.length > 0 ? `${editions.length} ${t('பதிப்புகள்', 'Editions Available')}` : t('பதிப்புகள் இல்லை', 'No Editions')}
          glyphs={['நூல்', 'அச்சு', 'எழுத்து', 'சொல்', 'பொருள்']}
        />
      )}

      <div className={`container mx-auto px-6 max-w-6xl ${id === '10' ? 'pt-[24px] pb-16' : 'py-16'}`}>
        {/* Back Link (every book, Ettuthogai included) */}
        <div className={id === '10' ? 'mb-8' : 'mb-12'}>
          <Link
            to="/ebooks"
            className="inline-flex items-center gap-2 group text-stone/50 hover:text-maroon tamil-label text-sm font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('பின்செல்', 'BACK')}
          </Link>
        </div>

        {/* Editions Listing */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-10 pb-4 border-b border-maroon/8">
            <h2 className="tamil-label text-2xl text-maroon">
              {t('பதிப்புகளின் விவரங்கள்', 'Edition Catalogues')}
            </h2>
            {!isEditionsLoading && (
              <div className="hidden md:block text-[10px] font-bold text-bronze uppercase tracking-[0.3em]">
                {editions.length} {t('பதிப்புகள்', 'Editions Listed')}
              </div>
            )}
          </div>

          {isBookLoading || isEditionsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-2 border-maroon/10 border-t-gold rounded-full animate-spin" />
              <p className="font-cinzel tracking-[0.4em] text-bronze animate-pulse uppercase text-[10px]">
                {t('பதிவேடுகளைத் திரட்டுகிறது…', 'RETRIEVING EDITIONS…')}
              </p>
            </div>
          ) : editions.length === 0 ? (
            <div className="text-center py-20 bg-white border border-maroon/10 shadow-lg">
              <p className="font-cinzel text-stone/40 text-[10px] tracking-[0.4em] uppercase">
                {t('பதிப்புகள் எதுவும் ஆவணப்படுத்தப்படவில்லை', 'No editions documented for this volume')}
              </p>
            </div>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.05 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {editions.map((edition, idx) => (
                <motion.div
                  key={edition.id}
                  variants={fadeUp}
                  className="group bg-white border border-maroon/10 p-6 flex flex-col justify-between shadow-md hover:shadow-2xl hover:shadow-maroon/5 hover:border-gold/30 transition-all duration-500 relative overflow-hidden min-h-[260px]"
                >
                  {/* Top gradient accent line visible on hover */}
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-maroon via-gold to-maroon transform -translate-y-full group-hover:translate-y-0 transition-transform duration-500" />

                  <div>
                    {/* Edition Cover (Flat Image with 3D Opening Effect) */}
                    <div className="book-3d-wrapper w-full h-[260px] mb-6 flex items-center justify-center">
                      <div className="book-3d-container relative w-[150px] h-[220px]">
                        {/* Front Cover */}
                        <div className="book-3d-cover absolute inset-0 z-20 bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.3)] border border-black/5">
                          <img
                            src={getBookCover(edition)}
                            alt={edition.title_tamil}
                            // First row (up to 3 on desktop) loads immediately; the rest as they near the screen
                            loading={idx < 3 ? 'eager' : 'lazy'} decoding="async"
                            className="w-full h-full object-contain p-1"
                          />
                          {/* Lighting overlay on hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay" />
                        </div>

                        {/* Book Block / Pages (visible behind the cover when open) */}
                        <div
                          className="absolute inset-0 z-10 origin-left bg-[#f8f5f0] border border-stone-300 shadow-xl rounded-r-[2px]"
                          style={{ transform: 'translateZ(-8px)' }}
                        >
                          {/* Pages Edge Texture */}
                          <div className="absolute right-0 top-[2%] bottom-[2%] w-[8px] bg-[#fdfdfc] border-l border-[#e0dacd] flex flex-col justify-evenly overflow-hidden">
                            <div className="w-full h-[1px] bg-stone-200" />
                            <div className="w-full h-[1px] bg-stone-200" />
                            <div className="w-full h-[1px] bg-stone-200" />
                            <div className="w-full h-[1px] bg-stone-200" />
                            <div className="w-full h-[1px] bg-stone-200" />
                          </div>
                          {/* Inside cover gradient */}
                          <div className="absolute inset-0 bg-gradient-to-r from-stone-300 to-[#f8f5f0] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Floating Publication Year Badge */}
                    {edition.year_published && (
                      <div className="absolute top-4 right-4 bg-maroon text-gold text-[10px] font-bold px-2 py-1 shadow-md z-10 group-hover:bg-gold group-hover:text-maroon transition-colors">
                        {edition.year_published}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="tamil-label text-base text-black font-extrabold leading-relaxed mb-2 group-hover:text-maroon transition-colors duration-300">
                      {edition.title_tamil}
                    </h3>
                    <div className="mt-auto" />
                  </div>

                  {/* Footer: read / download counts, then the Download & Read buttons. On
                      narrow cards the buttons move below the counts instead of squeezing. */}
                  <div className="mt-6 pt-6 border-t border-maroon/5 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
                    <div className="flex items-center gap-3 text-stone/60 text-xs font-bold tabular-nums">
                      <span
                        className="inline-flex items-center gap-1"
                        title={t('பார்வைகள்', 'Views')}
                        aria-label={`${t('பார்வைகள்', 'Views')}: ${formatCount(edition.views)}`}
                      >
                        <Eye className="w-4 h-4 text-bronze" aria-hidden="true" />
                        {formatCount(edition.views)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1"
                        title={t('பதிவிறக்கங்கள்', 'Downloads')}
                        aria-label={`${t('பதிவிறக்கங்கள்', 'Downloads')}: ${formatCount(edition.downloads)}`}
                      >
                        <Download className="w-4 h-4 text-bronze" aria-hidden="true" />
                        {formatCount(edition.downloads)}
                      </span>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                    <button
                      onClick={() => handleDownload(edition.id, edition.title_tamil, edition.pdf_version)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-maroon hover:bg-maroon hover:text-white tamil-label text-sm font-bold transition-all border border-maroon/30 shadow-md hover:shadow-lg hover:scale-105 transform duration-300"
                    >
                      <span>{t('பதிவிறக்கு', 'DOWNLOAD')}</span>
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        // All editions read from local storage via backend PDF proxy
                        const back = encodeURIComponent(`/ebooks/${id}`);
                        const title = encodeURIComponent(edition.title_tamil);
                        const version = edition.pdf_version ? `&v=${edition.pdf_version}` : '';
                        navigate(`/ebooks/${id}/read?edition=${edition.id}&title=${title}&back=${back}${version}`);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-maroon text-white hover:bg-gold hover:text-maroon tamil-label text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 transform duration-300"
                    >
                      <span>{t('படிக்க', 'READ')}</span>
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
};

export default EBookDetail;
