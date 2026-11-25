import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePageContent } from '../content/SiteContentProvider';
import RichText, { toBlocks } from '../content/RichText';
import { getBookCover } from '../utils/bookCovers';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
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
    className={`absolute pointer-events-none select-none w-[320px] h-[320px] opacity-100 drop-shadow-md ${className}`}
    style={style}
  />
);

const FloatingGlyphs = () => {
  const glyphs = ['a', 'i', 'u', 'e', 'ai'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-10 mix-blend-multiply">
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


const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ'];
const BODY_TEXT = 'space-y-4 tamil-body text-stone/85 text-[15px] sm:text-base md:text-[1.05rem] leading-relaxed md:leading-[2] font-medium text-justify';

// A step's bold first line is its heading; the rest are its paragraphs
function splitStep(html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const first = doc.body.firstElementChild;
  let heading = '';
  if (first && (first.tagName === 'STRONG' || first.tagName === 'B') && doc.body.firstChild === first) {
    heading = first.innerHTML; first.remove();
  }
  const rest = toBlocks(doc.body.innerHTML);
  if (!heading && rest.length && rest[0].tag === 'p') heading = rest.shift().html;
  return { heading, rest };
}

/* One content box of the page (title, divider, paragraphs / numbered step boxes) */
function ContentBox({ section }) {
  const groups = [];
  for (const b of toBlocks(section.body)) {
    const last = groups[groups.length - 1];
    if (b.tag === 'p' && last && last.tag === 'p') last.items.push(b);
    else groups.push(b.tag === 'p' ? { tag: 'p', items: [b] } : b);
  }
  return (
    <div className="bg-[#FAF8F2] border border-gold/25 rounded-lg p-4 sm:p-6 md:p-8 relative shadow-sm">
      {section.title && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-gold" />
            <h2 className="font-cinzel text-xl md:text-2xl text-maroon font-bold tracking-wide">
              {section.title}
            </h2>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-gold/40 via-gold/15 to-transparent mb-6" />
        </>
      )}
      <div className="space-y-6">
        {groups.map((g, gi) => (
          g.tag === 'p' ? (
            <div key={gi} className={BODY_TEXT}>
              {g.items.map((b, i) => <RichText key={i} as="p" html={b.html} justify />)}
            </div>
          ) : g.tag === 'ol' ? (
            <div key={gi} className="space-y-6">
              {g.items.map((item, i) => {
                const { heading, rest } = splitStep(item.html);
                return (
                  <div key={i} className="bg-white border border-gold/20 rounded-md p-3 sm:p-5 shadow-xs transition-all hover:border-gold/40">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className="font-cinzel text-lg md:text-xl font-bold text-gold border border-gold/30 rounded px-2 sm:px-2.5 py-1 bg-[#FAF8F2] flex-shrink-0">
                        {ROMAN[i] || i + 1}
                      </span>
                      <div className={rest.length ? 'space-y-3 min-w-0' : 'min-w-0'}>
                        {heading && <RichText as="h3" className="font-tamil-bold text-lg text-maroon font-bold" html={heading} />}
                        {rest.map((b, j) => (
                          <RichText key={j} as={b.tag === 'p' ? 'p' : 'div'} className="tamil-body text-stone/80 text-[15px] sm:text-base leading-relaxed text-justify" html={b.html || ''} justify={b.tag === 'p'} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : g.tag === 'ul' ? (
            <ul key={gi} className={`${BODY_TEXT} list-disc pl-6`}>
              {g.items.map((item, i) => <RichText key={i} as="li" html={item.html} justify />)}
            </ul>
          ) : (
            <RichText key={gi} as="h3" className="font-tamil-bold text-lg text-maroon font-bold" html={g.html} />
          )
        ))}
      </div>
    </div>
  );
}

const ClassicalTexts = () => {
  const c = usePageContent('classical-texts');
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
        <div className="absolute left-[2%] md:left-[4%] top-1/2 -translate-y-1/2 w-[35vw] md:w-[24vw] max-w-[320px] min-w-[120px] pointer-events-none select-none z-0 xl:z-10 opacity-30 xl:opacity-100">
          <img src="/images/book_transparent.png" alt="Ancient book and manuscripts with quill" className="w-full h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />
        </div>

        {/* Right Hero Illustration - South Indian Dravidian Temple line-art */}
        <div className="absolute right-[2%] md:right-[4%] top-1/2 -translate-y-1/2 w-[35vw] md:w-[22vw] max-w-[280px] min-w-[120px] pointer-events-none select-none z-0 xl:z-10 opacity-10 xl:opacity-30">
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
                {c.text('hero', 'label')}
              </p>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60" />
            </div>

            <h1 className="font-cinzel text-white font-bold tracking-wide" style={{ textShadow: '0 0 60px rgba(201,151,59,0.15)', fontSize: 'clamp(1.5rem, 6vw, 4.5rem)', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.2' }}>
              {c.text('hero', 'title')}
            </h1>

            {/* Gold divider ornament image */}
            <div className="flex justify-center my-4">
              <img src="/images/gold_divider.png" alt="divider ornament" className="h-6 object-contain opacity-80" />
            </div>

            {/* Tagline removed */}


          </motion.div>
        </div>
      </header>

      {/* ── Introduction & Scholarly Content Section ── */}
      <section className="relative py-12 md:py-16 bg-[#FAF8F5]">
        <div className="container mx-auto px-3 sm:px-6 max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white border border-gold/30 shadow-[0_10px_45px_rgba(201,151,59,0.14),0_2px_10px_rgba(60,20,5,0.05)] rounded-lg overflow-hidden"
          >
            {/* Top decorative gradient bar */}
            <div className="h-[4px] w-full bg-gradient-to-r from-maroon via-gold to-maroon" />

            <div lang="ta" className="p-3 sm:p-10 md:p-14 space-y-6 sm:space-y-12">

              {/* Content boxes — editable in admin Page Content → செம்பதிப்பின் தேவை */}
              {['need', 'phases', 'unique'].map(key => <ContentBox key={key} section={c.section(key)} />)}


              {/* Decorative bottom ornament divider */}
              <div className="flex justify-center pt-4">
                <img src="/images/gold_divider.png" alt="divider" className="h-5 object-contain opacity-70" />
              </div>

            </div>

            {/* Bottom decorative bar */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ClassicalTexts;
