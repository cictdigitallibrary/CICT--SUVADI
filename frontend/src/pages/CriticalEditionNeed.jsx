import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const CriticalEditionNeed = () => {
  const { t } = useLanguage();

  return (
    <div className="pt-32 pb-20 bg-ivory min-h-screen">
      <header className="py-20 bg-maroon text-white relative overflow-hidden text-center">
         <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
         <div className="container mx-auto px-6 relative z-10">
            <h2 className="text-gold font-cinzel text-xs uppercase tracking-[0.4em] mb-4">
              {t('செம்பதிப்புகள்', 'CRITICAL EDITIONS')}
            </h2>
            <h1 className="text-4xl md:text-6xl font-playfair italic leading-tight">
              {t('செம்பதிப்பின் தேவை', 'The Need for Critical Editions')}
            </h1>
         </div>
      </header>

      <div className="container mx-auto px-6 max-w-4xl py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-lg prose-stone max-w-none"
        >
          <section className="mb-16">
            <h2 className="text-3xl font-playfair text-maroon border-b border-maroon/10 pb-4 mb-8">
               {t('செம்பதிப்பு என்றால் என்ன?', 'What is a Critical Edition?')}
            </h2>
            <p className="tamil-text text-xl text-stone/80 leading-relaxed mb-6">
              {t(
                'ஒரு நூல் காலமாற்றத்தினால் பல மாறுதல்களுக்கு உள்ளாகிறது. ஓலைச்சுவடிகளில் எழுதப்படும் போது ஏற்படும் எழுத்துப்பிழைகள், இடைச்செருகல்கள் போன்றவற்றை அறிவியல் முறையில் ஆராய்ந்து, மூல ஆசிரியரின் உண்மையானக் கருத்தை வெளிக்கொணர்வதே செம்பதிப்பு ஆகும்.',
                'A text undergoes many changes over time. A critical edition is the scientific process of analyzing manuscript variations, transcription errors, and interpolations to reconstruct the author\'s original intent.'
              )}
            </p>
          </section>

          <section className="mb-16 bg-white/40 p-10 border border-maroon/5 shadow-sm">
            <h3 className="text-2xl font-playfair text-maroon mb-6 italic">
              {t('ஆய்வின் படிநிலைகள்', 'Stages of Research')}
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 list-none p-0 m-0">
              <li className="p-6 bg-ivory/50 border border-maroon/5 rounded-sm">
                <span className="text-gold font-cinzel text-sm block mb-2">01. {t('திரட்டுதல்', 'COLLECTION')}</span>
                <p className="text-sm opacity-70 m-0">
                  {t('உலகெங்கும் உள்ள நூலகங்களில் இருந்து ஓலைச்சுவடிகளைத் திரட்டி மின்முறைப்படுத்துதல்.', 'Collecting and digitizing manuscripts from libraries worldwide.')}
                </p>
              </li>
              <li className="p-6 bg-ivory/50 border border-maroon/5 rounded-sm">
                <span className="text-gold font-cinzel text-sm block mb-2">02. {t('ஒப்புநோக்கல்', 'COLLATION')}</span>
                <p className="text-sm opacity-70 m-0">
                  {t('சுவடிகளுக்கு இடையிலான பாடவேறுபாடுகளைக் கண்டறிந்து அட்டவணைப்படுத்துதல்.', 'Identifying and categorizing textual variations across different manuscripts.')}
                </p>
              </li>
              <li className="p-6 bg-ivory/50 border border-maroon/5 rounded-sm">
                <span className="text-gold font-cinzel text-sm block mb-2">03. {t('உருவாக்கம்', 'RECONSTRUCTION')}</span>
                <p className="text-sm opacity-70 m-0">
                  {t('அறிவியல் முறையில் மூலபாடத்தை உறுதிசெய்து செம்பதிப்பாக வெளியிடுதல்.', 'Establishing the original text through scientific evidence for publication.')}
                </p>
              </li>
            </ul>
          </section>

          <section className="mb-16">
            <h3 className="text-2xl font-playfair text-maroon mb-6">
              {t('முன்னோடி அறிஞர்கள்', 'Pioneer Scholars')}
            </h3>
            <p className="text-stone/70 mb-8 italic">
              {t(
                'தமிழ்ச் செவ்வியல் நூல்களைப் பதிப்பிப்பதில் முன்னோடிகளாகத் திகழ்ந்தவர்கள்:',
                'Great scholars who pioneered the art of critical editing in Tamil literature:'
              )}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
               {['ஆறுமுக நாவலர்', 'சி.வை. தாமோதரம்பிள்ளை', 'உ.வே. சாமிநாதையர்', 'ஔவை. சு. துரைசாமிப்பிள்ளை'].map((name, i) => (
                 <div key={i} className="p-4 border border-maroon/5 font-playfair text-maroon bg-white/20 uppercase text-xs tracking-widest font-bold">
                    {name}
                 </div>
               ))}
            </div>
          </section>

          <blockquote className="border-l-4 border-gold bg-stone/5 p-8 italic font-playfair text-stone/60">
            {t(
              '"பழமை போற்றிக் காத்துப் பல்லோர் அறியச் செய்தல் எம்கடன்"',
              '"It is our duty to preserve antiquity and bring its wisdom to light."'
            )}
          </blockquote>
        </motion.div>
      </div>
    </div>
  );
};

export default CriticalEditionNeed;
