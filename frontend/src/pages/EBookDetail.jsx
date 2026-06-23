import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';

const API = 'http://localhost:3001';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const EBookDetail = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();

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

  if (isBookLoading || isEditionsLoading) {
    return (
      <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white flex flex-col items-center justify-center py-40 space-y-4">
        <div className="w-12 h-12 border-2 border-maroon/10 border-t-gold rounded-full animate-spin" />
        <p className="font-cinzel tracking-[0.4em] text-bronze animate-pulse uppercase text-[10px]">
          {t('பதிவேடுகளைத் திரட்டுகிறது…', 'RETRIEVING EDITIONS…')}
        </p>
      </div>
    );
  }

  if (isBookError || !book) {
    return (
      <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white flex flex-col items-center justify-center py-40 text-center">
        <h2 className="tamil-heading text-2xl text-maroon mb-6">
          {t('நூல் விவரம் கிடைக்கவில்லை', 'Book Details Not Found')}
        </h2>
        <Link
          to="/ebooks"
          className="inline-flex items-center gap-2 text-gold hover:text-maroon font-bold font-cinzel text-xs tracking-widest uppercase transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('நூலகத்திற்குத் திரும்புக', 'BACK TO LIBRARY')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white">
      <PageHero
        label={t('மின் நூலகம் · பதிப்புகள்', 'DIGITAL LIBRARY · EDITIONS')}
        title={book.title_tamil}
        subtitle={book.title_english}
        badge={editions.length > 0 ? `${editions.length} ${t('பதிப்புகள்', 'Editions Available')}` : t('பதிப்புகள் இல்லை', 'No Editions')}
        glyphs={['நூல்', 'அச்சு', 'எழுத்து', 'சொல்', 'பொருள்']}
      />

      <div className="container mx-auto px-6 max-w-6xl py-16">
        {/* Back Link */}
        <div className="mb-12">
          <Link
            to="/ebooks"
            className="inline-flex items-center gap-2 group text-stone/50 hover:text-maroon font-cinzel text-[10px] font-bold uppercase tracking-[0.3em] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('நூலகத்திற்குத் திரும்புக', 'BACK TO LIBRARY')}
          </Link>
        </div>

        {/* Editions Listing */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-10 pb-4 border-b border-maroon/8">
            <h2 className="tamil-label text-2xl text-maroon">
              {t('பதிப்புகளின் விவரங்கள்', 'Edition Catalogues')}
            </h2>
            <div className="hidden md:block text-[10px] font-bold text-bronze uppercase tracking-[0.3em]">
              {editions.length} {t('பதிப்புகள்', 'Editions Listed')}
            </div>
          </div>

          {editions.length === 0 ? (
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
              {editions.map((edition) => (
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
                              src={`${API}${book.cover_image}`}
                              alt={edition.title_tamil}
                              className="w-full h-full object-fill"
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

                      {/* Flipbook available chip */}
                      {edition.image_folder && (
                        <div className="inline-flex items-center gap-1 mb-3 px-2 py-0.5 bg-gold/10 border border-gold/25 rounded-sm">
                          <span className="text-gold text-[8px] font-bold tracking-widest uppercase">✦ FLIPBOOK</span>
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="tamil-label text-base text-black font-extrabold leading-relaxed mb-2 group-hover:text-maroon transition-colors duration-300">
                        {edition.title_tamil}
                      </h3>
                      {edition.title_english && (
                        <p className="font-cinzel text-[10px] text-black font-bold uppercase tracking-widest mb-4">
                          {edition.title_english}
                        </p>
                      )}

                      {/* Editor & Publisher */}
                      <div className="mt-auto pt-4 border-t border-maroon/5 space-y-2">
                        {edition.editor && (
                          <p className="tamil-label text-[12px] text-black font-semibold">
                            <span className="font-cinzel text-[10px] uppercase tracking-widest text-black font-bold mr-2">Ed:</span>
                            {edition.editor}
                          </p>
                        )}
                        {edition.publisher && (
                          <p className="tamil-label text-[12px] text-black font-semibold">
                            <span className="font-cinzel text-[10px] uppercase tracking-widest text-black font-bold mr-2">Pub:</span>
                            {edition.publisher}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer / Read Action */}
                    <div className="mt-6 pt-6 border-t border-maroon/5 flex items-center justify-between">
                      <span className="text-[9px] text-stone/40 font-cinzel font-bold">
                        {edition.image_folder ? 'FLIPBOOK' : 'PDF FLIPBOOK'}
                      </span>
                      <button
                        onClick={() => {
                          const back = encodeURIComponent(`/ebooks/${id}`);
                          const title = encodeURIComponent(edition.title_tamil);
                          if (edition.image_folder && edition.total_pages) {
                            // Fast image-based flipbook
                            const imageBase = encodeURIComponent(
                              `https://suvadi.cict.in/asp/ebooks/${edition.image_folder}/files/mobile/`
                            );
                            navigate(`/ebooks/${id}/read?imageBase=${imageBase}&pages=${edition.total_pages}&title=${title}&back=${back}`);
                          } else {
                            // PDF-based flipbook via backend proxy
                            const pdfUrl = encodeURIComponent(edition.pdf_url);
                            navigate(`/ebooks/${id}/read?pdfUrl=${pdfUrl}&title=${title}&back=${back}`);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-maroon text-white hover:bg-gold hover:text-maroon text-[10px] font-bold uppercase tracking-widest transition-all shadow-md hover:shadow-lg hover:scale-105 transform duration-300"
                      >
                        <span>{t('படிக்க', 'READ')}</span>
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
            </motion.div>
          )}
        </div>

        {/* Decorative Institutional Note */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white border border-maroon/10 p-8 text-center max-w-3xl mx-auto shadow-lg relative"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gold flex items-center justify-center text-maroon text-[8px] font-bold shadow-md">
            ✦
          </div>
          <p className="tamil-body text-xs text-stone/50 italic leading-loose">
            {t(
              'இங்குக் குறிப்பிடப்பட்டுள்ள மின் பதிப்புகள் அனைத்தும் ஆய்வாளர்களின் பயன்பாட்டிற்காகவே வழங்கப்படுகின்றன. எவ்வித வணிகப் பயன்பாட்டிற்கும் அனுமதி இல்லை.',
              'All digitised publications provided here are exclusively for research and scholarly analysis. Commercial usage of these archives is strictly prohibited.'
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default EBookDetail;
