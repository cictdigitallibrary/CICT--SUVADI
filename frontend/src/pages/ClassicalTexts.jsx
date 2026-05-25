import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const API = 'http://localhost:3001';

const ClassicalTexts = () => {
  const { t } = useLanguage();

  const { data: texts = [], isLoading } = useQuery({
    queryKey: ['texts'],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/texts`);
      return res.data;
    },
  });

  const { data: manuscripts = [] } = useQuery({
    queryKey: ['manuscripts'],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/manuscripts`);
      return res.data;
    },
  });

  return (
    <div className="pt-32 pb-24 bg-ivory min-h-screen selection:bg-maroon selection:text-white">
      <div className="container mx-auto px-6 max-w-6xl">

        {/* Header */}
        <header className="mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-bronze font-cinzel text-[10px] uppercase tracking-[0.5em] mb-4">
              {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'CENTRAL INSTITUTE OF CLASSICAL TAMIL')}
            </p>
            <h1 className="tamil-heading text-5xl md:text-6xl text-maroon mb-6 italic">
              {t('செவ்வியல் நூல்கள்', 'Classical Tamil Texts')}
            </h1>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-[1px] w-12 bg-gold/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
              <div className="h-[1px] w-12 bg-gold/50" />
            </div>
            <p className="tamil-body text-stone/60 text-lg max-w-2xl mx-auto leading-relaxed font-medium">
              {t(
                'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் பட்டியலிட்டுள்ள செவ்வியல் நூல்களும் அவற்றுக்கான ஓலைச்சுவடி வகைகளும்.',
                'A comprehensive repository of Classical Tamil primary texts identified by the Institute, including their corresponding digital manuscript archives.'
              )}
            </p>
          </motion.div>
        </header>

        {/* Book Cards Grid */}
        <div className="mb-24">
          <div className="flex items-center justify-between mb-10 pb-4 border-b border-maroon/5">
             <h2 className="tamil-label text-2xl text-maroon uppercase tracking-wide">
               {t('நூல் தொகுப்புகள்', 'Authority Archive')}
             </h2>
             <div className="hidden md:block text-[10px] font-bold text-bronze uppercase tracking-[0.3em]">
               {texts.length} {t('செவ்வியல் நூல்கள்', 'Primary Texts')}
             </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-12 h-12 border-2 border-maroon/5 border-t-gold rounded-full animate-spin" />
              <p className="font-cinzel tracking-[0.4em] text-bronze animate-pulse uppercase text-[10px]">
                {t('பதிவேடுகளைத் திரட்டுகிறது…', 'RETRIEVING AUTHORITY RECORDS…')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {texts.map((book, idx) => {
                const bookManuscripts = manuscripts.filter(m => m.text_id === book.id);
                return (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white border border-maroon/10 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col h-full cursor-pointer hover:border-gold/30 hover:-translate-y-1.5"
                  >
                    {/* Book Cover */}
                    <div className="relative bg-maroon/[0.02] flex items-center justify-center overflow-hidden border-b border-maroon/5 group-hover:bg-ivory transition-colors duration-500"
                         style={{ height: 220 }}>
                      {book.cover_image ? (
                        <img
                          src={`${API}${book.cover_image}`}
                          alt={book.title_tamil}
                          className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-700 ease-out"
                          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : (
                        <span className="text-6xl opacity-[0.08] group-hover:opacity-20 transition-opacity">📜</span>
                      )}
                      
                      {/* Badge indicator */}
                      <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-gold flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300">
                        <span className="text-maroon text-[8px] font-black italic">SV</span>
                      </div>
                    </div>

                    {/* Info Container */}
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="tamil-label text-base text-maroon font-black mb-1 group-hover:text-gold transition-colors duration-300">
                        {book.title_tamil}
                      </h3>
                      <p className="font-cinzel text-[9px] text-stone/40 uppercase tracking-widest font-bold mb-4">
                        {book.title_english}
                      </p>

                      {bookManuscripts.length > 0 && (
                        <div className="mt-auto pt-4 border-t border-maroon/5">
                          <p className="tamil-text text-[9px] text-bronze/40 uppercase tracking-widest font-bold mb-3">
                            {t('சுவடி வகைகள்', 'MANUSCRIPTS')} ({bookManuscripts.length})
                          </p>
                          <ul className="space-y-2">
                            {bookManuscripts.slice(0, 3).map(m => (
                              <li key={m.id} className="flex items-start gap-2 group/item">
                                <span className="text-gold text-[10px] mt-0.5 transform group-hover/item:translate-x-1 transition-transform">▸</span>
                                <span className="tamil-text text-[13px] text-stone/50 font-bold leading-snug group-hover/item:text-maroon transition-colors line-clamp-1">{m.title_tamil}</span>
                              </li>
                            ))}
                            {bookManuscripts.length > 3 && (
                              <li className="font-cinzel text-[8px] text-bronze font-bold uppercase tracking-[0.2em] mt-2 opacity-50">
                                +{bookManuscripts.length - 3} {t('மேலும்', 'MORE COLLECTIONS')}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Inventory Table Section */}
        <section className="relative pt-20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gold/10" />
          
          <div className="text-center mb-12">
             <h2 className="tamil-heading text-3xl text-maroon mb-4">
               {t('செவ்வியல் சுவடி வகையகம்', 'Manuscript Category Directory')}
             </h2>
             <p className="tamil-body text-stone/40 text-sm italic">
               {t('அனைத்து நூல்களின் கீழ் வகைப்படுத்தப்பட்டுள்ள முழு சுவடி பட்டியல்', 'Comprehensive directory of categorised digitised palm-leaf manuscripts')}
             </p>
          </div>

          <div className="overflow-x-auto border border-maroon/10 shadow-2xl bg-white relative">
            {/* Top gold bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gold" />
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-maroon/[0.03] border-b border-maroon/10">
                  <th className="p-5 font-cinzel text-[10px] text-maroon/40 font-black tracking-widest text-center w-16">#</th>
                  <th className="p-5 tamil-label text-[10px] text-maroon uppercase tracking-widest font-black border-r border-maroon/5">{t('செவ்வியல் நூல்', 'PARENT AUTHORITY')}</th>
                  <th className="p-5 tamil-label text-[10px] text-maroon uppercase tracking-widest font-black border-r border-maroon/5">{t('சுவடி வகை', 'ARCHIVAL CATEGORY')}</th>
                  <th className="p-5 tamil-label text-[10px] text-maroon uppercase tracking-widest font-black text-right">{t('தேடு', 'COLLECTION')}</th>
                </tr>
              </thead>
              <tbody>
                {manuscripts.map((m, idx) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.02 }}
                    className={`border-b border-maroon/5 hover:bg-gold/[0.03] transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-ivory/20'}`}
                  >
                    <td className="p-5 font-cinzel text-[10px] text-maroon/20 font-black text-center">{idx + 1}</td>
                    <td className="p-5 border-r border-maroon/5">
                      <span className="tamil-label text-xs text-bronze uppercase tracking-[0.15em] font-black group-hover:text-maroon transition-colors">{m.book_name}</span>
                    </td>
                    <td className="p-5 border-r border-maroon/5">
                      <span className="tamil-label text-base text-maroon font-black">{m.title_tamil}</span>
                    </td>
                    <td className="p-5 text-right">
                      <a
                        href={`/search?cid=${m.id}&book_id=${m.text_id}`}
                        className="tamil-label text-gold hover:text-maroon text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 group-hover:translate-x-[-10px]"
                      >
                        {t('ஆய்வு செய்க', 'EXPLORE')} →
                      </a>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-12 text-center">
             <p className="font-cinzel text-[8px] text-bronze font-bold uppercase tracking-[0.6em] opacity-40">
               CENTRAL INSTITUTE OF CLASSICAL TAMIL
             </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ClassicalTexts;
