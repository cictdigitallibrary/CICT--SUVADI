import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const Feedback = () => {
  const { t } = useLanguage();

  return (
    <div className="pt-32 pb-20 bg-ivory min-h-screen selection:bg-maroon selection:text-white">
      <div className="container mx-auto px-6 max-w-5xl">
        
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-bronze font-cinzel text-[10px] uppercase tracking-[0.5em] mb-4 font-black">
              {t('கருத்துக்கள்', 'SCHOLARLY FEEDBACK')}
            </p>
            <h1 className="tamil-heading text-5xl md:text-6xl text-maroon mb-6 italic leading-tight">
              {t('கருத்துக்கள் - பதிவு', 'Research Feedback')}
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] w-12 bg-gold/50" />
              <div className="w-2 h-2 rotate-45 bg-gold/50" />
              <div className="h-[1px] w-12 bg-gold/50" />
            </div>
          </motion.div>
        </header>

        {/* Embedded Form Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="bg-white border border-maroon/10 shadow-2xl overflow-hidden relative"
        >
          {/* Decorative frame elements */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-maroon via-gold to-maroon" />
          <div className="p-1 md:p-4 bg-maroon/5 flex items-center justify-between border-b border-maroon/10">
            <span className="font-cinzel text-[8px] tracking-[0.4em] text-maroon/40 font-black uppercase px-4">
              Official CICT Feedback Portal
            </span>
            <div className="flex gap-2 px-4">
              <div className="w-2 h-2 rounded-full bg-maroon/20" />
              <div className="w-2 h-2 rounded-full bg-maroon/20" />
              <div className="w-2 h-2 rounded-full bg-maroon/20" />
            </div>
          </div>

          {/* Safe iFrame loading */}
          <div className="relative w-full h-[1200px] md:h-[1000px] bg-white">
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSd9mUjE2zM44gMYpM3Lthq2SeQT8HHFKxNmbnkKM51ufojMwA/viewform?embedded=true"
              width="100%"
              height="100%"
              frameBorder="0"
              marginHeight="0"
              marginWidth="0"
              className="absolute inset-0"
            >
              {t('ஏற்றப்படுகிறது...', 'Loading scholar form...')}
            </iframe>
          </div>

          <div className="p-6 bg-maroon text-center">
            <p className="tamil-text text-[10px] text-gold/60 font-black uppercase tracking-[0.3em]">
              {t('உங்கள் பங்களிப்பிற்கு நன்றி', 'Thank you for your valuable contribution to Tamil scholarship')}
            </p>
          </div>
        </motion.div>

        {/* Support Section */}
        <div className="mt-16 text-center">
           <p className="tamil-body text-stone/40 text-sm italic font-medium">
             {t('உங்களுக்கு ஏதேனும் சிக்கல் ஏற்பட்டால் suvadi@cict.in என்ற மின்னஞ்சலுக்கு நேரடியாக எழுதவும்.', 'If you encounter any technical difficulty with the form, please write directly to suvadi@cict.in.')}
           </p>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
