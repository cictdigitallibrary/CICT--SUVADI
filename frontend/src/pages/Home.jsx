import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const API = 'http://localhost:3001';

const CRITICAL_EDITIONS = [
  { ta: 'இறையனார் களவியல்',       en: 'Irayanar Kalviyar',       year: '2013', img: '/images/edition/1.png' },
  { ta: 'ஐங்குறுநூறு – மருதம்',   en: 'Aingurunuru – Marutam',   year: '2017', img: '/images/edition/2.png' },
  { ta: 'ஐங்குறுநூறு – நெய்தல்',  en: 'Aingurunuru – Neital',    year: '2017', img: '/images/edition/3.png' },
  { ta: 'ஐங்குறுநூறு – குறிஞ்சி', en: 'Aingurunuru – Kurinji',   year: '2021', img: '/images/edition/4.png' },
  { ta: 'ஐங்குறுநூறு – பாலை',     en: 'Aingurunuru – Palai',     year: '2021', img: '/images/edition/5.png' },
  { ta: 'கைந்நிலை',               en: 'Kainnilai',               year: '2024', img: '/images/edition/6.png' },
  { ta: 'ஐங்குறுநூறு – முல்லை',   en: 'Aingurunuru – Mullai',    year: 'Press', img: '/images/edition/7.png' },
];

const FEATURES = [
  {
    num: '01',
    icon: '📜',
    ta: 'சுவடிகளின் தேடல்',
    en: 'Manuscript Search',
    desc_ta: 'உலகெங்கும் உள்ள ஓலைச்சுவடிகளை ஆராய்ச்சி செய்யுங்கள்.',
    desc_en: 'Search and explore palm-leaf manuscripts preserved across the world.',
    link: '/search',
    accent: '#C9973B',
  },
  {
    num: '02',
    icon: '📚',
    ta: 'மின் நூலகம்',
    en: 'Digital Library',
    desc_ta: 'செவ்வியல் நூல்களின் முதல் அச்சுப் பதிப்புகளை படியுங்கள்.',
    desc_en: 'Access first printed editions of Classical Tamil texts online.',
    link: '/ebooks',
    accent: '#8B5E3C',
  },
  {
    num: '03',
    icon: '🏛️',
    ta: 'செம்பதிப்புகள்',
    en: 'Critical Editions',
    desc_ta: 'CICT வெளியிட்ட அதிகாரபூர்வ நூல் பதிப்புகள்.',
    desc_en: 'Authoritative critical editions published by CICT scholars.',
    link: '/classical-texts',
    accent: '#7A3010',
  },
];

/* ── Floating Tamil glyphs for hero decoration ── */
const FLOATING_GLYPHS = ['ஓம்', 'தமிழ்', 'சுவடி', 'அ', 'ம்', 'ல்', 'ர்', 'ழ்'];

/* ── Animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.15 } },
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
      <div className="text-3xl md:text-5xl font-cinzel font-black text-white group-hover:text-gold transition-colors duration-500 tabular-nums">
        {count || val}
      </div>
      <div className="tamil-label text-[10px] uppercase tracking-[0.2em] text-gold/40 font-black mt-1">{label}</div>
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
  const { t } = useLanguage();
  const scrollRef = useRef(null);

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await axios.get(`${API}/api/stats`)).data,
  });

  const { data: ebooks = [] } = useQuery({
    queryKey: ['ebooks'],
    queryFn: async () => (await axios.get(`${API}/api/ebooks`)).data,
  });

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
    <div className="bg-ivory selection:bg-maroon selection:text-white overflow-x-hidden">

      {/* ══════════════════════════════════════════
          SECTION 1 ▸ HERO
      ══════════════════════════════════════════ */}
      <section className="relative w-full flex flex-col items-center justify-center overflow-hidden min-h-screen">

        {/* Background gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #1A0303 0%, #3D0707 35%, #6B2010 70%, #1A0303 100%)' }} />

        {/* Subtle leather texture */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }} />

        {/* Radial glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #C9973B 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #E8B86D 0%, transparent 70%)', filter: 'blur(80px)' }} />

        {/* Animated floating Tamil glyphs */}
        {FLOATING_GLYPHS.map((g, i) => (
          <motion.div
            key={i}
            className="absolute select-none pointer-events-none font-black text-gold/[0.04]"
            style={{
              left: `${8 + (i * 12) % 88}%`,
              top: `${10 + (i * 17) % 75}%`,
              fontSize: `${3 + (i % 4)}rem`,
              fontFamily: '"Baloo Thambi 2", sans-serif',
            }}
            animate={{ y: [0, -20, 0], rotate: [0, i % 2 === 0 ? 5 : -5, 0] }}
            transition={{ duration: 6 + i * 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          >
            {g}
          </motion.div>
        ))}

        {/* Decorative ring */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/10"
          style={{ width: '600px', height: '600px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/5"
          style={{ width: '900px', height: '900px' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
        />

        {/* Bottom divider */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

        {/* Hero content */}
        <div className="relative z-10 container mx-auto px-6 text-center max-w-5xl py-40">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} className="space-y-10">

            {/* Institutional label */}
            <motion.div className="flex items-center justify-center gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/60" />
              <p className="font-cinzel text-[10px] md:text-xs uppercase tracking-[0.6em] text-gold/80 font-bold">
                {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
              </p>
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/60" />
            </motion.div>

            {/* Main title */}
            <motion.div className="space-y-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }}>
              <h1 className="tamil-heading text-white italic" style={{ fontSize: 'clamp(4rem, 12vw, 8.5rem)', textShadow: '0 0 80px rgba(201,151,59,0.15)' }}>
                {t('சுவடி', 'Suvadi')}
              </h1>
              <p className="tamil-label text-gold/90 text-xl md:text-3xl tracking-widest font-black uppercase">
                {t('ஆவணக் கருவூலம்', 'Heritage Archive')}
              </p>
            </motion.div>

            {/* Ornamental separator */}
            <motion.div className="flex items-center justify-center gap-4" initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.7, duration: 0.8 }}>
              <div className="w-1.5 h-1.5 rounded-full border border-gold/40" />
              <div className="h-px w-24 bg-gold/20" />
              <div className="w-2 h-2 rounded-full bg-gold/30" />
              <div className="h-px w-24 bg-gold/20" />
              <div className="w-1.5 h-1.5 rounded-full border border-gold/40" />
            </motion.div>

            {/* Tagline */}
            <motion.p className="tamil-body text-white/70 max-w-2xl mx-auto leading-loose text-lg md:text-xl font-medium"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }}>
              {t(
                'ஓலைச்சுவடிகளிலிருந்து செம்பதிப்புகள் வரை — தமிழ் செவ்வியல் இலக்கியத்தின் மின்னணு ஆவணக் கருவூலம்.',
                'From sacred palm-leaf manuscripts to modern critical editions — preserving the eternal voice of Classical Tamil civilization.'
              )}
            </motion.p>

            {/* CTA buttons */}
            <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.8 }}>
              <Link to="/search" id="hero-search-btn" className="group relative px-12 py-5 overflow-hidden shadow-xl shadow-gold/10">
                <div className="absolute inset-0 bg-gold transition-all duration-500 group-hover:bg-gold-light" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(135deg, #E8B86D, #C9973B)' }} />
                <div className="relative flex items-center gap-3 text-maroon font-black uppercase tracking-widest text-sm transition-transform group-hover:translate-x-1">
                  <span className="tamil-label">{t('சுவடிகளை தேடுக', 'Explore Archives')}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              <Link to="/ebooks" id="hero-ebooks-btn"
                className="group px-12 py-5 border-2 border-gold/40 text-gold font-cinzel font-black uppercase tracking-widest text-sm hover:bg-gold/10 hover:border-gold transition-all duration-300 relative overflow-hidden">
                <span className="relative z-10">{t('மின் நூலகம்', 'Digital Library')}</span>
              </Link>
            </motion.div>

            {/* Stats */}
            {stats && (
              <motion.div className="flex items-center justify-center gap-12 md:gap-24 pt-10 border-t border-white/10"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }}>
                {[
                  { val: stats.texts,      label: t('செவ்வியல் நூல்கள்', 'Works') },
                  { val: stats.manuscripts, label: t('சுவடி வகைகள்', 'Archives') },
                  { val: stats.songs > 999 ? Math.round(stats.songs / 1000) + 'k+' : stats.songs, label: t('சுவடி ஏடுகள்', 'Folios') },
                ].map((s, i) => (
                  <StatItem key={i} val={s.val} label={s.label} />
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-0 w-full flex justify-center">
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="flex flex-col items-center gap-2">
            <span className="font-cinzel text-[8px] tracking-[0.6em] uppercase font-bold text-gold/30">Scroll</span>
            <motion.div className="w-[1px] h-10 bg-gradient-to-b from-gold/50 to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 2 ▸ INSTITUTIONAL INTRODUCTION
      ══════════════════════════════════════════ */}
      <section className="py-32 bg-ivory relative overflow-hidden">
        {/* Decorative large Tamil character watermark */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[20rem] font-black text-maroon/[0.02] select-none pointer-events-none leading-none"
          style={{ fontFamily: '"Baloo Thambi 2", sans-serif' }}>சு</div>

        <div className="container mx-auto px-6 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 items-start">

            {/* Left column */}
            <div className="space-y-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-maroon rounded-full" />
                  <span className="tamil-label text-xs text-bronze uppercase tracking-[0.3em] font-black">
                    {t('நிறுவன அறிமுகம்', 'Institutional Charter')}
                  </span>
                </div>
                <h2 className="tamil-heading text-5xl md:text-6xl text-maroon font-black italic">
                  {t('சுவடியியல் புலம்', 'Faculty of Manuscriptology')}
                </h2>
                <div className="w-24 h-1.5 bg-gradient-to-r from-maroon to-gold/50" />
              </div>

              {/* Mission quote */}
              <div className="bg-white border-l-4 border-gold p-10 shadow-2xl relative overflow-hidden group hover:shadow-gold/10 transition-shadow duration-500">
                <div className="absolute -bottom-10 -right-10 text-9xl text-gold/5 italic opacity-[0.03] select-none group-hover:opacity-[0.08] transition-opacity">CICT</div>
                <div className="absolute top-4 left-4 text-4xl text-gold/10 font-serif select-none">"</div>
                <p className="tamil-body text-maroon/70 text-lg leading-loose font-bold italic">
                  {t('உலகெங்கிலுமிருந்து கிடைக்கப் பெற்ற எல்லாச் சுவடிகளை ஆய்ந்து பாடங்களை உறுதிசெய்து செம்பதிப்பாகக் கொண்டு வருவதே எமது பணியாகும்.',
                    'We are mandated to survey global collections, authenticate variants, and publish definitive Critical Editions of Classical Tamil literature.')}
                </p>
              </div>

              <div className="flex gap-4">
                <Link to="/search" className="btn-primary flex-1 py-5 shadow-maroon/20 text-center">
                  <span className="tamil-label font-black uppercase tracking-widest">{t('தேடல் பக்கம்', 'Access Search')}</span>
                </Link>
                <Link to="/team" className="btn-outline flex-1 py-5 border-maroon/20 text-maroon text-center">
                  <span className="tamil-label font-black uppercase tracking-widest">{t('அறிஞர் குழு', 'Meet Faculty')}</span>
                </Link>
              </div>
            </div>

            {/* Right column — timeline narrative */}
            <div className="space-y-0 pt-4">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-maroon/10" />
                <span className="tamil-text text-bronze text-sm font-bold italic">{t('சுருக்கக் குறிப்பு', 'Preservation Brief')}</span>
              </div>

              {[
                {
                  era: t('19ஆம் நூற்றாண்டு', '19th Century'),
                  icon: '🌿',
                  text: t('ஓலைச்சுவடியில் நூல்களை எழுதி வைக்கும் பழக்கமானது 19ஆம் நூற்றாண்டு வரை நீடித்தது. அச்சு இயந்திரங்கள் அறிமுகத்தால் இவை அச்சில் ஏற்றப்பட்டன.',
                    'Until the 19th century, palm leaves were the primary medium of textual transmission. The advent of printing marked a revolutionary shift in accessibility.')
                },
                {
                  era: t('முன்னோடிகள்', 'Pioneers'),
                  icon: '📖',
                  text: t('ஆறுமுக நாவலர், சி.வை. தாமோதரம்பிள்ளை, உ.வே. சாமிநாதையர் போன்ற முன்னோடிகள் சுவடிகளை நூல்களாகப் பதிப்பிக்கும் பணியைத் தொடங்கினர்.',
                    'Visionary scholars preserved our heritage by transitioning these fragile records into authoritative printed volumes for future generations.')
                },
                {
                  era: t('இன்று', 'Today'),
                  icon: '💻',
                  text: t('சுவடியியல் புலம் அந்தப் பணியைத் தொடர்ந்து மேம்பட்ட மின்னணுத் தொழில்நுட்பத்தால் உலகெங்கும் கொண்டு செல்கிறது.',
                    'Continuing this legacy, our Faculty leverages state-of-the-art digital infrastructure to make these treasures accessible to the global scholarly community.')
                },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6 }}
                  className="flex gap-6 group pb-8 last:pb-0">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-ivory border-2 border-maroon/20 flex items-center justify-center text-lg group-hover:border-gold transition-colors duration-300 shadow-sm">
                      {item.icon}
                    </div>
                    {i < 2 && <div className="w-px flex-1 bg-gradient-to-b from-maroon/20 to-transparent mt-2 min-h-[2rem]" />}
                  </div>
                  {/* Content */}
                  <div className="pb-2">
                    <span className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-bronze font-bold block mb-2">{item.era}</span>
                    <p className="tamil-text text-stone/60 text-base leading-relaxed font-medium">{item.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 3 ▸ STRATEGIC PILLARS
      ══════════════════════════════════════════ */}
      <section className="py-24 bg-maroon relative overflow-hidden">
        {/* Background textures */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }} />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#C9973B 1px, transparent 1px), linear-gradient(90deg, #C9973B 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          {/* Section header */}
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="font-cinzel text-[10px] uppercase tracking-[0.5em] text-gold/50 font-bold block mb-3">
              {t('நமது சேவைகள்', 'Our Services')}
            </span>
            <h2 className="tamil-heading text-3xl md:text-4xl text-white font-black italic">
              {t('ஆய்வுக் கருவிகள்', 'Research Tools')}
            </h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Link to={f.link} className="group block relative h-full">
                  {/* Card */}
                  <div className="relative bg-white/[0.03] border border-gold/10 p-10 hover:bg-white/[0.08] hover:border-gold/40 transition-all duration-500 h-full overflow-hidden">
                    {/* Hover accent glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `radial-gradient(ellipse at top left, ${f.accent}15 0%, transparent 60%)` }} />

                    {/* Top accent line that fills on hover */}
                    <div className="absolute top-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-700 bg-gradient-to-r from-gold to-gold-light" />

                    {/* Number watermark */}
                    <div className="absolute top-0 right-0 p-6 text-[5rem] font-black font-cinzel text-gold/[0.07] leading-none group-hover:text-gold/[0.15] transition-colors select-none">
                      {f.num}
                    </div>

                    {/* Icon with glow */}
                    <div className="relative mb-8">
                      <div className="text-5xl transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1 inline-block">
                        {f.icon}
                      </div>
                      <div className="absolute -bottom-2 left-2 w-8 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
                        style={{ background: f.accent }} />
                    </div>

                    <h3 className="tamil-label text-2xl text-gold mb-4 font-black">{t(f.ta, f.en)}</h3>
                    <p className="tamil-text text-white/60 text-sm leading-loose font-bold group-hover:text-white/80 transition-colors duration-300">
                      {t(f.desc_ta, f.desc_en)}
                    </p>

                    {/* Arrow CTA */}
                    <div className="mt-10 flex items-center gap-3 text-gold text-[10px] font-black uppercase tracking-[0.3em]">
                      <span className="group-hover:text-gold-light transition-colors">{t('தொடர்க', 'LAUNCH')}</span>
                      <div className="h-px bg-gold/50 transition-all duration-500 w-6 group-hover:w-16" />
                      <svg className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 5l7 7-7 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
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
      <section className="py-32 bg-white relative overflow-hidden">
        {/* Subtle paper texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/paper.png')" }} />

        <div className="container mx-auto px-6 max-w-6xl relative">
          {/* Header */}
          <motion.div className="text-center mb-20" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="tamil-label text-bronze text-xs uppercase tracking-[0.4em] mb-4 font-black">
              {t('சுவடியியல் வெளியீடுகள்', 'ARCHIVAL PUBLICATIONS')}
            </p>
            <h2 className="tamil-heading text-4xl md:text-5xl text-maroon italic">
              {t('வெளியிடப்பட்ட செம்பதிப்புகள்', 'Published Critical Editions')}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className="h-px w-16 bg-gold/30" />
              <div className="w-2 h-2 bg-gold/40 rounded-full" />
              <div className="h-px w-16 bg-gold/30" />
            </div>
          </motion.div>

          {/* Draggable horizontal scroll strip */}
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-6 select-none"
            style={{ cursor: 'grab', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
          >
            <style>{`.scroll-hide::-webkit-scrollbar{display:none}`}</style>
            {CRITICAL_EDITIONS.map((ed, i) => (
              <TiltCard key={i} className="flex-shrink-0 w-40 md:w-44">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="group bg-[#FAF9F6] border border-maroon/5 p-2 shadow-md hover:shadow-2xl hover:shadow-maroon/10 transition-all duration-500 hover:border-gold/30 relative"
                >
                  <div className="relative aspect-[3/4] bg-stone/5 flex items-center justify-center overflow-hidden">
                    <img
                      src={`${API}${ed.img}`}
                      alt={ed.ta}
                      className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                      onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span class="text-4xl">📚</span>'; }}
                    />
                    {/* Year badge */}
                    <div className="absolute top-0 right-0 bg-maroon text-gold text-[8px] font-black px-2 py-1 shadow-lg">{ed.year}</div>
                    {/* Shimmer overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-maroon/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <div className="mt-4 pb-2 px-1">
                    <p className="tamil-label text-[11px] text-maroon text-center group-hover:text-gold transition-colors font-black line-clamp-2 leading-snug">{ed.ta}</p>
                  </div>
                </motion.div>
              </TiltCard>
            ))}
          </div>

          {/* Drag hint */}
          <p className="text-center text-stone/30 text-[10px] font-cinzel uppercase tracking-widest mt-3">
            {t('இழுத்து பார்க்கவும்', '← drag to explore →')}
          </p>

          <div className="mt-12 text-center">
            <Link to="/classical-texts"
              className="tamil-label inline-flex items-center gap-4 text-bronze border-b-2 border-gold/20 pb-2 font-black uppercase tracking-widest hover:text-maroon hover:border-maroon transition-all group">
              <span>{t('அனைத்து வெளியீடுகளையும் காண்க', 'EXPLORE THE FULL CATALOGUE')}</span>
              <span className="transition-transform group-hover:translate-x-2 duration-300">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 5 ▸ DIGITAL EBOOK PREVIEW
      ══════════════════════════════════════════ */}
      {ebooks.length > 0 && (
        <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F5F0E8 0%, #EDE5D8 100%)' }}>
          {/* Side accent bars */}
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-maroon/20 to-transparent" />
          <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-gold/20 to-transparent" />

          <div className="container mx-auto px-6 max-w-6xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-14 gap-6">
              <div>
                <span className="font-cinzel text-[10px] uppercase tracking-[0.5em] text-bronze font-bold block mb-2">
                  {t('மின் நூலகம்', 'Digital Repository')}
                </span>
                <h2 className="tamil-heading text-3xl md:text-4xl text-maroon">
                  {t('முதல் அச்சுப் பதிப்புகள்', 'First Printed Editions Online')}
                </h2>
              </div>
              <Link to="/ebooks" className="btn-primary px-10 py-4 shadow-maroon/10 flex-shrink-0">
                <span className="tamil-label font-black uppercase tracking-widest">{t('மின் நூல்கள் காண்க', 'Browse Library')}</span>
              </Link>
            </div>

            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
              {ebooks.slice(0, 6).map((book, idx) => (
                <motion.div key={book.id} variants={fadeUp}
                  className="group bg-white shadow-md hover:shadow-xl transition-all duration-500 border border-transparent hover:border-gold/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-maroon to-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="p-4">
                    <div className="aspect-[3/4] bg-stone/5 flex items-center justify-center mb-3 overflow-hidden">
                      <img
                        src={`${API}${book.cover_image}`}
                        alt={book.title_tamil}
                        className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                    <p className="tamil-label text-xs text-maroon text-center font-black group-hover:text-gold transition-colors line-clamp-2 leading-snug">
                      {book.title_tamil}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          SECTION 6 ▸ RESOURCES & FEEDBACK
      ══════════════════════════════════════════ */}
      <section className="py-24 bg-ivory relative overflow-hidden">
        {/* Decorative divider top */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-maroon/15 to-transparent" />

        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="font-cinzel text-[10px] uppercase tracking-[0.5em] text-bronze font-bold">
              {t('கூடுதல் வளங்கள்', 'Additional Resources')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Calendar PDF */}
            <motion.a
              href="https://suvadi.cict.in/asp/pdf/cyclic_list_of_tamilyears.pdf"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="group flex items-center gap-6 bg-white border-b-4 border-gold p-8 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gold/0 to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-gold/10 text-4xl group-hover:bg-gold group-hover:scale-110 transition-all duration-500 shadow-sm">📅</div>
              <div className="flex-1 relative">
                <h3 className="tamil-heading text-xl text-maroon mb-1 group-hover:text-gold transition-colors">
                  {t('தமிழ் அறுபதாண்டுச் சுழற்சி அட்டவணை', 'Tamil 60-Year Cycle Chart')}
                </h3>
                <p className="tamil-text text-stone/40 text-xs font-bold uppercase tracking-widest">
                  {t('பதிவிறக்கம் (PDF)', 'Download PDF Resources')}
                </p>
              </div>
              <span className="text-gold text-2xl flex-shrink-0 group-hover:translate-x-2 transition-transform duration-300">→</span>
            </motion.a>

            {/* Feedback */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Link
                to="/feedback"
                className="group flex items-center gap-6 bg-white border-b-4 border-maroon p-8 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden block h-full"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-maroon/0 to-maroon/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-maroon/5 text-4xl group-hover:bg-maroon group-hover:scale-110 transition-all duration-500 shadow-sm">💬</div>
                <div className="flex-1 relative">
                  <h3 className="tamil-heading text-xl text-maroon mb-1 group-hover:text-gold transition-colors">
                    {t('கருத்துக்கள் - பதிவு', 'Feedback / Remarks')}
                  </h3>
                  <p className="tamil-text text-stone/40 text-xs font-bold uppercase tracking-widest">
                    {t('உங்கள் கருத்துக்களைப் பகிரவும்', 'Share your scholarly feedback')}
                  </p>
                </div>
                <span className="text-maroon text-2xl flex-shrink-0 group-hover:translate-x-2 transition-transform duration-300">→</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
