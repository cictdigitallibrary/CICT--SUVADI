import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

// Members managed in the admin panel (Team tab), mapped to the fields this page shows.
// Photo paths like "/images/team/x.jpg" are served by the backend.
const fromAdmin = m => ({
  id: `db-${m.id}`,
  name_tamil: m.name,
  name_english: m.name,
  title_tamil: m.role_tamil || m.role_english || '',
  photo: m.photo_url || '',
  localAsset: !/^\/images\//.test(m.photo_url || ''),
});

const Team = () => {
  const { t } = useLanguage();
  // The admin's team list once it has members; until then (the table is empty today)
  // the built-in list above, so the page never shows an empty team
  const { data: adminMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: async () => (await axios.get(`${API}/api/team`)).data,
  });
  const members = Array.isArray(adminMembers) && adminMembers.length > 0 ? adminMembers.map(fromAdmin) : TEAM_MEMBERS;

  return (
    <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white">
      {/* Override only the Team hero height via padding, preserving the original background */}
      <style>{`
        .team-hero-override header {
          padding-top: 8rem !important;
          padding-bottom: 6rem !important;
        }
      `}</style>
      <div className="team-hero-override">
        <PageHero
          title={t('எங்கள் குழு', 'Our Team')}
          glyphs={['அறி', 'வேல்', 'பண்', 'நூல்', 'ஆய்', 'செம்']}
          headingStyle={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.2 }}
        />
      </div>

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
            {members.map((member) => {
              const photoUrl = member.localAsset ? member.photo
                : /^\/images\//.test(member.photo) ? `${API}${member.photo}`
                : `${API}/images/team/${member.photo}`;

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


      </div>
    </div>
  );
};

export default Team;
