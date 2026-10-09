import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { getBookCover } from '../utils/bookCovers';

const API = 'http://localhost:3001';

const CRITICAL_EDITIONS = [
  { ta: 'இறையனார் களவியல்', en: 'Irayanar Kalviyar', year: '2013', img: '/images/publications/opt_25.jpg' },
  { ta: 'ஐங்குறுநூறு – மருதம்', en: 'Aingurunuru – Marutam', year: '2017', img: '/images/publications/opt_30.jpg' },
  { ta: 'ஐங்குறுநூறு – நெய்தல்', en: 'Aingurunuru – Neital', year: '2017', img: '/images/publications/opt_31.jpg' },
  { ta: 'ஐங்குறுநூறு – குறிஞ்சி', en: 'Aingurunuru – Kurinji', year: '2021', img: '/images/publications/opt_46.jpg' },
  { ta: 'ஐங்குறுநூறு – பாலை', en: 'Aingurunuru – Palai', year: '2021', img: '/images/publications/opt_47.jpg' },
  { ta: 'கைந்நிலை', en: 'Kainnilai', year: '2024', img: '/images/publications/opt_147.jpg' },
  { ta: 'ஐங்குறுநூறு – முல்லை', en: 'Aingurunuru – Mullai', year: 'Press', img: '/images/edition/7.png' },
];

/* Official content — Faculty of Manuscriptology, verbatim from suvadi.cict.in (Default.aspx) */
const FACULTY_CONTENT = [
  {
    type: 'p',
    ta: 'ஓலைச்சுவடியில் நூல்களை எழுதி வைக்கும் வழக்கமானது 19ஆம் நூற்றாண்டு வரை நீடித்தது. அச்சு இயந்திரங்கள் அறிமுகத்தால் ஓலைச்சுவடியில் இருந்த நூல்களெல்லாம் அச்சில் ஏற்றப்பட்டன. செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் பட்டியலிட்டுள்ள 41 செவ்வியல் நூல்களின் ஓலைச்சுவடிகள் இன்றைக்கும் உலகெங்கும் காணக்கிடைக்கின்றன. அவற்றுள் பல சுவடிகளிலிருந்து அச்சாக்கம் பெற்றுள்ளன. இன்னும் அச்சேறாமலும் பற்பல உள்ளன.',
    en: 'The tradition of writing texts on palm-leaf manuscripts continued until the 19th century. With the advent of printing presses, all the texts that existed on palm leaves came to be printed. The palm-leaf manuscripts of the 41 classical texts listed by the Central Institute of Classical Tamil are still found scattered across the world today. Many of them have been printed from these manuscripts. Quite a few still remain unprinted.',
  },
  {
    type: 'p',
    ta: 'சென்ற நூற்றாண்டுவரை ஆறுமுக நாவலர், சி.வை. தாமோதரம்பிள்ளை, உ.வே. சாமிநாதையர், ஔவை. சு. துரைசாமிப்பிள்ளை போன்ற தமிழறிஞர்கள் சுவடிகளை நூல்களாகப் பதிப்பிக்கும் பணியைச் செவ்வனே செய்தனர். பல்வேறு காலக்கட்டங்களில் பலதரப்பட்ட பதிப்பாசிரியர்களால் வெளிவந்த நூல்களில் சுவடிகளிலிருந்த சிற்சில பிழைப் பாடங்களும் இடம்பெற்றன. இவற்றினைக் கருத்தில் கொண்ட செம்மொழி நிறுவனம் சுவடியியல் புலத்தினை (Faculty of Manuscriptology) அமைத்துச் செம்பதிப்புகளை உருவாக்கத் தொடங்கியது. அதற்காகச் சுவடியியல் புலம் ஓலைச்சுவடிகளைப் பாதுகாத்து வரும் நூலகங்களுக்குச் சென்று சுவடிகளைப் படமெடுத்துக் குறுந்தகடுகளில் (CD/DVD) மின்படியாக்கம் செய்துள்ளது. அக்குறுந்தகடுகளில் இருக்கும் சுவடி நூல்களை ஆய்வாளர்கள் பயன்கொள்ளவேண்டும் என்ற நோக்கத்தில் ஓர் உயர் தரத்திலான மின்னணு நூலகம் (Digital Library) உருவாக்கியுள்ளது. இந்த மின்னணு நூலகம் வழியாக ஒரு நூலுக்குரிய பல சுவடிகளைத் தேடவும் (Search) அச்சுவடிகளிலுள்ள பாடவேறுபாடுகளைக் (Textual variations) கண்டறியவும் முடியும்.',
    en: 'Until the last century, Tamil scholars such as Arumuga Navalar, C.W. Damodaram Pillai, U.V. Swaminatha Iyer, and Auvai. S. Duraisamipillai diligently carried out the work of editing manuscripts into printed books. Across various periods, texts brought out by different editors also carried a few erroneous readings inherited from the manuscripts. Taking this into account, the Central Institute of Classical Tamil established the Faculty of Manuscriptology to undertake the preparation of Critical Editions. To this end, the Faculty of Manuscriptology has visited libraries that preserve palm-leaf manuscripts, photographed the manuscripts, and digitised them onto compact discs (CD/DVD). With the aim of enabling researchers to make use of the manuscripts held on these discs, it has built a high-quality Digital Library. Through this Digital Library, one can search for the many manuscripts belonging to a single text (Search) and identify the textual variations (Textual variations) among them.',
  },
  {
    type: 'p',
    ta: 'இதுவரை செவ்வியல் தொடர்பாகப் பதிப்பிக்கப்பட்ட நூல்கள் அனைத்தும் அந்நூலிற்குக் கிடைக்கக்கூடிய அனைத்துச் சுவடிகளையும் பதிப்புகளையும் கொண்டு ஆய்ந்து பதிப்பிக்கப்படவில்லை. இக்குறைபாட்டை நீக்குவதற்கு உலகெங்கிலுமிருந்து கிடைக்கப் பெற்ற எல்லாச் சுவடிகள், பதிப்புகளை ஆய்ந்து, பாடங்களை உறுதிசெய்து செம்பதிப்பாகக் கொண்டு வருவதைச் சுவடியியல் புலத்தின் தலையாய பணியாகக் கொண்டுள்ளது.',
    en: 'Until now, not all the classical texts that have been published were edited after studying every manuscript and edition available for that text. To remove this shortcoming, the Faculty of Manuscriptology has taken as its foremost task the study of every manuscript and edition obtainable from anywhere in the world, the verification of readings, and the production of Critical Editions.',
  },
  {
    type: 'p',
    ta: 'அவ்வகையில் நிறுவனத்தின் சுவடியியல் புலத்திலிருந்து வெளிவந்துள்ள செம்பதிப்புகள்:',
    en: "In this manner, the Critical Editions brought out by the Institute's Faculty of Manuscriptology are:",
  },
  {
    type: 'list',
    items: [
      { id: 25, ta: 'இறையனார் களவியல் (2013)', en: 'Iraiyanar Kalaviyal (2013)' },
      { id: 30, ta: 'ஐங்குறுநூறு – மருதம் (2017)', en: 'Ainkurunuru – Marutham (2017)' },
      { id: 31, ta: 'ஐங்குறுநூறு – நெய்தல் (2017)', en: 'Ainkurunuru – Neithal (2017)' },
      { id: 46, ta: 'ஐங்குறுநூறு – குறிஞ்சி (2021)', en: 'Ainkurunuru – Kurinji (2021)' },
      { id: 47, ta: 'ஐங்குறுநூறு – பாலை (2021)', en: 'Ainkurunuru – Paalai (2021)' },
      { id: 147, ta: 'கைந்நிலை (2024)', en: 'Kainnilai (2024)' },
      { ta: 'ஐங்குறுநூறு – முல்லை (அச்சில்)', en: 'Ainkurunuru – Mullai (In press)' },
    ],
  },
  {
    type: 'p',
    ta: 'இதைப் போன்றே மற்ற செவ்வியல் நூல்களைச் செம்பதிப்புகளாகக் கொணரும் பணியில் சுவடியியல் புலம் முனைப்புடன் ஈடுபட்டுள்ளது.',
    en: 'In the same way, the Faculty of Manuscriptology continues to work with dedication to bring out other classical texts as Critical Editions.',
  },
];

const FEATURES = [
  {
    num: '01',
    ta: 'சுவடித் தேடல்',
    en: 'Manuscript Search',
    desc_ta: 'உலகெங்கும் உள்ள ஓலைச்சுவடிகளை ஆராய்ச்சி செய்யுங்கள்.',
    desc_en: 'Search and explore palm-leaf manuscripts preserved across the world.',
    link: '/search',
    accent: '#C9973B',
  },
  {
    num: '02',
    ta: 'மின் நூல்கள்',
    en: 'E-Books',
    desc_ta: 'செவ்வியல் நூல்களின் முதல் அச்சுப் பதிப்புகளை படியுங்கள்.',
    desc_en: 'Access first printed editions of Classical Tamil texts online.',
    link: '/ebooks',
    accent: '#8B5E3C',
  },
  {
    num: '03',
    ta: 'செவ்வியல் நூல்கள்',
    en: 'Classical Texts',
    desc_ta: 'CICT வெளியிட்ட அதிகாரபூர்வ நூல் பதிப்புகள்.',
    desc_en: 'Authoritative critical editions published by CICT scholars.',
    link: '/classical-texts',
    accent: '#D4A853',
  },
];

/* ── Animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

/* ── Animated counter hook ── */
function useAnimatedCount(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !target) return;
    const isK = String(target).includes('k');
    const numeric = isK ? parseFloat(target) * 1000 : parseFloat(target);
    if (isNaN(numeric)) { setCount(target); return; }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * numeric);
      setCount(isK ? (current >= 1000 ? Math.round(current / 1000) + 'k+' : current) : current);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return { count, ref };
}

/* ── Stat item with animated counter ── */
function StatItem({ val, label }) {
  const { count, ref } = useAnimatedCount(val);
  return (
    <div ref={ref} className="group text-center">
      <div className="text-3xl md:text-5xl font-cinzel font-black text-gold-light group-hover:text-white transition-colors duration-500 tabular-nums">
        {count || val}
      </div>
      <div className="tamil-label text-[10px] uppercase tracking-[0.2em] text-gold/60 font-black mt-1">{label}</div>
    </div>
  );
}

/* ── Compact Home Stat item with animated counter ── */
function HomeStatItem({ val, labelTa, labelEn }) {
  const { count, ref } = useAnimatedCount(val);
  return (
    <div ref={ref} className="flex flex-col items-center">
      <span className="text-3xl md:text-4xl font-extrabold text-maroon tabular-nums">
        {count ? Number(count).toLocaleString('en-IN') : Number(val || 0).toLocaleString('en-IN')}
      </span>
      <span className="text-xs md:text-sm font-black text-stone/80 mt-1 tamil-body">
        {labelTa}
      </span>
      <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-stone/40 font-bold font-sans">
        {labelEn}
      </span>
    </div>
  );
}

/* ── Tilt card for publications ── */
function TiltCard({ children, className }) {
  const cardRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-6, 6]);

  const handleMouseMove = (e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════════════════════════════ */
const Home = () => {
  const { language, t } = useLanguage();
  const scrollRef = useRef(null);

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await axios.get(`${API}/api/stats`)).data,
  });

  const { data: fetchedEbooks = [] } = useQuery({
    queryKey: ['ebooks'],
    queryFn: async () => (await axios.get(`${API}/api/ebooks`)).data,
  });

  const ebooks = [
    ...fetchedEbooks,
    { id: 17, title_tamil: 'மணிமேகலை', edition_count: 2, book_url: '/ebooks/17' },
    { id: 15, title_tamil: 'இறையனார் அகப்பொருள்', edition_count: 1, book_url: '/ebooks/15' }
  ];

  /* horizontal drag scroll for publications */
  const isDragging = useRef(false);
  const dragStart = useRef(0);
  const scrollStart = useRef(0);

  const onMouseDown = (e) => {
    isDragging.current = true;
    dragStart.current = e.clientX;
    scrollStart.current = scrollRef.current?.scrollLeft || 0;
    scrollRef.current.style.cursor = 'grabbing';
  };
  const onMouseMove = (e) => {
    if (!isDragging.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft = scrollStart.current - (e.clientX - dragStart.current);
  };
  const stopDrag = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  };

  return (
    <div className="bg-ivory selection:bg-maroon selection:text-white overflow-x-hidden" style={{ background: '#FAF8F2' }}>

      {/* ══════════════════════════════════════════
          SECTION 1 ▸ HERO
      ══════════════════════════════════════════ */}
      <section
        className="home-hero relative w-full overflow-hidden bg-[#1A0303]"
        style={{
          backgroundImage: "url('/images/bg/home_hero_final.png')",
          backgroundSize: '100% 100%',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          aspectRatio: '1920 / 555',
        }}
      >

        {/* Gold accent line at the bottom edge */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        {/* ── Hero text & buttons ──────────────────────────────────────────
            Absolutely covers the same space as the image.
            Content is constrained to the clean parchment centre zone
            (between the two palm-leaf manuscripts on left/right).         */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              /* Keep content inside the safe 50% centre band to clear the side manuscript graphics */
              width: '100%',
              maxWidth: 'min(50%, 600px)',
              textAlign: 'center',
              pointerEvents: 'auto',
              paddingLeft: '1.5rem',
              paddingRight: '1.5rem',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}
            >

              {/* Fixed-Width Heading Container (Matches safe center zone) */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                }}
              >
                {/* Main title (Secondary Heading) */}
                <motion.h1
                  className="tamil-heading text-maroon italic"
                  style={{
                    fontSize: 'clamp(12px, 2.2vw, 2.2rem)',
                    textShadow: '0 2px 20px rgba(201,151,59,0.15)',
                    lineHeight: '1.2',
                    margin: 0,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }}
                >
                  {t('சுவடியியல் புலம்', 'Faculty of Manuscriptology')}
                </motion.h1>

                {/* Institutional label (Primary Heading) */}
                <motion.h2
                  className="tamil-heading text-maroon italic uppercase"
                  style={{
                    fontSize: language === 'ta' ? 'clamp(10px, 1.8vw, 1.7rem)' : 'clamp(10px, 2vw, 1.9rem)',
                    textShadow: '0 2px 15px rgba(201,151,59,0.15)',
                    marginTop: '0.25rem',
                    marginBottom: 0,
                    letterSpacing: '0.02em',
                    lineHeight: '1.3',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
                >
                  {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
                </motion.h2>
              </div>

              {/* Ornamental separator */}
              <motion.div
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.7, duration: 0.8 }}
              >
                <div className="w-1.5 h-1.5 rounded-full border border-gold/50" />
                <div className="h-px w-14 bg-gold/30" />
                <div className="w-2 h-2 rounded-full bg-gold/40" />
                <div className="h-px w-14 bg-gold/30" />
                <div className="w-1.5 h-1.5 rounded-full border border-gold/50" />
              </motion.div>




            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 left-0 w-full flex justify-center" style={{ pointerEvents: 'none' }}>
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="flex flex-col items-center gap-2">
            <span className="font-cinzel text-[8px] tracking-[0.6em] uppercase font-bold text-gold/40">Scroll</span>
            <motion.div className="w-[1px] h-8 bg-gradient-to-b from-gold/60 to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 2 ▸ INSTITUTIONAL INTRODUCTION
      ══════════════════════════════════════════ */}

      <section className="home-faculty-section py-24">
        {/* Generated parchment artwork background */}
        <div className="home-faculty-artwork" />
        <div className="home-faculty-overlay" />
        {/* Decorative vertical Tamil text strip */}
        <div className="palm-leaf-side-deco" style={{ left: '1.5rem', zIndex: 2 }}>
          {'அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு கற்க கசடறக் கற்பவை கற்றபின் நிற்க அதற்குத் தக யாதும் ஊரே யாவரும் கேளிர்'}
        </div>

        <div className="container mx-auto px-6 max-w-7xl relative" style={{ zIndex: 3 }}>
          {/* Section header */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
            className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-1.5 h-1.5 bg-gold rounded-full" />
              <span className="tamil-label text-xs text-bronze uppercase tracking-[0.3em] font-black">
                {'நிறுவன அறிமுகம்'}
              </span>
            </div>
            <h2 className="tamil-heading text-5xl md:text-6xl text-maroon font-black italic">
              {'சுவடியியல் புலம்'}
            </h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-maroon to-gold/60 mx-auto mt-6" />
          </motion.div>

          {/* Heritage article — official content, Faculty of Manuscriptology (suvadi.cict.in) */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9 }}
            className="faculty-article-card group relative">
            {/* Subtle corner accents */}
            <span className="faculty-article-corner faculty-article-corner-tl" />
            <span className="faculty-article-corner faculty-article-corner-br" />

            {FACULTY_CONTENT.map((block, i) => (
              block.type === 'list' ? (
                <ol key={i} className="faculty-article-list">
                  {block.items.map((item, idx) => (
                    <li key={idx}>
                      {item.id ? (
                        <Link to={`/publication/${item.id}`} className="faculty-article-link">
                          <span className="faculty-article-list-num">{idx + 1}.</span>
                          <span>{item.ta}</span>
                        </Link>
                      ) : (
                        <span>
                          <span className="faculty-article-list-num">{idx + 1}.</span>
                          {item.ta}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p key={i} className="faculty-article-p">
                  {block.ta}
                </p>
              )
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── MANUSCRIPT STATISTICS CARD ROW ( Cream Parchment Theme ) ── */}
      <section className="py-10 bg-[#FAF8F5] border-t border-b border-gold/15 relative overflow-hidden">
        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Palm Leaf Manuscripts Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white border border-maroon/10 p-6 rounded-md shadow-sm hover:shadow-md hover:border-gold/50 transition-all duration-300 flex justify-center items-center group"
            >
              <HomeStatItem val="96215" labelTa="ஓலைச்சுவடிகள்" labelEn="Digitized Palm Leaf Manuscripts" />
            </motion.div>

            {/* Paper Manuscripts Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-maroon/10 p-6 rounded-md shadow-sm hover:shadow-md hover:border-gold/50 transition-all duration-300 flex justify-center items-center group"
            >
              <HomeStatItem val="39061" labelTa="காகித சுவடிகள்" labelEn="Digitized Paper Manuscripts" />
            </motion.div>

            {/* Total Digitized Manuscripts Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-maroon/10 p-6 rounded-md shadow-sm hover:shadow-md hover:border-gold/50 transition-all duration-300 flex justify-center items-center group"
            >
              <HomeStatItem val="135276" labelTa="மொத்த சுவடிகள்" labelEn="Total Digitized Manuscripts" />
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 3 ▸ STRATEGIC PILLARS
      ══════════════════════════════════════════ */}
      <section className="home-research-section relative py-14 md:py-18 overflow-hidden">
        {/* Generated maroon manuscript artwork background */}
        <div className="home-research-artwork" />
        <div className="home-research-overlay" />
        {/* Gold wave dividers */}
        <div className="section-wave-top" />
        <div className="section-wave-bottom" />

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp} className="h-full">
                <Link to={f.link} className="group block relative h-full">
                  {/* Card — each gets its own accent color matching reference image */}
                  <div className={`home-tool-card home-tool-card-${i + 1} flex flex-col justify-between`}>

                    {/* Top Content Area */}
                    <div>
                      {/* Number watermark */}
                      <div className="tool-card-number">{f.num}</div>

                      {/* Corner filigree accents for manuscript aesthetic */}
                      <span className="home-tool-card-corner top-3 left-3 border-t border-l" />
                      <span className="home-tool-card-corner bottom-3 right-3 border-b border-r" />

                      {/* SVG Icon Visual Container */}
                      <div className="relative mb-6">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/25 shadow-lg group-hover:scale-110 group-hover:-translate-y-1 group-hover:border-white/40 group-hover:bg-white/20 transition-all duration-500">
                          {i === 0 && (
                            <svg className="w-7 h-7 text-amber-100 transition-transform duration-500 group-hover:rotate-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.25 11.25L21 21m-2.25-6.75a6 6 0 11-12 0 6 6 0 0112 0z" />
                            </svg>
                          )}
                          {i === 1 && (
                            <svg className="w-7 h-7 text-emerald-100 transition-transform duration-500 group-hover:rotate-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          )}
                          {i === 2 && (
                            <svg className="w-7 h-7 text-purple-100 transition-transform duration-500 group-hover:rotate-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5M4.5 21V10.5M12 3v3" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Title matching navbar title exactly */}
                      <h3 className="tamil-label text-2xl text-white mb-3 font-black tracking-wide" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.35)', fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Cinzel", serif' }}>
                        {t(f.ta, f.en)}
                      </h3>

                      {/* Description */}
                      <p className="tamil-text text-white/85 text-sm leading-relaxed font-medium group-hover:text-white transition-colors duration-300">
                        {t(f.desc_ta, f.desc_en)}
                      </p>
                    </div>

                    {/* Bottom Arrow CTA with animation */}
                    <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-3 text-white/90 text-xs font-black uppercase tracking-[0.25em]">
                      <span className="group-hover:text-white transition-colors">{t('தொடர்க', 'LAUNCH')}</span>
                      <div className="h-px bg-white/40 transition-all duration-500 w-6 group-hover:w-12 group-hover:bg-white" />
                      <svg className="w-4 h-4 opacity-70 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7-7 7" />
                      </svg>
                    </div>

                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 4 ▸ CRITICAL EDITIONS GALLERY
      ══════════════════════════════════════════ */}
      <section className="home-editions-section py-14 md:py-16 overflow-hidden">
        {/* Generated archival paper artwork background with mandala decorations */}
        <div className="home-editions-artwork" />
        <div className="home-editions-overlay" />

        <div className="container mx-auto px-6 max-w-6xl relative" style={{ zIndex: 2 }}>
          {/* Header */}
          <motion.div className="text-center mb-8 md:mb-10" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="tamil-label text-bronze text-xs uppercase tracking-[0.4em] mb-3 font-black">
              {t('சுவடியியல் வெளியீடுகள்', 'ARCHIVAL PUBLICATIONS')}
            </p>
            <h2 className="tamil-heading text-4xl md:text-5xl text-maroon italic">
              {t('வெளியிடப்பட்ட செம்பதிப்புகள்', 'Published Critical Editions')}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="h-px w-16 bg-gold/35" />
              <div className="w-2 h-2 bg-gold/50 rounded-full" />
              <div className="h-px w-16 bg-gold/35" />
            </div>
          </motion.div>

          {/* 7 featured books displayed simultaneously on one horizontal row on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
            {CRITICAL_EDITIONS.map((ed, i) => {
              // Find matching ID from FACULTY_CONTENT list items for dynamic correct routing
              const matchingItem = FACULTY_CONTENT.find(c => c.type === 'list')?.items.find(item => item.ta.startsWith(ed.ta));
              const destUrl = matchingItem?.id ? `/publication/${matchingItem.id}` : '/classical-texts';
              return (
                <Link key={i} to={destUrl} className="block w-full">
                  <TiltCard className="w-full h-full">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="group home-book-card h-full flex flex-col justify-between cursor-pointer"
                    >
                      <div className="relative aspect-[3/4] bg-stone/5 flex items-center justify-center overflow-hidden">
                        <img
                          src={ed.img.startsWith('/images/publications') ? ed.img : `${API}${ed.img}`}
                          alt={ed.ta}
                          className="h-full w-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                          onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span class="text-4xl">📚</span>'; }}
                        />
                        {/* Year badge */}
                        <div className="edition-year-badge">{ed.year}</div>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-maroon/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                      <div className="mt-2.5 pb-1.5 px-0.5">
                        <p className="tamil-label text-[10px] md:text-[11px] text-maroon text-center group-hover:text-gold transition-colors font-black line-clamp-2 leading-tight">
                          {t(ed.ta, ed.en)}
                        </p>
                      </div>
                    </motion.div>
                  </TiltCard>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link to="/classical-texts" className="catalogue-link">
              <span>{t('அனைத்து வெளியீடுகளையும் காண்க', 'EXPLORE THE FULL CATALOGUE')}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 5 ▸ DIGITAL EBOOK PREVIEW
      ══════════════════════════════════════════ */}
      {ebooks.length > 0 && (
        <section className="home-ebooks-section relative overflow-hidden" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
          {/* Heritage green artwork background */}
          <div className="home-ebooks-artwork" />
          <div className="home-ebooks-overlay" />
          {/* Gold wave top divider */}
          <div className="section-wave-top" />
          {/* Side accent bars */}
          <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-gold/40 to-transparent" style={{ zIndex: 3 }} />
          <div className="absolute right-0 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-gold/25 to-transparent" style={{ zIndex: 3 }} />

          {/* Palm-leaf bundle — bottom left */}
          <img src="/images/palm_manuscript.png" alt="Decorative Manuscript" className="home-ebooks-palm-left object-contain hidden sm:block" aria-hidden="true" />

          {/* Palm-leaf bundle — bottom right (mirrored) */}
          <img src="/images/palm_manuscript.png" alt="Decorative Manuscript" className="home-ebooks-palm-right object-contain hidden sm:block" aria-hidden="true" />

          <div className="container mx-auto px-4 sm:px-6 max-w-6xl" style={{ position: 'relative', zIndex: 4 }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <span className="home-section-label text-gold/60 block mb-2">
                  {t('மின் நூலகம்', 'Digital Repository')}
                </span>
                <h2 className="tamil-heading text-2xl sm:text-3xl md:text-4xl text-white">
                  {t('முதல் அச்சுப் பதிப்புகள்', 'First Printed Editions Online')}
                </h2>
              </div>
              <Link to="/ebooks" className="btn-browse-library self-start sm:self-auto">
                <span className="tamil-label font-black uppercase tracking-widest">{t('மின் நூல்கள் காண்க', 'Browse Library')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </Link>
            </div>

            {/* Book grid — 3 cols on mobile, 4 on sm, 8 on lg */}
            <motion.div
              variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 md:gap-4 pb-2 sm:pb-0"
            >
              <style>{`
                @media (max-width: 639px) {
                  .home-ebook-grid-item:nth-child(n+7) { display: none; }
                }
              `}</style>
              {ebooks.slice(0, 8).map((book, idx) => (
                <motion.div key={book.id} variants={fadeUp}
                  className="home-ebook-card home-ebook-grid-item w-full">
                  <Link to={`/ebooks/${book.id}`} className="block w-full h-full p-2 sm:p-3 cursor-pointer">
                    <div className="aspect-[3/4] bg-white/5 flex items-center justify-center mb-2 overflow-hidden rounded-sm">
                      <img
                        src={getBookCover(book)}
                        alt={book.title_tamil}
                        className="h-full w-full object-contain p-1 group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                    <p className="tamil-label text-[9px] sm:text-[10px] text-gold/90 text-center font-black group-hover:text-white transition-colors line-clamp-2 leading-snug break-words">
                      {book.title_tamil}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}


      {/* ══════════════════════════════════════════
          SECTION 6 ▸ RESOURCES & FEEDBACK
      ══════════════════════════════════════════ */}
      <section className="home-resources-section relative">

        <div className="container mx-auto px-6 max-w-5xl" style={{ position: 'relative', zIndex: 3 }}>
          <motion.div className="flex items-center justify-center gap-3 mb-8" initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="resources-divider-line" />
            <div className="resources-divider-diamond" />
            <p className="home-section-label font-bold" style={{ color: '#2A0E00', letterSpacing: '0.25em' }}>
              {t('கூடுதல் வளங்கள்', 'ADDITIONAL RESOURCES')}
            </p>
            <div className="resources-divider-diamond" />
            <div className="resources-divider-line" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calendar PDF */}
            <motion.a
              href="https://suvadi.cict.in/asp/pdf/cyclic_list_of_tamilyears.pdf"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="group home-resource-card flex items-center gap-5 p-6"
            >
              <div className="home-resource-icon home-resource-icon-gold">
                <svg className="w-7 h-7" fill="#C9973B" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-4 6h6v2H8v-2zm0-4h6v2H8V11z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-maroon text-lg mb-0.5" style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Cinzel", serif' }}>
                  {t('தமிழ் அறுபதாண்டுச் சுழற்சி அட்டவணை', 'Tamil 60-Year Cycle Chart')}
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#7A4510' }}>
                  {t('பதிவிறக்கம் (PDF)', 'DOWNLOAD PDF RESOURCES')}
                </p>
              </div>
              <span className="text-maroon/60 text-xl group-hover:translate-x-1 transition-transform duration-300">→</span>
            </motion.a>

            {/* Feedback */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Link
                to="/feedback"
                className="group home-resource-card flex items-center gap-5 h-full p-6"
              >
                <div className="home-resource-icon home-resource-icon-maroon">
                  <svg className="w-7 h-7" fill="#6B2FA0" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                    <circle cx="8" cy="10" r="1.2" fill="#6B2FA0" />
                    <circle cx="12" cy="10" r="1.2" fill="#6B2FA0" />
                    <circle cx="16" cy="10" r="1.2" fill="#6B2FA0" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-maroon text-lg mb-0.5" style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Cinzel", serif' }}>
                    {t('கருத்துக்கள் - பதிவு', 'Feedback / Remarks')}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#7A4510' }}>
                    {t('உங்கள் கருத்துக்களைப் பகிரவும்', 'SHARE YOUR SCHOLARLY FEEDBACK')}
                  </p>
                </div>
                <span className="text-maroon/60 text-xl group-hover:translate-x-1 transition-transform duration-300">→</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

    </div>

  );
};

export default Home;
