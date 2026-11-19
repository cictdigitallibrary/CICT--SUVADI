import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';
import { usePageContent, useSiteContentState } from '../content/SiteContentProvider';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// The members (photo, post, name) are edited in the admin: Page Content → Team.
// Built-in list (the official order): content/siteDefaults.js.

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
  name: m.name,
  name_en: m.name,
  title: m.role_tamil || m.role_english || '',
  photo: !m.photo_url ? '' : /^\/images\//.test(m.photo_url) ? `${API}${m.photo_url}` : m.photo_url,
});

const Team = () => {
  const { t } = useLanguage();
  // The admin's team list once it has members; until then (the table is empty today)
  // the built-in list above, so the page never shows an empty team
  const { data: adminMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: async () => (await axios.get(`${API}/api/team`)).data,
  });
  // Page Content → Team once published there; else the Team Members tab's list if it has
  // members (it is empty today); else the built-in list
  const content = usePageContent('team');
  const { content: published } = useSiteContentState();
  const members = published.team?.members
    ? content.members('members')
    : Array.isArray(adminMembers) && adminMembers.length > 0 ? adminMembers.map(fromAdmin) : content.members('members');

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

        {/* ── Section heading (matches official site: சுவடியியல் புலக்குழு) ── */}
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
            {t('சுவடியியல் புலக்குழு', 'Manuscriptology Field Group')}
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/40" />
          </div>
        </motion.div>

        {/* ── Team list: one member per row, top to bottom in the order of the hierarchy ── */}
        <div className="mb-24">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.05 }}
            className="flex flex-col items-center gap-14 sm:gap-16"
          >
            {members.map((member, i) => {
              return (
                <motion.div key={member.id || i} variants={fadeUp} className="group w-full max-w-md">
                  {/* Photo Frame */}
                  <div className="relative mb-6 mx-auto w-full max-w-[240px] sm:max-w-[260px] overflow-hidden aspect-[1/1.2] bg-white border border-maroon/10 p-2 shadow-md group-hover:shadow-xl group-hover:border-gold/30 transition-all duration-500">
                    <div className="absolute top-0 left-0 w-0 group-hover:w-full h-[3px] bg-gradient-to-r from-maroon to-gold transition-all duration-700 z-10" />

                    <div className="w-full h-full overflow-hidden bg-stone/5 relative">
                      <img
                        src={member.photo || undefined}
                        alt={member.name_en}
                        style={member.photo ? undefined : { display: 'none' }}
                        className="w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                        onError={e => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      {/* Fallback monogram */}
                      <div
                        className="absolute inset-0 items-center justify-center bg-maroon/5 text-6xl font-cinzel text-maroon/20"
                        style={{ display: member.photo ? 'none' : 'flex' }}
                      >
                        {(member.name_en || '').charAt(0)}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-maroon/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-maroon/[0.04] border border-maroon/10 mb-3 group-hover:bg-gold/10 group-hover:border-gold/20 transition-all duration-300">
                      <span className="tamil-label text-[12px] sm:text-[13px] text-bronze uppercase tracking-[0.1em] sm:tracking-[0.2em] font-bold">
                        {member.title}
                      </span>
                    </div>
                    <h3 className="tamil-label text-[15px] sm:text-[18px] text-maroon font-black mb-1 group-hover:text-gold transition-colors duration-300 leading-snug">
                      {member.name}
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
