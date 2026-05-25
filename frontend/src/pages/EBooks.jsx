import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const API = 'http://localhost:3001';

// Book descriptions from the real website
const BOOK_DESCRIPTIONS = {
  9:  { ta: 'தொல்காப்பியத்தின் அச்சுப் பதிப்பு வரலாறு 1847ஆம் ஆண்டு மகாலிங்கையரின் பதிப்பிலிருந்து தொடங்குகிறது.', en: 'The printing history of Tolkappiyam begins with Mahalinga Iyer\'s 1847 edition.' },
  10: { ta: 'கலித்தொகை 1887ஆம் ஆண்டு சி.வை. தாமோதரம் பிள்ளை நச்சினார்க்கினியர் உரையுடன் வெளியிட்டது சங்க இலக்கிய பதிப்பு வரலாற்றின் தொடக்கம்.', en: 'Kalitogai, published in 1887 by C.W. Damodaram Pillai, marked the start of Sangam literature printing.' },
  11: { ta: 'பத்துப்பாட்டினுள் ஒன்றாகிய திருமுருகாற்றுப்படைக்கு பல அச்சுப் பதிப்புகள் வெளிவந்துள்ளன.', en: 'Several printed editions of Thirumurugatruppadai, a text of Pattupattu, have been published.' },
  12: { ta: '1872ஆம் ஆண்டில் சிலப்பதிகாரம் முதன் முதலாக அச்சுவடிவம் பெற்றது.', en: 'Silappatikaram first received a printed form in 1872.' },
  13: { ta: 'திருக்குறள், நாலடியார் ஆகிய இரு நூல்களே முதன் முதலாக அச்சு வடிவம் பெற்றன — 1812இல்.', en: 'Thirukkural and Naladiyar were the first to be printed in 1812.' },
  15: { ta: '1883இல் இறையனார் களவியலுரைக்கு முதல் அச்சுப் பதிப்பு வெளிவந்துள்ளது.', en: 'The first printed edition of Irayanar Kalaviyal-urai appeared in 1883.' },
  16: { ta: '1905இல் முத்தொள்ளாயிரத்திற்கு முதல் அச்சுப் பதிப்பு வெளிவந்துள்ளது.', en: 'The first printed edition of Muttollayiram was published in 1905.' },
};

const BOOK_YEAR_MAP = {
  9:  '1847', 10: '1887', 11: '1885',
  12: '1872', 13: '1812', 15: '1883', 16: '1905',
};

const EBooks = () => {
  const { t } = useLanguage();

  const { data: ebooks = [], isLoading } = useQuery({
    queryKey: ['ebooks'],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/ebooks`);
      return res.data;
    },
  });

  return (
    <div className="pt-32 pb-24 bg-ivory min-h-screen selection:bg-maroon selection:text-white">
      <div className="container mx-auto px-6 max-w-6xl">

        {/* Header */}
        <header className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-bronze font-cinzel text-[10px] uppercase tracking-[0.5em] mb-4">
              {t('மின் நூலகம்', 'DIGITAL LIBRARY')}
            </p>
            <h1 className="tamil-heading text-5xl md:text-6xl text-maroon mb-6 italic">
              {t('முதல் அச்சுப் பதிப்புகள்', 'First Printed Editions')}
            </h1>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-[1px] w-12 bg-gold/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
              <div className="h-[1px] w-12 bg-gold/50" />
            </div>
          </motion.div>
        </header>

        {/* Introduction Panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white border border-maroon/10 shadow-xl p-8 md:p-12 mb-16 relative overflow-hidden"
        >
          {/* Decorative corner */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none">
            <svg viewBox="0 0 100 100" fill="currentColor" className="text-maroon">
              <path d="M100,0 V100 H0 Q100,100 100,0" />
            </svg>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 relative z-10">
            <div>
              <h2 className="tamil-label text-xl text-maroon border-b border-maroon/10 pb-4 mb-8">
                {t('அறிமுகம்', 'Introduction')}
              </h2>
              <p className="tamil-body text-stone/80 mb-6 font-medium">
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
            <div>
              <h2 className="tamil-label text-xl text-maroon border-b border-maroon/10 pb-4 mb-8">
                {t('நன்றியுரை', 'Acknowledgements')}
              </h2>
              <p className="tamil-text text-sm text-stone/60 mb-6 font-bold uppercase tracking-wider">
                {t(
                  'இந்த அச்சுப் பதிப்புகளை நிறுவனத்திற்கு வழங்கி உதவிய நூலகங்கள்:',
                  'Libraries that provided originals to CICT:'
                )}
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { ta: 'மறைமலையடிகள் நூலகம்', en: 'Maraimalai Adigal Library' },
                  { ta: 'உ.வே.சாமிநாதையர் நூல்நிலையம்', en: 'U.Ve.Swaminatha Iyer Library' },
                  { ta: 'ரோஜா முத்தையா ஆராய்ச்சி நூலகம்', en: 'Roja Muthiah Research Library' },
                  { ta: 'தமிழ்ப் பல்கலைக்கழக நூலகம்', en: 'Tamil University Library' },
                  { ta: 'தமிழ் இணையக் கல்விக்கழகம்', en: 'Tamil Virtual Academy' },
                ].map((lib, i) => (
                  <motion.li 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-start gap-3"
                  >
                    <span className="text-gold mt-1.5 flex-shrink-0">✦</span>
                    <span className="tamil-text text-stone/70 font-semibold leading-relaxed">
                      {t(lib.ta, lib.en)}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* E-Book Cards Grid */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-10 pb-4 border-b border-maroon/5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8">
              {ebooks.map((book, idx) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white border border-maroon/10 shadow hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col h-full cursor-pointer hover:border-gold/30 hover:-translate-y-1.5"
                >
                  {/* Cover */}
                  <div className="relative bg-maroon/[0.02] flex items-center justify-center overflow-hidden border-b border-maroon/5 group-hover:bg-ivory transition-colors duration-500"
                       style={{ height: 220 }}>
                    {book.cover_image ? (
                      <img
                        src={`${API}${book.cover_image}`}
                        alt={book.title_tamil}
                        className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <span className="text-6xl opacity-[0.08]">📚</span>
                    )}
                    {/* Badge */}
                    <div className="absolute top-4 right-4 bg-maroon text-gold text-[9px] font-bold px-2 py-0.5 shadow-lg opacity-0 translate-y-[-10px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      {BOOK_YEAR_MAP[book.id] || 'N.A.'}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="tamil-label text-base text-maroon font-extrabold mb-1 group-hover:text-gold transition-colors line-clamp-1">
                      {book.title_tamil}
                    </h3>
                    <p className="font-cinzel text-[9px] text-bronze uppercase tracking-widest font-bold mb-4 opacity-60">
                      {book.title_english}
                    </p>
                    
                    {BOOK_DESCRIPTIONS[book.id] && (
                      <p className="tamil-text text-[13px] text-stone/50 leading-relaxed line-clamp-3 mb-6 font-medium italic">
                        {t(BOOK_DESCRIPTIONS[book.id].ta, BOOK_DESCRIPTIONS[book.id].en)}
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
              ))}
            </div>
          )}
        </div>

        {/* Publishing Notes */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="bg-maroon relative overflow-hidden shadow-2xl p-8 md:p-12 mb-10"
        >
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }} />
          
          <div className="relative z-10">
            <h2 className="tamil-heading text-2xl text-gold mb-8 flex items-center gap-4">
              <span>{t('பதிப்புக் குறிப்புகள்', 'Publishing Excellence')}</span>
              <div className="h-[1px] flex-1 bg-gold/20" />
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
                  'Tolkappiyam\'s printed history began with the 1847 edition of Eluthathikaram, with Nachinarkkiniyar\'s commentary, published by the scholar Mazhaivai Mahalinga Iyer.'
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
