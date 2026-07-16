import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';

const API = 'http://localhost:3001';

// Source: suvadi.cict.in/asp/team.aspx — all 7 members in official order
const TEAM_MEMBERS = [
  {
    id: 1,
    name_tamil: 'பேராசிரியர் இரா. சந்திரசேகரன்',
    name_english: 'Prof. Ra. Chandrasekaran',
    title_tamil: 'இயக்குநர்',
    title_english: 'Director',
    photo: 'director.jpg',
  },
  {
    id: 2,
    name_tamil: 'முனைவர் ரெ. புவனேஸ்வரி',
    name_english: 'Dr. Re. Bhuvaneswari',
    title_tamil: 'பதிவாளர்',
    title_english: 'Registrar',
    photo: '/images/registrar.png',
    localAsset: true,
  },
  {
    id: 3,
    name_tamil: 'முனைவர் இரா. அருள்மணி',
    name_english: 'Dr. Ra. Arulmani',
    title_tamil: 'ஒருங்கிணைப்பாளர் & ஆராய்ச்சி அலுவலர்',
    title_english: 'Coordinator & Research Officer',
    photo: 'arulmani.jpg',
  },
  {
    id: 4,
    name_tamil: 'முனைவர் ம. தமிழ்வாணன்',
    name_english: 'Dr. M. Tamilvannan',
    title_tamil: 'இளநிலை ஆராய்ச்சி அலுவலர்',
    title_english: 'Junior Research Officer',
    photo: 'tamilvannan.jpg',
  },
  {
    id: 5,
    name_tamil: 'முனைவர் சே. கரும்பாயிரம்',
    name_english: 'Dr. Se. Karumpaayiram',
    title_tamil: 'இளநிலை ஆராய்ச்சி அலுவலர்',
    title_english: 'Junior Research Officer',
    photo: 'karumbu.jpg',
  },
  {
    id: 6,
    name_tamil: 'முனைவர் ம. நாகராஜன்',
    name_english: 'Dr. M. Nagarajan',
    title_tamil: 'இளநிலை ஆராய்ச்சி அலுவலர்',
    title_english: 'Junior Research Officer',
    photo: 'nagarajan.jpg',
  },
  {
    id: 7,
    name_tamil: 'திரு. அ. முருக சுவாமிநாதன்',
    name_english: 'Mr. A. Muruga Swaminathan',
    title_tamil: 'நிரலாளர்',
    title_english: 'Programmer',
    photo: 'ams.jpg',
  },
  {
    id: 8,
    name_tamil: 'திரு. தி.ஞா. அருள்ஒளி',
    name_english: 'Mr. Ti. Gna. Arulolli',
    title_tamil: 'தரவு உள்ளீட்டாளர்',
    title_english: 'Data Entry Operator',
    photo: 'aruloli.jpg',
  },
];

const EDITIONS = [
  { ta: 'இறையனார் களவியல்', en: 'Irayanar Kalv.', yr: '2013' },
  { ta: 'ஐங்குறுநூறு — மருதம்', en: 'Aingurunuru', yr: '2017' },
  { ta: 'ஐங்குறுநூறு — நெய்தல்', en: 'Aingurunuru', yr: '2017' },
  { ta: 'ஐங்குறுநூறு — குறிஞ்சி', en: 'Aingurunuru', yr: '2021' },
  { ta: 'ஐங்குறுநூறு — பாலை', en: 'Aingurunuru', yr: '2021' },
  { ta: 'கைந்நிலை', en: 'Kainnilai', yr: '2024' },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const Team = () => {
  const { t } = useLanguage();

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

        {/* ── Section heading (matches official site: சுவடியியல் புலக் குழு) ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="font-cinzel text-[10px] uppercase tracking-[0.6em] text-gold/70 font-bold mb-3">
            {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
          </p>
          <h2 className="tamil-heading text-3xl text-maroon mb-5">
            {t('சுவடியியல் புலக் குழு', 'Manuscriptology Field Group')}
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/40" />
          </div>
        </motion.div>

        {/* ── Team Grid ── */}
        <div className="mb-24">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 xl:gap-10"
          >
            {TEAM_MEMBERS.map((member) => {
              const photoUrl = member.localAsset ? member.photo : `${API}/images/team/${member.photo}`;

              return (
                <motion.div key={member.id} variants={fadeUp} className="group">
                  {/* Photo Frame */}
                  <div className="relative mb-6 overflow-hidden aspect-[1/1.2] bg-white border border-maroon/10 p-2 shadow-md group-hover:shadow-xl group-hover:border-gold/30 transition-all duration-500">
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
                      {/* Fallback monogram */}
                      <div
                        className="absolute inset-0 items-center justify-center bg-maroon/5 text-6xl font-cinzel text-maroon/20"
                        style={{ display: 'none' }}
                      >
                        {member.name_english.charAt(0)}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-maroon/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-maroon/[0.04] border border-maroon/10 mb-3 group-hover:bg-gold/10 group-hover:border-gold/20 transition-all duration-300">
                      <span className="tamil-label text-[13px] text-bronze uppercase tracking-[0.2em] font-bold">
                        {member.title_tamil}
                      </span>
                    </div>
                    <h3 className="tamil-label text-[15px] text-maroon font-black mb-1 group-hover:text-gold transition-colors duration-300 leading-snug">
                      {member.name_tamil}
                    </h3>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
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
