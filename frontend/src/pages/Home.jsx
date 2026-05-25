import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
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
  },
  {
    num: '02',
    icon: '📚',
    ta: 'மின் நூலகம்',
    en: 'Digital Library',
    desc_ta: 'செவ்வியல் நூல்களின் முதல் அச்சுப் பதிப்புகளை படியுங்கள்.',
    desc_en: 'Access first printed editions of Classical Tamil texts online.',
    link: '/ebooks',
  },
  {
    num: '03',
    icon: '🏛️',
    ta: 'செம்பதிப்புகள்',
    en: 'Critical Editions',
    desc_ta: 'CICT வெளியிட்ட அதிகாரபூர்வ நூல் பதிப்புகள்.',
    desc_en: 'Authoritative critical editions published by CICT scholars.',
    link: '/classical-texts',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.15 } },
};

const Home = () => {
  const { t } = useLanguage();

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await axios.get(`${API}/api/stats`)).data,
  });

  const { data: ebooks = [] } = useQuery({
    queryKey: ['ebooks'],
    queryFn: async () => (await axios.get(`${API}/api/ebooks`)).data,
  });

  return (
    <div className="bg-ivory selection:bg-maroon selection:text-white">

      {/* ── SECTION 1: HERO BANNER ── */}
      <section className="relative w-full flex flex-col items-center justify-center overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-[#3D0707]" style={{ background: 'linear-gradient(160deg, #2A0505 0%, #4D0909 40%, #7A3010 80%, #2A0505 100%)' }} />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }} />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

        <div className="relative z-10 container mx-auto px-6 text-center max-w-5xl py-32">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} className="space-y-10">
            
            <div className="flex items-center justify-center gap-6">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/60" />
              <p className="font-cinzel text-[10px] md:text-xs uppercase tracking-[0.6em] text-gold/80 font-bold">
                {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
              </p>
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/60" />
            </div>

            <div className="space-y-3">
              <h1 className="tamil-heading text-white italic" style={{ fontSize: 'clamp(4rem, 12vw, 8.5rem)' }}>
                {t('சுவடி', 'Suvadi')}
              </h1>
              <p className="tamil-label text-gold/90 text-xl md:text-3xl tracking-widest font-black uppercase">
                {t('ஆவணக் கருவூலம்', 'Heritage Archive')}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="w-1.5 h-1.5 rounded-full border border-gold/40" />
              <div className="h-px w-24 bg-gold/20" />
              <div className="w-1.5 h-1.5 rounded-full border border-gold/40" />
            </div>

            <p className="tamil-body text-white/70 max-w-2xl mx-auto leading-loose text-lg md:text-xl font-medium">
              {t(
                'ஓலைச்சுவடிகளிலிருந்து செம்பதிப்புகள் வரை — தமிழ் செவ்வியல் இலக்கியத்தின் மின்னணு ஆவணக் கருவூலம்.',
                'From sacred palm-leaf manuscripts to modern critical editions — preserving the eternal voice of Classical Tamil civilization.'
              )}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 translate-y-0">
              <Link to="/search" id="hero-search-btn" className="group relative px-12 py-5 overflow-hidden">
                <div className="absolute inset-0 bg-gold transition-transform duration-500 group-hover:scale-105" />
                <div className="relative flex items-center gap-3 text-maroon font-black uppercase tracking-widest text-sm transition-transform group-hover:translate-x-1">
                  <span className="tamil-label">{t('சுவடிகளை தேடுக', 'Explore Archives')}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" /></svg>
                </div>
              </Link>
              <Link to="/ebooks" id="hero-ebooks-btn" className="px-12 py-5 border-2 border-gold/40 text-gold font-cinzel font-black uppercase tracking-widest text-sm hover:bg-gold/10 hover:border-gold transition-all duration-300">
                {t('மின் நூலகம்', 'Digital Library')}
              </Link>
            </div>

            {stats && (
              <div className="flex items-center justify-center gap-12 md:gap-24 pt-10 border-t border-white/10">
                {[
                  { val: stats.texts,      label: t('செவ்வியல் நூல்கள்', 'Works') },
                  { val: stats.manuscripts, label: t('சுவடி வகைகள்', 'Archives') },
                  { val: stats.songs > 999 ? Math.round(stats.songs / 1000) + 'k+' : stats.songs, label: t('சுவடி ஏடுகள்', 'Folios') },
                ].map((s, i) => (
                  <div key={i} className="group">
                    <div className="text-3xl md:text-5xl font-cinzel font-black text-white group-hover:text-gold transition-colors duration-500">{s.val}</div>
                    <div className="tamil-label text-[10px] uppercase tracking-[0.2em] text-gold/40 font-black mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <div className="absolute bottom-10 left-0 w-full flex justify-center">
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="flex flex-col items-center gap-2 text-gold/30">
            <span className="font-cinzel text-[8px] tracking-[0.6em] uppercase font-bold opacity-50">Discovery</span>
            <div className="w-px h-10 bg-gradient-to-b from-gold/50 to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: INSTITUTIONAL INTRODUCTION ── */}
      <section className="py-32 bg-ivory relative">
        <div className="container mx-auto px-6 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 items-start">
            
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
                <div className="w-24 h-1.5 bg-maroon" />
              </div>

              <div className="bg-white border-l-4 border-gold p-10 shadow-2xl relative overflow-hidden group">
                 <div className="absolute -bottom-10 -right-10 text-9xl text-gold/5 italic opacity-[0.03] select-none group-hover:opacity-[0.08] transition-opacity">CICT</div>
                 <p className="tamil-body text-maroon/70 text-lg leading-loose font-bold italic">
                   {t('உலகெங்கிலுமிருந்து கிடைக்கப் பெற்ற எல்லாச் சுவடிகளை ஆய்ந்து பாடங்களை உறுதிசெய்து செம்பதிப்பாகக் கொண்டு வருவதே எமது பணியாகும்.', 'We are mandated to survey global collections, authenticate variants, and publish definitive Critical Editions of Classical Tamil literature.')}
                 </p>
              </div>

              <div className="flex gap-4">
                <Link to="/search" className="btn-primary flex-1 py-5 shadow-maroon/20">
                  <span className="tamil-label font-black uppercase tracking-widest">{t('தேடல் பக்கம்', 'Access Search')}</span>
                </Link>
                <Link to="/team" className="btn-outline flex-1 py-5 border-maroon/20 text-maroon">
                  <span className="tamil-label font-black uppercase tracking-widest">{t('அறிஞர் குழு', 'Meet Faculty')}</span>
                </Link>
              </div>
            </div>

            <div className="space-y-10 pt-4">
               <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-maroon/10" />
                  <span className="tamil-text text-bronze text-sm font-bold italic">{t('சுருக்கக் குறிப்பு', 'Preservation Brief')}</span>
               </div>
               <div className="space-y-8 tamil-body text-stone/60 text-lg leading-relaxed font-medium">
                  <p>{t('ஓலைச்சுவடியில் நூல்களை எழுதி வைக்கும் பழக்கமானது 19ஆம் நூற்றாண்டு வரை நீடித்தது. அச்சு இயந்திரங்கள் அறிமுகத்தால் இவை அச்சில் ஏற்றப்பட்டன.', 'Until the 19th century, palm leaves were the primary medium of textual transmission. The advent of printing marked a revolutionary shift in accessibility.')}</p>
                  <p>{t('ஆறுமுக நாவலர், சி.வை. தாமோதரம்பிள்ளை, உ.வே. சாமிநாதையர் போன்ற முன்னோடிகள் சுவடிகளை நூல்களாகப் பதிப்பிக்கும் பணியைத் தொடங்கினர்.', 'Visionary scholars preserved our heritage by transitioning these fragile records into authoritative printed volumes for future generations.')}</p>
                  <p>{t('சுவடியியல் புலம் அந்தப் பணியைத் தொடர்ந்து மேம்பட்ட மின்னணுத் தொழில்நுட்பத்தால் உலகெங்கும் கொண்டு செல்கிறது.', 'Continuing this legacy, our Faculty leverages state-of-the-art digital infrastructure to make these treasures accessible to the global scholarly community.')}</p>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 3: STRATEGIC PILLARS ── */}
      <section className="py-24 bg-maroon relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }} />
        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Link to={f.link} className="group block bg-white/5 border border-gold/10 p-10 hover:bg-white/10 hover:border-gold/30 transition-all duration-500 h-full relative">
                  <div className="absolute top-0 right-0 p-6 text-gold/10 text-6xl font-black font-cinzel group-hover:text-gold/20 transition-colors">{f.num}</div>
                  <div className="text-5xl mb-8 group-hover:scale-110 transition-transform duration-500">{f.icon}</div>
                  <h3 className="tamil-label text-2xl text-gold mb-4 font-black">{t(f.ta, f.en)}</h3>
                  <p className="tamil-text text-white/60 text-sm leading-loose font-bold group-hover:text-white transition-colors">{t(f.desc_ta, f.desc_en)}</p>
                  <div className="mt-10 flex items-center gap-3 text-gold text-[10px] font-black uppercase tracking-[0.3em]">
                    <span>{t('தொடர்க', 'LAUNCH')}</span>
                    <div className="w-6 h-px bg-gold/50 group-hover:w-12 transition-all duration-500" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 4: RECENT PUBLICATIONS GALLERY ── */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-20">
            <p className="tamil-label text-bronze text-xs uppercase tracking-[0.4em] mb-4 font-black">{t('சுவடியியல் வெளியீடுகள்', 'ARCHIVAL PUBLICATIONS')}</p>
            <h2 className="tamil-heading text-4xl md:text-5xl text-maroon italic">{t('வெளியிடப்பட்ட செம்பதிப்புகள்', 'Published Critical Editions')}</h2>
            <div className="w-24 h-1 bg-gold/30 mx-auto mt-6" />
          </div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-6">
            {CRITICAL_EDITIONS.map((ed, i) => (
              <motion.div key={i} variants={fadeUp} className="group relative">
                <div className="bg-[#FAF9F6] border border-maroon/5 p-2 shadow hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group-hover:border-gold/30">
                  <div className="relative aspect-[3/4] bg-stone/5 flex items-center justify-center overflow-hidden">
                    <img src={`${API}${ed.img}`} alt={ed.ta} className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-700"
                         onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span class="text-4xl">📚</span>'; }} />
                    <div className="absolute top-0 right-0 bg-maroon text-gold text-[8px] font-black px-2 py-1 shadow-lg">{ed.year}</div>
                  </div>
                  <div className="mt-4 pb-2">
                    <p className="tamil-label text-[11px] text-maroon text-center group-hover:text-gold transition-colors font-black line-clamp-2 leading-snug">{ed.ta}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          
          <div className="mt-16 text-center">
             <Link to="/classical-texts" className="tamil-label inline-flex items-center gap-6 text-bronze border-b-2 border-gold/20 pb-2 font-black uppercase tracking-widest hover:text-maroon hover:border-maroon transition-all">
               {t('அனைத்து வெளியீடுகளையும் காண்க', 'EXPLORE THE FULL CATALOGUE')} →
             </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: DIGITAL PREVIEW GRID ── */}
      {ebooks.length > 0 && (
        <section className="py-24 bg-ivory border-y border-maroon/10">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6">
              <div>
                <h2 className="tamil-heading text-3xl text-maroon">{t('முதல் அச்சுப் பதிப்புகள்', 'First Printed Editions Online')}</h2>
                <p className="tamil-text text-stone/40 text-sm font-bold uppercase tracking-widest mt-2">{t('மின் நூலகம்', 'Digital Repository access')}</p>
              </div>
              <Link to="/ebooks" className="btn-primary px-10 py-4 shadow-maroon/10">
                 <span className="tamil-label font-black uppercase tracking-widest">{t('மின் நூல்கள் காண்க', 'Browse Library')}</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {ebooks.slice(0, 6).map((book, idx) => (
                <motion.div key={book.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                  className="group bg-white p-4 shadow hover:shadow-xl transition-all duration-500 border border-transparent hover:border-gold/20">
                  <div className="aspect-square bg-stone/5 flex items-center justify-center mb-4 overflow-hidden">
                    <img src={`${API}${book.cover_image}`} alt={book.title_tamil} className="h-full w-full object-contain p-2 group-hover:scale-110 transition-transform duration-1000" />
                  </div>
                  <p className="tamil-label text-xs text-maroon text-center font-black group-hover:text-gold transition-colors line-clamp-1">{book.title_tamil}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 6: SCHOLARLY RESOURCES & FEEDBACK ── */}
      <section className="py-24 bg-ivory border-t border-maroon/10">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Calendar Link */}
            <a 
              href="https://suvadi.cict.in/asp/pdf/cyclic_list_of_tamilyears.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-6 bg-white border-b-4 border-gold p-8 shadow-xl hover:-translate-y-2 transition-all duration-500"
            >
              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-maroon/5 text-4xl group-hover:bg-gold group-hover:text-white transition-colors duration-500">📅</div>
              <div className="flex-1">
                <h3 className="tamil-heading text-xl text-maroon mb-1 group-hover:text-gold transition-colors">
                  {t('தமிழ் அறுபதாண்டுச் சுழற்சி அட்டவணை', 'Tamil 60-Year Cycle Chart')}
                </h3>
                <p className="tamil-text text-stone/40 text-xs font-bold uppercase tracking-widest">
                  {t('பதிவிறக்கம் (PDF)', 'Download PDF Resources')}
                </p>
              </div>
              <span className="text-gold text-2xl group-hover:translate-x-2 transition-transform">→</span>
            </a>

            {/* Feedback Link */}
            <Link 
              to="/feedback" 
              className="group flex items-center gap-6 bg-white border-b-4 border-maroon p-8 shadow-xl hover:-translate-y-2 transition-all duration-500"
            >
              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-maroon/5 text-4xl group-hover:bg-maroon group-hover:text-white transition-colors duration-500">💬</div>
              <div className="flex-1">
                <h3 className="tamil-heading text-xl text-maroon mb-1 group-hover:text-gold transition-colors">
                  {t('கருத்துக்கள் - பதிவு', 'Feedback / Remarks')}
                </h3>
                <p className="tamil-text text-stone/40 text-xs font-bold uppercase tracking-widest">
                  {t('உங்கள் கருத்துக்களைப் பகிரவும்', 'Share your scholarly feedback')}
                </p>
              </div>
              <span className="text-maroon text-2xl group-hover:translate-x-2 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: INSTITUTIONAL FOOTER ── */}
      <footer className="pt-24 pb-12 bg-maroon relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-[0.05]" />
        <div className="container mx-auto px-6 max-w-5xl relative z-10 text-center">
          <img src="/images/Untitled.png" alt="CICT" className="h-16 mx-auto mb-10 opacity-60 invert grayscale" onError={e => e.target.style.display = 'none'} />
          
          <div className="grid md:grid-cols-3 gap-12 mb-16 text-left">
             <div className="space-y-6">
                <h4 className="tamil-label text-gold text-sm font-black uppercase tracking-widest border-b border-gold/10 pb-3">{t('தொடர்பு', 'CONTACT')}</h4>
                <div className="tamil-text text-white/50 text-sm space-y-2 font-bold leading-loose">
                   <p>{t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}</p>
                   <p>{t('சென்னை – 600100', 'Chennai – 600 100')}</p>
                   <p className="font-cinzel tracking-widest text-[10px] text-gold/40">suvadi@cict.in</p>
                </div>
             </div>
             <div className="space-y-6">
                <h4 className="tamil-label text-gold text-sm font-black uppercase tracking-widest border-b border-gold/10 pb-3">{t('இணைப்புகள்', 'QUICK LINKS')}</h4>
                <ul className="tamil-text text-white/50 text-sm space-y-3 font-bold">
                   <li><Link to="/search" className="hover:text-gold transition-colors">{t('சுவடித் தேடல்', 'Manuscript Search')}</Link></li>
                   <li><Link to="/ebooks" className="hover:text-gold transition-colors">{t('மின் நூலகம்', 'Digital Library')}</Link></li>
                   <li><Link to="/classical-texts" className="hover:text-gold transition-colors">{t('செவ்வியல் நூல்கள்', 'Classical Texts')}</Link></li>
                </ul>
             </div>
             <div className="space-y-6">
                <h4 className="tamil-label text-gold text-sm font-black uppercase tracking-widest border-b border-gold/10 pb-3">{t('அறக்கட்டளை', 'LEGACY')}</h4>
                <p className="tamil-text text-white/30 text-[13px] font-bold leading-relaxed italic">
                   {t('தமிழ் மொழிக்கும் அதன் உயரிய இலக்கிய விழுமியங்களுக்கும் அற்பணிக்கப்பட்ட தளம்.', 'A dedicated repository for the preservation and study of Classical Tamil literary traditions.')}
                </p>
             </div>
          </div>

          <div className="pt-12 border-t border-white/5">
             <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-30">
                <p className="tamil-text text-[10px] text-white font-bold tracking-widest uppercase">© {new Date().getFullYear()} {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}</p>
                <div className="flex gap-8">
                   <span className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-white font-black">Open Access</span>
                   <span className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-white font-black">Digital Preservation</span>
                </div>
             </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;
