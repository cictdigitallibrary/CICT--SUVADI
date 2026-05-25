import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const API = 'http://localhost:3001';

// Map member index → actual image filenames we have
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

const Team = () => {
  const { t } = useLanguage();

  const { data: team = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/team`);
      return res.data;
    },
  });

  return (
    <div className="pt-32 pb-24 bg-ivory min-h-screen selection:bg-maroon selection:text-white">
      <div className="container mx-auto px-6 max-w-6xl">

        {/* Header */}
        <header className="mb-20 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-bronze font-cinzel text-[10px] uppercase tracking-[0.5em] mb-4">
              {t('உருவாக்கம்', 'THE SCHOLARLY TEAM')}
            </p>
            <h1 className="tamil-heading text-5xl md:text-6xl text-maroon mb-6">
              {t('சுவடியியல் புலம்', 'Faculty of Manuscriptology')}
            </h1>
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-[1px] w-16 bg-gold/50" />
              <div className="w-2 h-2 rounded-full border border-gold/50" />
              <div className="h-[1px] w-16 bg-gold/50" />
            </div>
            <p className="tamil-body text-stone/60 max-w-2xl mx-auto font-medium">
              {t(
                'ஓலைச்சுவடிகளை ஆய்ந்து செம்பதிப்புகளை வெளியிடும் சுவடியியல் புலத்தின் அறிஞர் குழு.',
                'A dedicated group of researchers and scholars at CICT committed to preserving Classical Tamil heritage through critical scholarship.'
              )}
            </p>
          </motion.div>
        </header>

        {/* Team Grid */}
        <div className="mb-24">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-32 space-y-4">
               <div className="w-10 h-10 border-2 border-maroon/10 border-t-gold rounded-full animate-spin" />
               <p className="font-cinzel text-bronze text-[10px] tracking-[0.4em] animate-pulse">
                 {t('பதிவிறக்கம் செய்கிறது...', 'LOADING TEAM...')}
               </p>
             </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 xl:gap-12">
              {team.map((member, idx) => {
                const photoFile = PHOTO_FILES[idx] || 'director.jpg';
                const photoUrl = `${API}/images/team/${photoFile}`;

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08 }}
                    className="group"
                  >
                    {/* Photo Frame */}
                    <div className="relative mb-6 overflow-hidden aspect-[1/1.2] bg-white border border-maroon/10 p-2 shadow-md group-hover:shadow-xl transition-all duration-500">
                      <div className="w-full h-full overflow-hidden bg-stone/5 relative">
                        <img
                          src={photoUrl}
                          alt={member.name_english}
                          className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
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
                        {/* Inner overlay */}
                        <div className="absolute inset-0 bg-maroon/0 group-hover:bg-maroon/10 transition-colors duration-500" />
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="text-center">
                      <div className="inline-block px-3 py-1 bg-maroon/[0.03] border border-maroon/10 mb-3">
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
            </div>
          )}
        </div>

        {/* High-Impact Scholars Mission Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="bg-maroon text-white p-10 md:p-16 relative overflow-hidden"
        >
          {/* Subtle background element */}
          <div className="absolute -bottom-10 -left-10 w-64 h-64 opacity-[0.05] pointer-events-none text-gold">
             <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"/></svg>
          </div>

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="text-gold text-2xl mb-8 opacity-40">❦</div>
            <h2 className="tamil-heading text-3xl text-gold mb-8">
              {t('நிறுவனக் குறிக்கோள்', 'Strategic Mission')}
            </h2>
            <p className="tamil-body text-white/70 text-lg md:text-xl font-medium leading-loose mb-12">
              {t(
                'உலகெங்கிலுமிருந்து கிடைக்கப் பெற்ற எல்லாச் சுவடிகள், பதிப்புகளை ஆய்ந்து, பாடங்களை உறுதிசெய்து செம்பதிப்பாகக் கொண்டு வருவதைச் சுவடியியல் புலத்தின் தலையாய பணியாகக் கொண்டுள்ளது.',
                'We strive to collect every available manuscript across the globe, meticulously analyze textual variations, and establish authoritative Critical Editions that serve as the definitive standard for Classical Tamil scholarship.'
              )}
            </p>

            {/* Quick stats / milestones */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { ta: 'இறையனார் களவியல்', en: 'Irayanar Kalv.', yr: '2013' },
                { ta: 'ஐங்குறுநூறு — மருதம்', en: 'Aingurunuru', yr: '2017' },
                { ta: 'ஐங்குறுநூறு — நெய்தல்', en: 'Aingurunuru', yr: '2017' },
                { ta: 'ஐங்குறுநூறு — குறிஞ்சி', en: 'Aingurunuru', yr: '2021' },
                { ta: 'ஐங்குறுநூறு — பாலை', en: 'Aingurunuru', yr: '2021' },
                { ta: 'கைந்நிலை', en: 'Kainnilai', yr: '2024' },
              ].map((ed, i) => (
                <div key={i} className="bg-white/5 border border-gold/10 p-4 text-center hover:bg-white/10 transition-colors">
                  <div className="text-gold font-cinzel text-xs font-bold mb-1">{ed.yr}</div>
                  <div className="tamil-label text-[10px] text-white/80 font-bold">{t(ed.ta, ed.en)}</div>
                </div>
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
