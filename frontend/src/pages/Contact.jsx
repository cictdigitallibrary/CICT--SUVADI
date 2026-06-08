import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';

const Contact = () => {
  const { t } = useLanguage();

  const contactInfo = [
    {
      icon: '📍',
      label: t('அஞ்சல் முகவரி', 'ADDRESS'),
      value: t('செம்மொழிச் சாலை, பெரும்பாக்கம், சென்னை – 600 100', 'Semmozhi Salai, Perumbakkam, Chennai – 600 100'),
      sub: t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil'),
    },
    {
      icon: '📞',
      label: t('தொலைபேசி', 'TELEPHONE'),
      value: '+91-44-22540125',
      href: 'tel:+914422540125',
    },
    {
      icon: '✉',
      label: t('மின்னஞ்சல்', 'EMAIL'),
      value: 'suvadi@cict.in',
      href: 'mailto:suvadi@cict.in',
    },
    {
      icon: '🌐',
      label: t('இணையதளம்', 'WEBSITE'),
      value: 'www.cict.in',
      href: 'https://www.cict.in',
      external: true,
    },
  ];

  return (
    <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white">

      <PageHero
        label={t('தொடர்புக்கு', 'ACADEMIC COMMUNICATION')}
        title={t('ஆய்வுத் தொடர்பு', 'Faculty Secretariat')}
        subtitle={t(
          'ஆய்வு தொடர்பான சந்தேகங்கள் மற்றும் ஒத்துழைப்புகளுக்கு எங்களை அணுகவும்.',
          'For scholarly inquiries, manuscript access requests, or collaborative research agendas, please reach out to our team.'
        )}
        glyphs={['தொ', 'ட', 'ர்', 'பு', 'அணு', 'கல்']}
      />

      <div className="container mx-auto px-6 max-w-6xl py-20">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* ── Left: Contact Info ── */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            {/* Contact cards */}
            {contactInfo.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.6 }}
              >
                {item.href ? (
                  <a
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    className="group flex items-center gap-6 bg-white border border-maroon/10 p-6 shadow hover:shadow-xl hover:-translate-y-1 hover:border-gold/30 transition-all duration-400 relative overflow-hidden block"
                  >
                    <div className="absolute top-0 left-0 w-0 group-hover:w-full h-[3px] bg-gradient-to-r from-maroon to-gold transition-all duration-700" />
                    <div className="w-12 h-12 flex-shrink-0 bg-maroon/5 flex items-center justify-center text-2xl group-hover:bg-gold/10 transition-colors duration-300">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-cinzel text-[9px] text-bronze uppercase tracking-[0.3em] font-bold mb-1">{item.label}</p>
                      {item.sub && <p className="tamil-text text-stone/40 text-xs font-bold mb-0.5">{item.sub}</p>}
                      <p className="font-cinzel text-maroon font-bold text-sm group-hover:text-gold transition-colors truncate">{item.value}</p>
                    </div>
                    <span className="text-gold text-lg flex-shrink-0 group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </a>
                ) : (
                  <div className="group flex items-center gap-6 bg-white border border-maroon/10 p-6 shadow relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
                    <div className="w-12 h-12 flex-shrink-0 bg-maroon/5 flex items-center justify-center text-2xl">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-cinzel text-[9px] text-bronze uppercase tracking-[0.3em] font-bold mb-1">{item.label}</p>
                      {item.sub && <p className="tamil-text text-stone/40 text-xs font-bold mb-0.5">{item.sub}</p>}
                      <p className="tamil-body text-maroon font-bold text-sm">{item.value}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Feedback CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
            >
              <Link
                to="/feedback"
                className="group flex items-center gap-5 bg-maroon border-l-4 border-gold p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-400 relative overflow-hidden block"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                <div className="w-12 h-12 flex-shrink-0 bg-gold/10 flex items-center justify-center text-2xl group-hover:bg-gold/20 transition-colors">
                  💬
                </div>
                <div className="flex-1 relative">
                  <p className="font-cinzel text-[9px] text-gold/60 uppercase tracking-[0.3em] font-bold mb-1">{t('கருத்துக்கள்', 'FEEDBACK')}</p>
                  <p className="tamil-heading text-lg text-white group-hover:text-gold transition-colors">
                    {t('கருத்துக்கள் - பதிவு', 'Submit Feedback Form')}
                  </p>
                </div>
                <span className="text-gold text-2xl flex-shrink-0 group-hover:translate-x-2 transition-transform duration-300">→</span>
              </Link>
            </motion.div>
          </motion.div>

          {/* ── Right: Contact Form ── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white border border-maroon/10 shadow-2xl relative overflow-hidden"
          >
            {/* Top gold bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-maroon via-gold to-maroon" />

            {/* Corner flourish */}
            <div className="absolute top-6 right-6 text-5xl text-maroon/[0.04] select-none font-serif">✉</div>

            <div className="p-8 md:p-12 relative z-10">
              <h3 className="tamil-heading text-2xl text-maroon mb-10 italic">
                {t('தொடர்பு படிவம்', 'Direct Message')}
              </h3>

              <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: t('உங்கள் பெயர்', 'Your Name'), type: 'text', id: 'contact-name' },
                    { label: t('மின்னஞ்சல்', 'Email Address'), type: 'email', id: 'contact-email' },
                  ].map(field => (
                    <div key={field.id} className="space-y-2 group">
                      <label htmlFor={field.id} className="tamil-label text-[9px] text-bronze uppercase font-black tracking-widest block">
                        {field.label}
                      </label>
                      <input
                        id={field.id}
                        type={field.type}
                        className="w-full bg-ivory border border-maroon/10 p-4 outline-none focus:border-gold focus:bg-white transition-all duration-200 tamil-text text-sm font-bold"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-subject" className="tamil-label text-[9px] text-bronze uppercase font-black tracking-widest block">
                    {t('பொருள்', 'Subject of Inquiry')}
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    className="w-full bg-ivory border border-maroon/10 p-4 outline-none focus:border-gold focus:bg-white transition-all duration-200 tamil-text text-sm font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-message" className="tamil-label text-[9px] text-bronze uppercase font-black tracking-widest block">
                    {t('செய்தி', 'Your Message')}
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    className="w-full bg-ivory border border-maroon/10 p-4 outline-none focus:border-gold focus:bg-white transition-all duration-200 tamil-text text-sm font-bold resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="group w-full py-4 bg-maroon text-gold text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-maroon-dark hover:shadow-maroon/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/0 via-gold/10 to-gold/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative tamil-label">{t('அனுப்புக', 'TRANSMIT MESSAGE')}</span>
                </button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* ── Location visual ── */}
        <div className="mt-24 bg-stone/5 border border-maroon/10 overflow-hidden relative group h-[360px]">
          {/* Dot-grid background */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#5C0A0A 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </div>

          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(#5C0A0A 1px, transparent 1px), linear-gradient(90deg, #5C0A0A 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-maroon/5 group-hover:bg-transparent transition-colors duration-700" />

          {/* Center marker */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10 pointer-events-none">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="w-20 h-20 bg-white/80 rounded-full flex items-center justify-center shadow-2xl mb-6 border border-maroon/10"
            >
              <span className="text-4xl">📍</span>
            </motion.div>
            <span className="font-cinzel text-xs tracking-[0.5em] font-bold text-maroon mb-2">PERUMBAKKAM • CHENNAI</span>
            <p className="tamil-label text-maroon/40 font-black opacity-60">
              {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
            </p>
            <a
              href="https://maps.google.com/?q=Central+Institute+of+Classical+Tamil+Chennai"
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto mt-6 px-6 py-2 bg-maroon text-gold text-[10px] font-cinzel font-black uppercase tracking-[0.3em] hover:bg-gold hover:text-maroon transition-all duration-300 shadow-xl"
            >
              {t('வரைபடம் காண்க', 'View on Map')} →
            </a>
          </div>
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
