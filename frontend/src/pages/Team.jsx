import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';

const API = 'http://localhost:3001';

const PHOTO_FILES = [
  'director1.jpg',
  'arulmani.jpg',
  'tamilvannan.jpg',
  'thamarai.jpg',
  'venki.jpg',
  'nagarajan.jpg',
  'karumbu.jpg',
  'director.jpg',
];

const EDITIONS = [
  { ta: 'இறையனார் களவியல்',       en: 'Irayanar Kalv.',     yr: '2013' },
  { ta: 'ஐங்குறுநூறு — மருதம்',   en: 'Aingurunuru',        yr: '2017' },
  { ta: 'ஐங்குறுநூறு — நெய்தல்',  en: 'Aingurunuru',        yr: '2017' },
  { ta: 'ஐங்குறுநூறு — குறிஞ்சி', en: 'Aingurunuru',        yr: '2021' },
  { ta: 'ஐங்குறுநூறு — பாலை',     en: 'Aingurunuru',        yr: '2021' },
  { ta: 'கைந்நிலை',               en: 'Kainnilai',          yr: '2024' },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const Team = () => {
  const { t } = useLanguage();

  const { data: team = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => (await axios.get(`${API}/api/team`)).data,
  });

  return (
    <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white">

      <PageHero
        label={t('உருவாக்கம்', 'THE SCHOLARLY TEAM')}
        title={t('சுவடியியல் புலம்', 'Faculty of Manuscriptology')}
        subtitle={t(
          'ஓலைச்சுவடிகளை ஆய்ந்து செம்பதிப்புகளை வெளியிடும் சுவடியியல் புலத்தின் அறிஞர் குழு.',
          'A dedicated group of researchers and scholars at CICT committed to preserving Classical Tamil heritage through critical scholarship.'
        )}
        glyphs={['அறி', 'வேல்', 'பண்', 'நூல்', 'ஆய்', 'செம்']}
      />

      <div className="container mx-auto px-6 max-w-6xl py-20">

        {/* ── Team Grid ── */}
        <div className="mb-24">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-10 h-10 border-2 border-maroon/10 border-t-gold rounded-full animate-spin" />
              <p className="font-cinzel text-bronze text-[10px] tracking-[0.4em] animate-pulse">
                {t('பதிவிறக்கம் செய்கிறது...', 'LOADING TEAM...')}
              </p>
            </div>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-8 xl:gap-12"
            >
              {team.map((member, idx) => {
                const photoFile = PHOTO_FILES[idx] || 'director.jpg';
                const photoUrl = `${API}/images/team/${photoFile}`;

                return (
                  <motion.div key={member.id} variants={fadeUp} className="group">
                    {/* Photo Frame */}
                    <div className="relative mb-6 overflow-hidden aspect-[1/1.2] bg-white border border-maroon/10 p-2 shadow-md group-hover:shadow-xl group-hover:border-gold/30 transition-all duration-500">
                      {/* Top accent on hover */}
                      <div className="absolute top-0 left-0 w-0 group-hover:w-full h-[3px] bg-gradient-to-r from-maroon to-gold transition-all duration-700 z-10" />

                      <div className="w-full h-full overflow-hidden bg-stone/5 relative">
                        <img
                          src={photoUrl}
                          alt={member.name_english}
                          className="w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                          onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        {/* Fallback avatar */}
                        <div
                          className="absolute inset-0 items-center justify-center bg-maroon/5 text-6xl font-cinzel text-maroon/10"
                          style={{ display: 'none' }}
                        >
                          {member.name_tamil?.charAt(0) || '?'}
                        </div>
                        {/* Subtle overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-maroon/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="text-center">
                      <div className="inline-block px-3 py-1 bg-maroon/[0.04] border border-maroon/10 mb-3 group-hover:bg-gold/10 group-hover:border-gold/20 transition-all duration-300">
                        <span className="tamil-label text-[9px] text-bronze uppercase tracking-[0.2em] font-bold">
                          {t(member.title_tamil, member.title_english)}
                        </span>
                      </div>
                      <h3 className="tamil-label text-base text-maroon font-black mb-1 group-hover:text-gold transition-colors duration-300">
                        {t(member.name_tamil, member.name_english)}
                      </h3>
                      {member.email && (
                        <p className="font-cinzel text-[9px] text-stone/40 font-bold uppercase tracking-widest">{member.email}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* ── Mission Banner ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-maroon text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }} />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

          {/* Decorative concentric rings */}
          <div className="absolute -left-32 -bottom-32 w-96 h-96 rounded-full border border-gold/5" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full border border-gold/5" />
          <div className="absolute -right-32 -top-32 w-80 h-80 rounded-full border border-gold/5" />

          <div className="relative z-10 p-10 md:p-16 max-w-3xl mx-auto text-center">
            <div className="text-gold text-2xl mb-8 opacity-40 select-none">❦</div>
            <h2 className="tamil-heading text-3xl text-gold mb-8">
              {t('நிறுவனக் குறிக்கோள்', 'Strategic Mission')}
            </h2>
            <p className="tamil-body text-white/70 text-lg md:text-xl font-medium leading-loose mb-12">
              {t(
                'உலகெங்கிலுமிருந்து கிடைக்கப் பெற்ற எல்லாச் சுவடிகள், பதிப்புகளை ஆய்ந்து, பாடங்களை உறுதிசெய்து செம்பதிப்பாகக் கொண்டு வருவதைச் சுவடியியல் புலத்தின் தலையாய பணியாகக் கொண்டுள்ளது.',
                'We strive to collect every available manuscript across the globe, meticulously analyze textual variations, and establish authoritative Critical Editions that serve as the definitive standard for Classical Tamil scholarship.'
              )}
            </p>

            {/* Published works grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {EDITIONS.map((ed, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white/5 border border-gold/10 p-4 text-center hover:bg-white/10 hover:border-gold/25 transition-all duration-300 group"
                >
                  <div className="text-gold font-cinzel text-xs font-bold mb-1 group-hover:text-gold-light transition-colors">{ed.yr}</div>
                  <div className="tamil-label text-[10px] text-white/80 font-bold">{t(ed.ta, ed.en)}</div>
                </motion.div>
              ))}
            </div>

            <p className="font-cinzel text-[9px] text-gold/40 uppercase tracking-[0.5em] font-bold mt-16">
              {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
            </p>
          </div>
        </motion.section>

      </div>
    </div>
  );
};

export default Team;
