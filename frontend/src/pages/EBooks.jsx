import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';
import { getBookCover } from '../utils/bookCovers';

const API = 'http://localhost:3001';

const LIBRARIES = [
  { ta: 'மறைமலையடிகள் நூலகம்',           en: 'Maraimalai Adigal Library' },
  { ta: 'உ.வே.சாமிநாதையர் நூல்நிலையம்',  en: 'U.Ve.Swaminatha Iyer Library' },
  { ta: 'ரோஜா முத்தையா ஆராய்ச்சி நூலகம்', en: 'Roja Muthiah Research Library' },
  { ta: 'தமிழ்ப் பல்கலைக்கழக நூலகம்',    en: 'Tamil University Library' },
  { ta: 'தமிழ் இணையக் கல்விக்கழகம்',     en: 'Tamil Virtual Academy' },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const EBooks = () => {
  const { t } = useLanguage();

  const { data: ebooks = [], isLoading } = useQuery({
    queryKey: ['ebooks'],
    queryFn: async () => (await axios.get(`${API}/api/ebooks`)).data,
  });

  return (
    <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white">

      <PageHero
        label={t('மின் நூலகம்', 'DIGITAL LIBRARY')}
        title={t('முதல் அச்சுப் பதிப்புகள்', 'First Printed Editions')}
        subtitle={t(
          'செம்மொழித் தமிழுக்கு ஆதாரமான நூல்களின் முதல் அச்சுப் பதிப்புகளை ஆவணப்படுத்திச் செம்மொழி நிறுவனம் வெளியிடுகிறது.',
          'The Central Institute curates and publishes the earliest printed editions of Classical Tamil foundational texts for global scholarly access.'
        )}
        badge={ebooks.length > 0 ? `${ebooks.length} ${t('நூல்கள்', 'Volumes Available')}` : undefined}
        glyphs={['முதல்', 'அச்சு', 'நூல்', 'பத்து', 'திரு', 'கலி']}
        heroClass="ebooks-hero-bg"
        headingStyle={{
          fontSize: 'clamp(1.7rem, 4.8vw, 3.5rem)',
        }}
      />

      <div className="container mx-auto px-6 max-w-6xl py-20">

        {/* ── Introduction Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-white border border-maroon/10 shadow-xl mb-16 relative overflow-hidden"
        >
          {/* Gold top accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-maroon via-gold to-maroon" />

          <div className="grid lg:grid-cols-2 gap-0">
            {/* Intro */}
            <div className="p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-maroon/5">
              <h2 className="tamil-label text-xl text-maroon border-b border-maroon/10 pb-4 mb-8">
                {t('அறிமுகம்', 'Introduction')}
              </h2>
              <p className="tamil-body text-stone/80 mb-5 font-medium">
                {t(
                  'தமிழின் தொன்மை, தனித்தன்மை, தமிழர்களின் நாகரிகம், பண்பாடு ஆகியவற்றின் சிறப்புகளைக் கவனத்தில் கொண்டு பல்வேறு வெளியீடுகளைக் கொண்டுவருவதைச் செம்மொழி நிறுவனம் குறிக்கோளாகக் கொண்டுள்ளது.',
                  'The Central Institute of Classical Tamil documents the unique heritage of Classical Tamil by publishing digital versions of rare first-printed editions.'
                )}
              </p>
              <p className="tamil-body text-stone/70">
                {t(
                  'செம்மொழித் தமிழுக்கு ஆதாரமாக உள்ள 41 நூல்களின் முதல் அச்சுப் பதிப்புகளை ஆவணப்படுத்திச் செம்மொழித் தமிழாய்வு நிறுவனம் வெளியிடுகிறது.',
                  'The first printed editions of foundational texts are curated and published to ensure wide access for scholars and enthusiasts worldwide.'
                )}
              </p>
            </div>

            {/* Acknowledgements */}
            <div className="p-8 md:p-12 bg-maroon/[0.015]">
              <h2 className="tamil-label text-xl text-maroon border-b border-maroon/10 pb-4 mb-8">
                {t('நன்றியுரை', 'Acknowledgements')}
              </h2>
              <p className="tamil-text text-sm text-stone/60 mb-6 font-bold uppercase tracking-wider">
                {t('இந்த அச்சுப் பதிப்புகளை நிறுவனத்திற்கு வழங்கி உதவிய நூலகங்கள்:', 'Libraries that provided originals to CICT:')}
              </p>
              <ul className="space-y-4">
                {LIBRARIES.map((lib, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-start gap-3 group"
                  >
                    <span className="text-gold mt-1.5 flex-shrink-0 group-hover:scale-125 transition-transform">✦</span>
                    <span className="tamil-text text-stone/70 font-semibold leading-relaxed group-hover:text-maroon transition-colors">
                      {t(lib.ta, lib.en)}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* ── Book Cards ── */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-10 pb-4 border-b border-maroon/8">
            <h2 className="tamil-label text-2xl text-maroon">
              {t('நூல் தொகுப்புகள்', 'Archived Collections')}
            </h2>
            <div className="hidden md:block text-[10px] font-bold text-bronze uppercase tracking-[0.3em]">
              {ebooks.length} {t('நூல்கள்', 'Volumes Available')}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-10 h-10 border-2 border-maroon/10 border-t-gold rounded-full animate-spin" />
              <p className="font-cinzel text-bronze text-[10px] tracking-[0.4em] animate-pulse">
                {t('பதிவிறக்கம் செய்கிறது...', 'ACCESSING ARCHIVES...')}
              </p>
            </div>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8"
            >
              {ebooks.map((book) => (
                <Link
                  key={book.id}
                  to={book.book_url || '#'}
                  className="no-underline text-inherit"
                >
                  <motion.div
                    variants={fadeUp}
                    className="group bg-white border border-maroon/10 shadow hover:shadow-2xl hover:shadow-maroon/5 transition-all duration-500 overflow-hidden flex flex-col h-full cursor-pointer hover:border-gold/30 hover:-translate-y-2 relative"
                  >
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 w-0 group-hover:w-full h-[3px] bg-gradient-to-r from-gold to-gold-light transition-all duration-700" />

                    {/* Cover */}
                    <div className="relative bg-maroon/[0.02] flex items-center justify-center overflow-hidden border-b border-maroon/5 group-hover:bg-ivory transition-colors duration-500"
                         style={{ height: 220 }}>
                      {book.cover_image || getBookCover(book) ? (
                        <img
                          src={getBookCover(book)}
                          alt={book.title_tamil}
                          className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <span className="text-6xl opacity-[0.08]">📚</span>
                      )}
                      {/* Year badge */}
                      <div className="absolute top-3 right-3 bg-maroon text-gold text-[9px] font-bold px-2 py-0.5 shadow-lg opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        {book.first_edition_year || 'N.A.'}
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-maroon/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    {/* Info */}
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="tamil-label text-base text-maroon font-extrabold mb-1 group-hover:text-gold transition-colors line-clamp-1">
                        {book.title_tamil}
                      </h3>
                      <p className="font-cinzel text-[9px] text-bronze uppercase tracking-widest font-bold mb-4 opacity-60">
                        {book.title_english}
                      </p>

                      {book.description_tamil && (
                        <p className="tamil-text text-[13px] text-stone/50 leading-relaxed line-clamp-3 mb-6 font-medium italic">
                          {t(book.description_tamil, book.description_english)}
                        </p>
                      )}

                      <div className="mt-auto pt-4 border-t border-maroon/5 flex items-center justify-between">
                        <span className="text-[9px] text-stone/40 font-cinzel font-bold">
                          {t('ஆவணம்', 'VOL. ARCHIVE')}
                        </span>
                        <span className="text-gold text-[10px] font-bold group-hover:translate-x-1.5 transition-transform tracking-[0.2em] uppercase">
                          {t('படிக்க', 'READ')} →
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Publishing Notes (dark banner) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-maroon relative overflow-hidden shadow-2xl mb-10"
        >
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }} />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

          <div className="relative z-10 p-8 md:p-12">
            <h2 className="tamil-heading text-2xl text-gold mb-8 flex items-center gap-4">
              <span>{t('பதிப்புக் குறிப்புகள்', 'Publishing Excellence')}</span>
              <div className="h-px flex-1 bg-gold/20" />
            </h2>
            <div className="grid lg:grid-cols-2 gap-10 xl:gap-20 text-[15px] leading-loose text-white/70">
              <p className="tamil-body font-medium">
                {t(
                  'தமிழ்ச் செவ்வியல் நூல்களுள் திருக்குறள், நாலடியார் ஆகிய இரு நூல்களே முதன் முதலாக அச்சு வடிவம் பெற்றன. 1812இல் தஞ்சை நகரைச் சேர்ந்த மலையப்பப் பிள்ளையின் மகனாகிய ஞானப்பிரகாசன் எனும் அறிஞர் இவ்விரு நூல்களையும் ஒன்றாக இணைத்து அச்சிட்டு வெளியிட்டார்.',
                  'Among Classical Tamil literary works, Thirukkural and Naladiyar were the pioneers to be printed. In 1812, the scholar Gnana Prakasam of Thanjavur published them together.'
                )}
              </p>
              <p className="tamil-body font-medium">
                {t(
                  'தொல்காப்பியத்தின் அச்சுப் பதிப்பு வரலாறு மழைவை மகாலிங்கையர் பதிப்பித்த எழுத்ததிகார நச்சினார்க்கினியர் உரைப் பதிப்பிலிருந்து தொடங்குகிறது. 1847ஆம் ஆண்டு அப்பதிப்பு வெளிவந்தது.',
                  "Tolkappiyam's printed history began with the 1847 edition of Eluthathikaram, with Nachinarkkiniyar's commentary, published by the scholar Mazhaivai Mahalinga Iyer."
                )}
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default EBooks;
