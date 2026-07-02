import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const API = 'http://localhost:3001';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const CornerOrnament = ({ position }) => {
  const styles = {
    'top-left': { top: '6px', left: '6px' },
    'top-right': { top: '6px', right: '6px', transform: 'scaleX(-1)' },
    'bottom-left': { bottom: '6px', left: '6px', transform: 'scaleY(-1)' },
    'bottom-right': { bottom: '6px', right: '6px', transform: 'scale(-1)' },
  };
  return (
    <svg
      className="absolute pointer-events-none select-none"
      style={{ width: '14px', height: '14px', ...styles[position] }}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14 1H1V14" stroke="#C9973B" strokeWidth="1.2" opacity="0.4" />
      <rect x="2" y="2" width="2" height="2" fill="#C9973B" opacity="0.6" />
    </svg>
  );
};

const MandalaBackground = ({ className, style }) => (
  <img
    src="/images/mandala_corner.png"
    alt="mandala decoration"
    className={`absolute pointer-events-none select-none w-80 h-80 opacity-[0.06] ${className}`}
    style={style}
  />
);

const FloatingGlyphs = () => {
  const glyphs = ['a', 'i', 'u', 'e', 'ai'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-[0.015]">
      {glyphs.map((g, i) => (
        <img
          key={i}
          src={`/images/glyph_${g}.png`}
          alt="tamil glyph watermark"
          className="absolute w-48 h-48"
          style={{
            left: `${5 + i * 22}%`,
            top: `${15 + (i % 2) * 45}%`,
            transform: `rotate(${i * 12}deg)`,
          }}
        />
      ))}
    </div>
  );
};

const TitleFlourishLeft = () => (
  <img
    src="/images/gold_flourish_left.png"
    alt="flourish"
    className="w-12 h-auto object-contain inline-block align-middle mr-3 opacity-80"
  />
);

const TitleFlourishRight = () => (
  <img
    src="/images/gold_flourish_right.png"
    alt="flourish"
    className="w-12 h-auto object-contain inline-block align-middle ml-3 opacity-80"
  />
);

const ClassicalTexts = () => {
  const { t } = useLanguage();

  const { data: texts = [], isLoading } = useQuery({
    queryKey: ['texts'],
    queryFn: async () => (await axios.get(`${API}/api/texts`)).data,
  });

  const { data: manuscripts = [] } = useQuery({
    queryKey: ['manuscripts'],
    queryFn: async () => (await axios.get(`${API}/api/manuscripts`)).data,
  });

  return (
    <div className="min-h-screen selection:bg-maroon selection:text-white" style={{ background: '#FAF8F2' }}>

      {/* Hero Section */}
      <header className="relative pt-44 pb-28 overflow-hidden selection:bg-white selection:text-maroon">
        {/* Background gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #1A0303 0%, #3D0707 40%, #5C1A08 75%, #1A0303 100%)' }} />
        
        {/* Glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #C9973B 0%, transparent 70%)', filter: 'blur(60px)' }} />

        {/* Elegant ornamental frame (natively responsive with absolute corners) */}
        <div className="absolute inset-6 border-2 border-gold/30 pointer-events-none select-none z-10 hidden md:block">
          <div className="absolute inset-1 border border-gold/15" />
          {/* Corner images */}
          <img src="/images/gold_corner.png" alt="ornament" className="absolute top-[-2px] left-[-2px] w-6 h-6" style={{ transform: 'none' }} />
          <img src="/images/gold_corner.png" alt="ornament" className="absolute top-[-2px] right-[-2px] w-6 h-6" style={{ transform: 'scaleX(-1)' }} />
          <img src="/images/gold_corner.png" alt="ornament" className="absolute bottom-[-2px] left-[-2px] w-6 h-6" style={{ transform: 'scaleY(-1)' }} />
          <img src="/images/gold_corner.png" alt="ornament" className="absolute bottom-[-2px] right-[-2px] w-6 h-6" style={{ transform: 'scale(-1)' }} />
        </div>

        {/* Left Hero Illustration - Open book & quill */}
        <div className="absolute left-[4%] top-1/2 -translate-y-1/2 w-[24vw] max-w-[320px] min-w-[200px] pointer-events-none select-none hidden xl:block z-10">
          <img src="/images/book_transparent.png" alt="Ancient book and manuscripts with quill" className="w-full h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />
        </div>

        {/* Right Hero Illustration - South Indian Dravidian Temple line-art */}
        <div className="absolute right-[4%] top-1/2 -translate-y-1/2 w-[22vw] max-w-[280px] min-w-[180px] pointer-events-none select-none hidden xl:block z-10 opacity-30">
          <img src="/images/temple_transparent.png" alt="Dravidian Temple Gopuram Line Art" className="w-full h-auto object-contain" />
        </div>

        {/* Subtle Tamil letters watermark in background */}
        <div className="absolute inset-0 opacity-[0.03] select-none pointer-events-none flex flex-wrap gap-24 p-10 items-center justify-around text-gold text-7xl font-bold font-serif">
          <span>அ</span><span>ஆ</span><span>இ</span><span>ஈ</span><span>உ</span><span>ஊ</span><span>எ</span><span>ஏ</span><span>ஐ</span><span>ஒ</span><span>ஓ</span><span>ஔ</span>
        </div>

        {/* Bottom divider line */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        {/* Content */}
        <div className="container mx-auto px-6 max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6 animate-fadeUp"
          >
            <div className="flex items-center justify-center gap-5">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60" />
              <p className="font-cinzel text-[10px] uppercase tracking-[0.5em] text-gold/80 font-bold">
                {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
              </p>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60" />
            </div>

            <h1 className="font-cinzel text-5xl md:text-7xl text-white font-bold tracking-wide" style={{ textShadow: '0 0 60px rgba(201,151,59,0.15)' }}>
              {t('செவ்வியல் நூல்கள்', 'Classical Tamil Texts')}
            </h1>

            {/* Gold divider ornament image */}
            <div className="flex justify-center my-4">
              <img src="/images/gold_divider.png" alt="divider ornament" className="h-6 object-contain opacity-80" />
            </div>

            <p className="tamil-body text-white/75 max-w-2xl mx-auto leading-loose text-lg font-medium">
              {t(
                'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் பட்டியலிட்டுள்ள செவ்வியல் நூல்களும் அவற்றுக்கான ஓலைச்சுவடி வகைகளும்.',
                'A comprehensive repository of Classical Tamil primary texts identified by the Institute, including their corresponding digital manuscript archives.'
              )}
            </p>

            {texts.length > 0 && (
              <div className="inline-block px-6 py-2 border border-gold/30 bg-gold/5 rounded-sm">
                <span className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-gold font-bold">
                  {texts.length} {t('செவ்வியல் நூல்கள்', 'Primary Texts')}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </header>

      {/* ── Authority Archive Section ── */}
      <section className="relative py-24 overflow-hidden border-b border-gold/20" style={{ background: 'url(/images/parchment_bg.png) repeat', backgroundSize: 'cover' }}>
        {/* Corner Mandalas */}
        <MandalaBackground className="top-[-120px] left-[-120px]" />
        <MandalaBackground className="top-[-120px] right-[-120px]" style={{ transform: 'scaleX(-1)' }} />
        <MandalaBackground className="bottom-[-120px] left-[-120px]" style={{ transform: 'scaleY(-1)' }} />
        <MandalaBackground className="bottom-[-120px] right-[-120px]" style={{ transform: 'scale(-1)' }} />

        {/* Faint Floating Glyphs */}
        <FloatingGlyphs />

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="flex items-center justify-between mb-12 border-b border-gold/20 pb-4 relative z-10">
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1">
                <TitleFlourishLeft />
                <h2 className="font-cinzel text-3xl md:text-4xl text-maroon font-bold tracking-wider">
                  {t('நூல் தொகுப்புகள்', 'AUTHORITY ARCHIVE')}
                </h2>
                <TitleFlourishRight />
              </div>
              
              {/* Golden divider line ornament */}
              <div className="flex justify-center my-3">
                <img src="/images/gold_divider.png" alt="divider" className="h-4 object-contain opacity-70" />
              </div>
              
              <p className="tamil-body text-stone/50 text-sm italic font-medium mt-2">
                {t('Explore the foundational works of Classical Tamil literature.', 'Explore the foundational works of Classical Tamil literature.')}
              </p>
            </div>
            
            <div className="absolute right-0 bottom-4 text-[10px] font-cinzel font-bold text-gold uppercase tracking-[0.3em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
              {t('செவ்வியல் நூல்கள்', 'PRIMARY TEXTS')}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-12 h-12 border-2 border-maroon/10 border-t-gold rounded-full animate-spin" />
              <p className="font-cinzel tracking-[0.4em] text-bronze animate-pulse uppercase text-[10px]">
                {t('பதிவேடுகளைத் திரட்டுகிறது…', 'RETRIEVING AUTHORITY RECORDS…')}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Soft radial gold glow behind the card grid */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] rounded-full pointer-events-none select-none opacity-20 z-0"
                style={{ background: 'radial-gradient(circle, rgba(201,151,59,0.2) 0%, transparent 80%)', filter: 'blur(40px)' }} />

              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10"
              >
                {texts.map((book, idx) => {
                  return (
                    <motion.div
                      key={book.id}
                      custom={idx}
                      variants={{
                        hidden: { opacity: 0, y: 30 },
                        show: i => ({
                          opacity: 1,
                          y: 0,
                          transition: {
                            delay: i * 0.1, // Staggered delay of 100ms
                            duration: 0.5,
                            ease: [0.22, 1, 0.36, 1]
                          }
                        })
                      }}
                      className="group bg-[#FCFAF7] border border-[#D4B26F]/30 hover:border-gold/60 shadow-[0_8px_30px_rgba(26,3,3,0.03)] hover:shadow-[0_16px_40px_rgba(201,151,59,0.12)] transition-all duration-300 rounded-[18px] overflow-hidden flex flex-col h-full hover:-translate-y-2 relative"
                    >
                      {/* Corner Ornaments */}
                      <CornerOrnament position="top-left" />
                      <CornerOrnament position="top-right" />
                      <CornerOrnament position="bottom-left" />
                      <CornerOrnament position="bottom-right" />

                      {/* Book Cover */}
                      <div className="relative bg-transparent flex items-center justify-center p-8 overflow-hidden"
                           style={{ height: 260 }}>
                        {book.cover_image ? (
                          <div className="h-full aspect-[3/4] shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-transform duration-300 group-hover:scale-[1.04]">
                            <img
                              src={`${API}${book.cover_image}`}
                              alt={book.title_tamil}
                              className="h-full w-full object-contain pointer-events-none"
                              onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span class="text-4xl">📜</span>'; }}
                            />
                          </div>
                        ) : (
                          <div className="text-5xl opacity-20">📜</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="px-8 pb-8 pt-4 flex flex-col flex-1 relative mt-auto">
                        <div className="flex justify-between items-end gap-2">
                          <div className="flex-1">
                            <h3 className="tamil-label text-xl text-maroon font-black mb-1">
                              {book.title_tamil}
                            </h3>
                            <p className="font-cinzel text-xs text-stone/50 uppercase tracking-widest font-bold">
                              {book.title_english}
                            </p>
                          </div>
                          
                          {/* Circular gold chevron button */}
                          <a href={`/search?book_id=${book.id}`} className="w-10 h-10 rounded-full border border-gold/45 group-hover:border-gold bg-transparent flex items-center justify-center text-gold transition-all duration-300 flex-shrink-0 group-hover:bg-gold/15 group-hover:scale-105">
                            <span className="text-[14px] font-bold transform transition-transform duration-300 group-hover:translate-x-0.5">❯</span>
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* ── Manuscripts Directory Table ── */}
      <div className="container mx-auto px-6 max-w-6xl py-20">
        <section className="relative pt-16">
          <div className="flex flex-col items-center justify-center text-center mb-12">
            {/* Divider ornament above heading */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-gold/50" />
              <span className="text-gold text-xs">❦</span>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-gold/50" />
            </div>

            <h2 className="font-cinzel text-3xl text-maroon font-bold mb-3 tracking-wide">
              {t('செவ்வியல் சுவடி வகையகம்', 'Manuscript Category Directory')}
            </h2>
            <p className="tamil-body text-stone/50 text-sm italic font-medium">
              {t('அனைத்து நூல்களின் கீழ் வகைப்படுத்தப்பட்டுள்ள முழு சுவடி பட்டியல்', 'Comprehensive directory of categorised digitised palm-leaf manuscripts')}
            </p>
          </div>

          <div className="overflow-hidden border border-gold/30 rounded-lg shadow-xl bg-white relative">
            {/* Top color gradient highlight bar */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-maroon via-gold to-maroon" />

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#380505] text-gold border-b border-gold/20">
                  <th className="p-5 font-cinzel text-[10px] text-gold/60 font-black tracking-widest text-center w-16">#</th>
                  <th className="p-5 font-cinzel text-[11px] text-gold uppercase tracking-widest font-bold border-r border-gold/15">{t('செவ்வியல் நூல்', 'PARENT AUTHORITY')}</th>
                  <th className="p-5 font-cinzel text-[11px] text-gold uppercase tracking-widest font-bold border-r border-gold/15">{t('சுவடி வகை', 'ARCHIVAL CATEGORY')}</th>
                  <th className="p-5 font-cinzel text-[11px] text-gold uppercase tracking-widest font-bold text-right">{t('தேடு', 'COLLECTION')}</th>
                </tr>
              </thead>
              <tbody>
                {manuscripts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <svg className="w-12 h-12 text-gold/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-cinzel text-[11px] text-gold font-bold uppercase tracking-[0.3em]">
                          {t('தரவு கிடைக்கவில்லை', 'NO RECORDS FOUND')}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : manuscripts.map((m, idx) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.02 }}
                    className={`border-b border-gold/10 hover:bg-gold/[0.04] transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FCFAF5]'}`}
                  >
                    <td className="p-5 font-cinzel text-[10px] text-maroon/30 font-black text-center">{idx + 1}</td>
                    <td className="p-5 border-r border-gold/10">
                      <span className="tamil-label text-xs text-bronze uppercase tracking-[0.15em] font-black group-hover:text-maroon transition-colors">{m.book_name}</span>
                    </td>
                    <td className="p-5 border-r border-gold/10">
                      <span className="tamil-label text-base text-maroon font-black">{m.title_tamil}</span>
                    </td>
                    <td className="p-5 text-right">
                      <a href={`/search?cid=${m.id}&book_id=${m.text_id}`}
                        className="font-cinzel text-gold hover:text-maroon text-[10.5px] font-bold uppercase tracking-widest transition-all inline-flex items-center gap-1 group-hover:-translate-x-1">
                        {t('ஆய்வு செய்க', 'EXPLORE')} →
                      </a>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-12 text-center">
            <p className="font-cinzel text-[8.5px] text-bronze font-bold uppercase tracking-[0.6em] opacity-40">
              CENTRAL INSTITUTE OF CLASSICAL TAMIL
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ClassicalTexts;
