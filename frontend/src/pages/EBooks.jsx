import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';
import { getBookCover } from '../utils/bookCovers';
import FallbackImg from '../components/FallbackImg';
import { usePageContent, useBanner } from '../content/SiteContentProvider';
import RichText, { toBlocks, splitByHeading } from '../content/RichText';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// திட்ட உருவாக்கக் குழு — shown at the end of the editions list (as on the old site)
const PROJECT_TEAM = [
  { photo: 'director.jpg', role: 'திட்டத் தலைமையும் ஒருங்கிணைப்பும்', name: 'பேராசிரியர் இரா. சந்திரசேகரன்', designation: 'இயக்குநர்' },
  { photo: 'venki.jpg', role: 'திட்ட ஆக்கம்', name: 'முனைவர் இரா. வெங்கடேசன்', designation: 'இளநிலை ஆராய்ச்சி அலுவலர்' },
  { photo: 'ams.jpg', role: 'தொழில்நுட்ப வடிவமைப்பு', name: 'திரு. அ. முருக சுவாமிநாதன்', designation: 'நிரலாளர்' },
];




/* Paragraphs of an editable section (admin Page Content → E-Books), as plain <p>s with
   the given class; a paragraph that is only bold text is a sub-heading. Lists keep their
   bullets / numbers. */
function SectionParagraphs({ html, pClass, boldClass }) {
  return toBlocks(html).map((b, i) => {
    if (b.tag === 'ol' || b.tag === 'ul') {
      return <RichText key={i} as={b.tag} className={`${b.tag === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 space-y-2`} html={b.items.map(it => `<li>${it.html}</li>`).join('')} justify />;
    }
    const bold = /^\s*<(strong|b)>[\s\S]*<\/\1>\s*$/i.test(b.html) && !/<\/(strong|b)>[\s\S]*<(strong|b)>/i.test(b.html);
    // h4 ("Sub-heading" in the admin editor): a main division, with more space above it
    if (b.tag === 'h3' || b.tag === 'h4' || bold) {
      return <RichText key={i} as="p" className={b.tag === 'h4' ? `${boldClass} mt-8` : boldClass} html={b.html.replace(/^\s*<(strong|b)>|<\/(strong|b)>\s*$/gi, '')} />;
    }
    return <RichText key={i} as="p" className={pClass} html={b.html} justify />;
  });
}

function ProjectTeam({ title }) {
  return (
    <div className="mt-14 pt-10 border-t border-maroon/10">
      {title && <div className="text-center font-bold text-maroon text-xl mb-8">{title}</div>}
      <div className="grid grid-cols-1 sm:max-w-md sm:mx-auto lg:max-w-none lg:grid-cols-3 gap-6">
        {PROJECT_TEAM.map(m => (
          <div
            key={m.photo}
            className="relative bg-ivory/60 border border-maroon/10 rounded-lg p-5 flex flex-col items-center gap-4 text-center shadow-sm"
          >
            <div className="absolute top-0 left-0 w-full h-[3px] rounded-t-lg bg-gradient-to-r from-maroon via-gold to-maroon" />
            <img
              src={`${API}/images/team/${m.photo}`}
              alt={m.name}
              width={112}
              height={132}
              loading="lazy"
              decoding="async"
              className="w-[112px] h-[132px] shrink-0 object-cover rounded-md border-2 border-gold/40 shadow"
            />
            <div className="min-w-0" style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }}>
              <p className="text-maroon font-bold text-sm leading-snug">{m.role}</p>
              <p className="text-ink font-bold mt-1.5 leading-snug">{m.name}</p>
              <p className="text-stone/70 text-sm mt-1 leading-snug">{m.designation}</p>
              <p className="text-stone/70 text-sm leading-snug">{'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const CornerOrnament = ({ position }) => {
  const styles = {
    'top-left': { top: '8px', left: '8px' },
    'top-right': { top: '8px', right: '8px', transform: 'scaleX(-1)' },
    'bottom-left': { bottom: '8px', left: '8px', transform: 'scaleY(-1)' },
    'bottom-right': { bottom: '8px', right: '8px', transform: 'scale(-1)' },
  };
  return (
    <img
      src="/images/gold_corner.png"
      alt="corner ornament"
      className="absolute pointer-events-none select-none w-16 h-16 opacity-100 contrast-125"
      style={styles[position]}
    />
  );
};

const PandyaCorner = ({ className, style }) => (
  <img
    src="/images/pandya_corner.png"
    alt="pandya corner decoration"
    // Sized with the screen so the book cards never reach the ornament (see the Book Cards section)
    className={`absolute pointer-events-none select-none w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] md:w-[200px] md:h-[200px] lg:w-[240px] lg:h-[240px] xl:w-[280px] xl:h-[280px] 2xl:w-[320px] 2xl:h-[320px] opacity-100 drop-shadow-md ${className}`}
    style={style}
  />
);

const TitleFlourishLeft = () => (
  <img
    src="/images/gold_flourish_left.png"
    alt="flourish"
    className="w-12 h-auto object-contain inline-block align-middle mr-3 opacity-100 contrast-125"
  />
);

const TitleFlourishRight = () => (
  <img
    src="/images/gold_flourish_right.png"
    alt="flourish"
    className="w-12 h-auto object-contain inline-block align-middle ml-3 opacity-100 contrast-125"
  />
);

const EBooks = () => {
  const { t, language } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);
  const c = usePageContent('ebooks');   // admin Page Content → E-Books
  const intro = c.section('intro');
  const details = c.section('details');
  const heroBanner = useBanner('ebooks.hero');

  const { data: fetchedEbooks = [], isLoading } = useQuery({
    queryKey: ['ebooks'],
    queryFn: async () => (await axios.get(`${API}/api/ebooks`)).data,
  });

  // Inject Manimekalai and Irayanar categories dynamically
  const ebooks = [
    ...fetchedEbooks,
    { id: 17, title_tamil: 'மணிமேகலை', edition_count: 2, book_url: '/ebooks/17' },
    { id: 15, title_tamil: 'இறையனார் அகப்பொருள்', edition_count: 1, book_url: '/ebooks/15' }
  ];

  return (
    <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white">
      <style>{`
        @media (min-width: 640px) {
          .ebooks-hero-bg {
            aspect-ratio: 1920 / 555 !important;
            min-height: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
        }
      `}</style>

      <PageHero
        label={heroBanner.text('label')}
        title={heroBanner.text('title')}
        subtitle={t(
          'செம்மொழித் தமிழுக்கு ஆதாரமான நூல்களின் முதல் அச்சுப் பதிப்புகளை ஆவணப்படுத்திச் செம்மொழி நிறுவனம் வெளியிடுகிறது.',
          'The Central Institute curates and publishes the earliest printed editions of Classical Tamil foundational texts for global scholarly access.'
        )}
        badge={undefined}
        glyphs={['முதல்', 'அச்சு', 'நூல்', 'பத்து', 'திரு', 'கலி']}
        backgroundImage={heroBanner.image}
        mobileBackgroundImage={heroBanner.imageMobile}
        heroClass="ebooks-hero-bg"
        headingStyle={
          language === 'ta'
            ? { fontSize: 'clamp(1rem, 3.5vw, 2.8rem)', whiteSpace: 'normal', wordBreak: 'break-word' }
            : { fontSize: 'clamp(1.2rem, 4.8vw, 3.5rem)', whiteSpace: 'normal', wordBreak: 'break-word' }
        }
      />

      <div className="w-full">
        {/* ── Introduction / Publication Details Panel ── */}
        <div className="mx-auto w-[95%] max-w-[1700px] pt-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-white border border-maroon/10 shadow-xl mb-16 relative overflow-hidden rounded-lg"
          >
            {/* Gold top accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-maroon via-gold to-maroon" />

            <div lang="ta" className="p-4 sm:p-8 md:p-12 lg:p-16 max-h-[70vh] overflow-y-auto scrollbar-custom">
            <style>{`
              .scrollbar-custom::-webkit-scrollbar { width: 6px; }
              .scrollbar-custom::-webkit-scrollbar-track { background: rgba(201,151,59,0.05); }
              .scrollbar-custom::-webkit-scrollbar-thumb { background: rgba(92,26,8,0.5); border-radius: 3px; }
              .scrollbar-custom::-webkit-scrollbar-thumb:hover { background: rgba(92,26,8,0.8); }
            `}</style>

            {/* Back button (visible only in details view) */}
            {showDetails && (
              <button
                onClick={() => setShowDetails(false)}
                className="flex items-center gap-2 mb-6 text-maroon hover:text-gold transition-colors duration-300 group"
                style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }}
              >
                <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span>
                <span className="text-sm font-bold">{'அறிமுகத்திற்குச் செல்க'}</span>
              </button>
            )}

            {!showDetails ? (
              /* ═══════════ INTRODUCTION VIEW ═══════════ */
              <div>
                <h2 className="tamil-label text-2xl text-maroon border-b border-maroon/10 pb-4 mb-8">
                  {intro.title}
                </h2>

                <div className="space-y-6 text-stone/80 tamil-body leading-loose text-[15px] text-justify">
                  {/* Introduction window — admin Page Content → E-Books (each heading = a box) */}
                  {splitByHeading(intro.body).map((sec, i) => (
                    <div key={i} className="bg-[#FAF8F2] border border-gold/20 rounded-lg p-4 sm:p-6 md:p-8">
                      {sec.title && (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-gold" />
                            <h3 className="font-bold text-lg text-maroon" style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }}>
                              {sec.title}
                            </h3>
                          </div>
                          <div className="h-px w-full bg-gradient-to-r from-gold/40 via-gold/15 to-transparent mb-5" />
                        </>
                      )}
                      <div className="cms-flow">
                        <SectionParagraphs html={sec.html} boldClass="font-bold text-maroon" />
                      </div>
                    </div>
                  ))}

                  {/* View Publication Details Button */}
                  <div className="flex justify-center pt-6 pb-2">
                    <button
                      onClick={() => setShowDetails(true)}
                      className="px-8 py-3 bg-maroon text-white font-bold rounded-md shadow-lg hover:bg-[#5C1A08] hover:shadow-xl transition-all duration-300 active:scale-[0.97]"
                      style={{ fontFamily: '"Noto Sans Tamil", sans-serif', fontSize: '1rem' }}
                    >
                      {details.title}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ═══════════ PUBLICATION DETAILS VIEW ═══════════ */
              <div>
                <h2 className="tamil-label text-2xl text-maroon border-b border-maroon/10 pb-4 mb-6">
                  {'செம்மொழித் தமிழ் நூல்களின் முதல் அச்சுப் பதிப்புகள் - அறிமுகம் & பதிப்புக் குறிப்புகள்'}
                </h2>

                <div className="space-y-6 text-stone/80 tamil-body leading-loose text-[15px]">
                  <p className="font-bold text-lg text-maroon">
                    {details.title}
                  </p>

                  {/* Publication details — admin Page Content → E-Books (each heading = a centred title) */}
                  {splitByHeading(details.body).map((sec, i) => (
                    <React.Fragment key={i}>
                      {sec.title && <div className={`text-center font-bold text-maroon text-xl ${i === 0 ? 'mt-8' : 'mt-12'} mb-4`}>{sec.title}</div>}
                      <div className="space-y-6 cms-details">
                        <SectionParagraphs html={sec.html} pClass="text-justify" boldClass="font-bold" />
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Project team (திட்ட உருவாக்கக் குழு) */}
                  <ProjectTeam title={'திட்ட உருவாக்கக் குழு'} />

                  {/* Back to introduction button */}
                  <div className="flex justify-center pt-8 pb-2">
                    <button
                      onClick={() => setShowDetails(false)}
                      className="px-8 py-3 bg-maroon text-white font-bold rounded-md shadow-lg hover:bg-[#5C1A08] hover:shadow-xl transition-all duration-300 active:scale-[0.97]"
                      style={{ fontFamily: '"Noto Sans Tamil", sans-serif', fontSize: '1rem' }}
                    >
                      {'அறிமுகத்திற்குச் செல்க'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>
        </div>

        {/* ── Book Cards ── */}
        {/* Bottom padding keeps the last row of cards above the bottom ornaments' horizontal arm
            (the arm reaches far inward close to the bottom edge); it grows with the ornament size. */}
        <div className="relative mt-20 mb-20 pt-16 pb-16 sm:pb-24 lg:pb-32 overflow-hidden">
          {/* Pandya Corner Ornaments strictly around Archived Collections section */}
          <PandyaCorner className="top-0 left-0" />
          <PandyaCorner className="top-0 right-0" style={{ transform: 'scaleX(-1)' }} />
          <PandyaCorner className="bottom-0 left-0" style={{ transform: 'scaleY(-1)' }} />
          <PandyaCorner className="bottom-0 right-0" style={{ transform: 'scale(-1)' }} />

          <div className="mx-auto w-[95%] max-w-[1700px] relative z-10 px-6">
            <div className="flex items-center justify-between mb-16 relative z-10">
              <div className="flex-1 text-center">
                {/* Golden divider line ornament above */}
                <div className="flex justify-center mb-4">
                  <img src="/images/gold_divider.png" alt="divider" className="h-4 object-contain opacity-100 contrast-125" />
                </div>
                <div className="flex items-center justify-center gap-1">
                  <TitleFlourishLeft />
                  <h2 className="font-cinzel text-3xl md:text-4xl text-maroon font-bold tracking-wider">
                    {t('நூல் தொகுப்புகள்', 'Archived Collections')}
                  </h2>
                  <TitleFlourishRight />
                </div>
                <div className="flex justify-center my-4">
                  <img src="/images/gold_divider.png" alt="divider" className="h-4 object-contain opacity-100 contrast-125" />
                </div>
              </div>
              <div className="hidden md:flex absolute right-0 bottom-4 text-[10px] font-bold text-bronze uppercase tracking-[0.3em] items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 xl:gap-10 relative z-10 px-2 md:px-6 lg:px-10 xl:px-16 2xl:px-24"
            >
              {ebooks.map((book) => (
                <Link
                  key={book.id}
                  to={book.book_url || '#'}
                  className="no-underline text-inherit"
                >
                  <motion.div
                    variants={fadeUp}
                    className="group bg-[#FFF8F0] border border-[#C9973B]/40 shadow-[0_4px_12px_-2px_rgba(60,20,5,0.08),_0_12px_32px_-4px_rgba(201,151,59,0.2)] hover:shadow-[0_8px_20px_-4px_rgba(60,20,5,0.12),_0_20px_45px_-8px_rgba(201,151,59,0.35)] transition-all duration-300 rounded-xl flex flex-col h-full hover:-translate-y-2 relative overflow-hidden"
                  >
                    {/* Corner Ornaments */}
                    <CornerOrnament position="top-left" />
                    <CornerOrnament position="top-right" />
                    <CornerOrnament position="bottom-left" />
                    <CornerOrnament position="bottom-right" />

                    {/* Book Cover */}
                    <div className="relative bg-transparent flex items-center justify-center p-8 pb-4 pt-10 overflow-hidden">
                      {getBookCover(book) ? (
                        <div className="w-[95%] max-w-[280px] aspect-[2/3] shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-transform duration-300 group-hover:scale-[1.04]">
                          <FallbackImg
                            src={getBookCover(book)}
                            alt={book.title_tamil}
                            loading="lazy" decoding="async"
                            className="w-full h-full object-contain pointer-events-none"
                            fallback={<span className="text-4xl">📜</span>}
                          />
                        </div>
                      ) : (
                        <div className="text-5xl opacity-20">📜</div>
                      )}
                      
                      {/* Year badge - kept from original EBooks for info */}
                      <div className="absolute top-3 right-3 bg-maroon text-gold text-[9px] font-bold px-2 py-0.5 shadow-lg opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 rounded-sm z-10">
                        {book.first_edition_year || 'N.A.'}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-8 pb-8 pt-4 flex flex-col flex-1 relative mt-auto">
                      <div className="flex justify-between items-end gap-2 mb-4">
                        <div className="flex-1">
                          <h3 className="tamil-label text-xl text-maroon font-black mb-1 line-clamp-2 min-h-[3rem]">
                            {book.title_tamil}
                          </h3>
                          <p className="font-cinzel text-xs text-stone/50 uppercase tracking-widest font-bold">
                            {book.title_english}
                          </p>
                        </div>
                      </div>

                      {book.description_tamil && (
                        <p className="tamil-text text-[13px] text-stone/60 leading-relaxed line-clamp-3 mb-6 font-medium italic">
                          {t(book.description_tamil, book.description_english)}
                        </p>
                      )}

                      <div className="mt-auto pt-4 border-t border-gold/20 flex items-center justify-between">
                        <span className="text-[9px] text-stone/40 font-cinzel font-bold tracking-[0.2em]">
                          {t('ஆவணம்', 'VOL. ARCHIVE')}
                        </span>
                        <span className="text-maroon text-[10px] font-bold group-hover:text-gold transition-colors tracking-[0.2em] uppercase flex items-center gap-1">
                          {t('படிக்க', 'READ')} <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

export default EBooks;
