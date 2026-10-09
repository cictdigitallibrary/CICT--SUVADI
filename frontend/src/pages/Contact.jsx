import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';

const API = 'http://localhost:3001';

const Contact = () => {
  const { t, language } = useLanguage();
  const feedbackFormRef = useRef(null);

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
      <style>{`
        @media (min-width: 640px) {
          .contact-hero-bg {
            aspect-ratio: 1920 / 555 !important;
            min-height: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
        }
      `}</style>

      <PageHero
        label={t('தொடர்பு', 'GET IN TOUCH')}
        title={t('எங்களைத் தொடர்புகொள்ளுங்கள்', 'Contact Us')}
        subtitle={t(
          'செம்மொழித் தமிழ் சுவடிகள், மின்னணு நூலகம், வெளியீடுகள், நூலக அணுகல் மற்றும் தொழில்நுட்ப உதவிக்கான உங்கள் கேள்விகளுக்கு எங்களைத் தொடர்புகொள்ளலாம்.',
          'We are here to assist you with enquiries about classical Tamil manuscripts, digital collections, publications, library access, and technical support.'
        )}
        glyphs={['தொ', 'ட', 'ர்', 'பு', 'அணு', 'கல்']}
        backgroundImage="/images/bg/Contact.png"
        heroClass="contact-hero-bg"
        headingStyle={language === 'ta'
          ? { fontSize: 'clamp(1.3rem, 6vw, 4rem)', lineHeight: 1.15, whiteSpace: 'normal', wordBreak: 'break-word' }
          : { fontSize: 'clamp(1.5rem, 7vw, 4.5rem)', whiteSpace: 'normal', wordBreak: 'break-word' }
        }
      />

      <div className="container mx-auto px-6 max-w-6xl py-20 relative">

        {/* Corner floral ornaments — subtle heritage framing */}
        <img src="/images/bg/contact-floral-corner.png" alt="" aria-hidden="true"
          className="contact-floral-deco contact-floral-tl hidden md:block" />
        <img src="/images/bg/contact-floral-corner.png" alt="" aria-hidden="true"
          className="contact-floral-deco contact-floral-tr hidden md:block" />
        <img src="/images/bg/contact-floral-corner.png" alt="" aria-hidden="true"
          className="contact-floral-deco contact-floral-bl hidden md:block" />
        <img src="/images/bg/contact-floral-corner.png" alt="" aria-hidden="true"
          className="contact-floral-deco contact-floral-br hidden md:block" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start relative z-10">

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
                    className="contact-card group flex items-center gap-6 p-6 hover:-translate-y-1 relative overflow-hidden block"
                  >
                    <div className="absolute top-0 left-0 w-0 group-hover:w-full h-[3px] bg-gradient-to-r from-maroon to-gold transition-all duration-700 rounded-t-2xl" />
                    <div className="w-12 h-12 flex-shrink-0 rounded-full bg-maroon/5 flex items-center justify-center text-2xl group-hover:bg-gold/10 transition-colors duration-300">
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
                  <div className="contact-card group flex items-center gap-6 p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-gold/25 to-transparent rounded-t-2xl" />
                    <div className="w-12 h-12 flex-shrink-0 rounded-full bg-maroon/5 flex items-center justify-center text-2xl">
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
              <button
                onClick={() => feedbackFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="group flex items-center gap-5 bg-maroon rounded-2xl border-l-4 border-gold p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-400 relative overflow-hidden block w-full text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gold/10 flex items-center justify-center text-2xl group-hover:bg-gold/20 transition-colors">
                  💬
                </div>
                <div className="flex-1 relative">
                  <p className="font-cinzel text-[9px] text-gold/60 uppercase tracking-[0.3em] font-bold mb-1">{t('கருத்துக்கள்', 'FEEDBACK')}</p>
                  <p className="tamil-heading text-lg text-white group-hover:text-gold transition-colors">
                    {t('கருத்துக்கள் - பதிவு', 'Submit Feedback Form')}
                  </p>
                </div>
                <span className="text-gold text-2xl flex-shrink-0 group-hover:translate-x-2 transition-transform duration-300">→</span>
              </button>
            </motion.div>
          </motion.div>

          {/* ── Right: Contact Form ── */}
          <motion.div
            ref={feedbackFormRef}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="contact-form-panel relative overflow-hidden"
          >
            {/* Top gold bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-maroon via-gold to-maroon rounded-t-[20px]" />

            <div className="p-8 md:p-12 relative z-10">
              <h3 className="tamil-heading text-2xl text-maroon mb-10 italic">
                {t('கருத்துக்கள் - பதிவு', 'Submit Feedback')}
              </h3>

              <iframe
                src="https://docs.google.com/forms/d/e/1FAIpQLSd9mUjE2zM44gMYpM3Lthq2SeQT8HHFKxNmbnkKM51ufojMwA/viewform?embedded=true"
                width="100%"
                height="720"
                frameBorder="0"
                marginHeight="0"
                marginWidth="0"
                loading="lazy"
                title="Feedback Form"
                style={{
                  border: "none",
                  borderRadius: "16px",
                  background: "transparent"
                }}
              />
            </div>
          </motion.div>
        </div>


        {/* ── Location visual ── */}
        <div className="mt-24 bg-stone/5 rounded-2xl border border-gold/25 shadow-lg overflow-hidden relative group h-[360px] z-10">
          {/* Real map — Central Institute of Classical Tamil (CICT), Perumbakkam, Chennai */}
          <div className="absolute inset-0 bg-cover bg-center scale-100 group-hover:scale-105 transition-transform duration-[1200ms] ease-out"
            style={{ backgroundImage: "url('/images/bg/contact-map.jpg')" }} />

          {/* Heritage overlay — keeps pin/label/button legible over the map */}
          <div className="absolute inset-0 bg-gradient-to-b from-ivory/25 via-ivory/18 to-maroon/22" />

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
              className="pointer-events-auto mt-6 px-6 py-2 rounded-lg bg-maroon text-gold text-[10px] font-cinzel font-black uppercase tracking-[0.3em] hover:bg-gold hover:text-maroon transition-all duration-300 shadow-xl"
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
