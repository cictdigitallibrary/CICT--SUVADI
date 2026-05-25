import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Contact = () => {
  const { t } = useLanguage();

  return (
    <div className="pt-32 pb-20 bg-ivory min-h-screen selection:bg-maroon selection:text-white">
      <div className="container mx-auto px-6 max-w-6xl">
        
        {/* Header */}
        <header className="mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-bronze font-cinzel text-[10px] uppercase tracking-[0.5em] mb-4">
              {t('தொடர்புக்கு', 'ACADEMIC COMMUNICATION')}
            </p>
            <h1 className="tamil-heading text-5xl md:text-6xl text-maroon mb-6 italic leading-tight">
              {t('ஆய்வுத் தொடர்பு', 'Faculty Secretariat')}
            </h1>
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-[1px] w-12 bg-gold/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
              <div className="h-[1px] w-12 bg-gold/50" />
            </div>
            <p className="tamil-body text-stone/50 max-w-2xl mx-auto font-medium">
              {t('ஆய்வு தொடர்பான சந்தேகங்கள் மற்றும் ஒத்துழைப்புகளுக்கு எங்களை அணுகவும்.', 'For scholarly inquiries, manuscript access requests, or collaborative research agendas, please reach out to our team.')}
            </p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Details Column */}
          <motion.div 
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-12"
          >
            <div>
              <h3 className="tamil-label text-[10px] font-black uppercase tracking-widest text-bronze mb-8 border-b border-gold/20 pb-2 inline-block">
                {t('அஞ்சல் முகவரி', 'OFFICIAL ADDRESS')}
              </h3>
              <div className="space-y-4">
                <p className="tamil-heading text-2xl md:text-3xl text-maroon font-black group hover:text-gold transition-colors duration-300">
                  {t('சுவடியியல் புலம்', 'Faculty of Manuscriptology')}
                </p>
                <div className="tamil-body text-stone/60 text-lg space-y-1 leading-loose">
                  <p>{t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}</p>
                  <p>{t('செம்மொழிச் சாலை, பெரும்பாக்கம்,', 'Semmozhi Salai, Perumbakkam,')}</p>
                  <p>{t('சென்னை - 600 100.', 'Chennai – 600 100.')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-maroon/5">
              <div className="group">
                <h4 className="tamil-label text-[10px] font-black text-bronze uppercase tracking-widest mb-4 opacity-50">{t('தொலைபேசி', 'TELEPHONE')}</h4>
                <p className="font-cinzel text-xl text-maroon font-bold group-hover:text-gold transition-colors">+91-44-22540125</p>
              </div>
              <div className="group">
                <h4 className="tamil-label text-[10px] font-black text-bronze uppercase tracking-widest mb-4 opacity-50">{t('மின்னஞ்சல்', 'EMAIL ENQUIRY')}</h4>
                <p className="font-cinzel text-xl text-maroon font-bold group-hover:text-gold transition-colors">suvadi@cict.in</p>
              </div>
            </div>

            <div className="pt-8 border-t border-maroon/5 space-y-6">
              <div>
                <h4 className="tamil-label text-[10px] font-black text-bronze uppercase tracking-widest mb-4 opacity-50">{t('இணையதளம்', 'INSTITSTITUTIONAL PORTAL')}</h4>
                <a href="https://www.cict.in" target="_blank" rel="noreferrer" className="font-cinzel text-xl text-gold hover:text-maroon transition-all duration-300 underline underline-offset-8 decoration-gold/20 hover:decoration-maroon/40 font-bold">
                  www.cict.in
                </a>
              </div>
              
              <div className="bg-maroon p-6 border-l-4 border-gold shadow-lg group hover:-translate-y-1 transition-all duration-300">
                <p className="tamil-label text-[10px] text-gold/60 uppercase tracking-widest mb-2 font-black">{t('கருத்துக்கள்', 'FEEDBACK')}</p>
                <Link to="/feedback" className="flex items-center justify-between group">
                  <span className="tamil-heading text-lg text-white group-hover:text-gold transition-colors">
                    {t('கருத்துக்கள் - பதிவு', 'Submit Feedback Form')}
                  </span>
                  <span className="text-gold text-2xl group-hover:translate-x-2 transition-transform">→</span>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Form Column */}
          <motion.div 
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white p-8 md:p-12 border border-maroon/10 shadow-2xl relative overflow-hidden"
          >
             {/* Corner design */}
             <div className="absolute top-0 right-0 w-24 h-24 bg-maroon/[0.03] pointer-events-none flex items-center justify-center text-maroon/10 text-5xl">✉</div>
             
             <h3 className="tamil-heading text-2xl text-maroon mb-10 italic">{t('தொடர்பு படிவம்', 'Direct Message')}</h3>
             
             <form className="space-y-6 relative z-10" onSubmit={e => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="tamil-label text-[9px] text-bronze uppercase font-black tracking-widest">{t('உங்கள் பெயர்', 'Your Name')}</label>
                    <input type="text" className="w-full bg-ivory border border-maroon/10 p-4 outline-none focus:border-gold transition-all tamil-text text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="tamil-label text-[9px] text-bronze uppercase font-black tracking-widest">{t('மின்னஞ்சல்', 'Email Address')}</label>
                    <input type="email" className="w-full bg-ivory border border-maroon/10 p-4 outline-none focus:border-gold transition-all tamil-text text-sm font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="tamil-label text-[9px] text-bronze uppercase font-black tracking-widest">{t('பொருள்', 'Subject of Inquiry')}</label>
                   <input type="text" className="w-full bg-ivory border border-maroon/10 p-4 outline-none focus:border-gold transition-all tamil-text text-sm font-bold" />
                </div>
                <div className="space-y-2">
                   <label className="tamil-label text-[9px] text-bronze uppercase font-black tracking-widest">{t('செய்தி', 'Your Message')}</label>
                   <textarea rows="5" className="w-full bg-ivory border border-maroon/10 p-4 outline-none focus:border-gold transition-all tamil-text text-sm font-bold"></textarea>
                </div>
                
                <button className="tamil-label w-full py-4 bg-maroon text-gold text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-maroon-dark hover:shadow-maroon/20 hover:-translate-y-1 transition-all duration-300">
                   {t('அனுப்புக', 'TRANSMIT MESSAGE')}
                </button>
             </form>
          </motion.div>
        </div>

        {/* Map / Location Overview */}
        <div className="mt-24 bg-stone/5 border border-maroon/10 grayscale hover:grayscale-0 transition-all duration-1000 overflow-hidden relative group h-[400px]">
           <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10 pointer-events-none">
              <div className="w-20 h-20 bg-white/80 rounded-full flex items-center justify-center shadow-2xl mb-6">
                 <span className="text-4xl text-maroon">📍</span>
              </div>
              <span className="font-cinzel text-xs tracking-[0.5em] font-bold text-maroon mb-2">PERUMBAKKAM • CHENNAI</span>
              <p className="tamil-label text-maroon/40 font-black opacity-60">
                {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
              </p>
           </div>
           {/* Mock "Map" visual elements */}
           <div className="absolute inset-0 opacity-[0.03] select-none pointer-events-none">
              <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#5C0A0A 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
           </div>
           <div className="absolute inset-0 bg-maroon/5 group-hover:bg-transparent transition-colors duration-700"></div>
        </div>
        
        <div className="mt-12 text-center pb-12">
           <p className="font-cinzel text-[10px] text-bronze/40 uppercase tracking-[0.4em] font-bold">
             {t('மைய நிறுவனத்தின் சுவடியியல் புலம்', 'FACULTY OF MANUSCRIPTOLOGY AT CICT')}
           </p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
