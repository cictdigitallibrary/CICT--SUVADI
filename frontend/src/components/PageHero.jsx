import React from 'react';
import { motion } from 'framer-motion';

/**
 * PageHero — Shared premium hero banner for inner pages.
 *
 * Props:
 *  label      {string}  — small overline label (e.g. "DIGITAL LIBRARY")
 *  title      {string}  — main h1 heading (Tamil or English)
 *  subtitle   {string}  — optional paragraph beneath title
 *  badge      {string}  — optional floating badge text (e.g. "6 Volumes")
 *  glyphs     {string[]}— optional array of decorative Tamil glyphs
 *  light      {bool}    — if true, use lighter ivory bg instead of maroon
 */
const DEFAULT_GLYPHS = ['அ', 'ம்', 'ழ்', 'ல்', 'ர்', 'ஓம்'];

const PageHero = ({ label, title, subtitle, badge, glyphs = DEFAULT_GLYPHS, light = false, backgroundImage = null, heroClass = '', headingStyle = {}, align = 'center' }) => {
  if (light) {
    return (
      <header className="relative pt-36 pb-16 overflow-hidden bg-ivory selection:bg-maroon selection:text-white">
        {/* Subtle watermark glyph */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[16rem] font-black text-maroon/[0.025] select-none pointer-events-none leading-none"
          style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }}>சு</div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <div className="container mx-auto px-6 max-w-6xl text-center relative z-10">
          {label && (
            <p className="font-cinzel text-[10px] uppercase tracking-[0.6em] text-bronze mb-5 font-bold">{label}</p>
          )}
          <h1 className="tamil-heading text-5xl md:text-7xl text-maroon italic mb-5">{title}</h1>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-14 bg-gold/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
            <div className="h-px w-14 bg-gold/40" />
          </div>
          {badge && (
            <div className="inline-block mt-6 px-5 py-2 border border-maroon/10 bg-white shadow-sm">
              <span className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-bronze font-bold">{badge}</span>
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Responsive hero CSS — injected once per banner */}
      <style>{`
        .page-hero-bg-banner {
          /* Mobile: fixed height, cover bg so center of image is always visible */
          min-height: 260px;
          background-size: cover !important;
          background-position: center center !important;
          padding-top: 88px;   /* clear fixed navbar (~72px) + breathing room */
          padding-bottom: 28px;
        }
        /* Tablet and up: restore panoramic proportions */
        @media (min-width: 640px) {
          .page-hero-bg-banner {
            min-height: 0;
            padding-top: 0;
            padding-bottom: 0;
            /* 100% 100% stretches the full panoramic image edge-to-edge */
            background-size: 100% 100% !important;
          }
        }
      `}</style>

      <header
        className={`relative selection:bg-white selection:text-maroon flex flex-col items-center justify-center page-hero-bg-banner${heroClass ? ` ${heroClass}` : ''}`}
        style={backgroundImage ? {
          backgroundImage: `url('${backgroundImage}')`,
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1A0303',
        } : { overflow: 'hidden', paddingTop: '10rem', paddingBottom: '6rem' }}
      >
        {/* Background elements — suppressed when a custom bg image or class is active */}
        {!backgroundImage && !heroClass && (
          <>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #1A0303 0%, #3D0707 40%, #5C1A08 75%, #1A0303 100%)' }} />
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-leather.png')" }} />

            {/* Glow orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-[0.06]"
              style={{ background: 'radial-gradient(ellipse, #C9973B 0%, transparent 70%)', filter: 'blur(60px)' }} />

            {/* Rotating ring */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/10"
              style={{ width: '600px', height: '600px' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
            />

            {/* Floating glyphs */}
            {glyphs.map((g, i) => (
              <motion.div
                key={i}
                className="absolute select-none pointer-events-none font-black text-gold/[0.04]"
                style={{
                  left: `${5 + (i * 16) % 88}%`,
                  top: `${10 + (i * 23) % 75}%`,
                  fontSize: `${3 + (i % 3)}rem`,
                  fontFamily: '"Noto Sans Tamil", sans-serif',
                }}
                animate={{ y: [0, -14, 0], rotate: [0, i % 2 === 0 ? 4 : -4, 0] }}
                transition={{ duration: 7 + i * 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
              >
                {g}
              </motion.div>
            ))}
          </>
        )}

        {/* Bottom divider */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

        {/* Content */}
        <div className={`w-full px-4 sm:px-6 relative z-10 flex ${align === 'left' ? 'justify-start lg:pl-16 xl:pl-28' : 'justify-center'}`}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className={`text-center w-full ${align === 'left' ? 'max-w-[600px]' : 'max-w-5xl mx-auto'}`}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
          >
            {label && (
              <div className="flex items-center justify-center gap-3 sm:gap-5">
                <div className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-gold/50" />
                <p className="font-cinzel text-[9px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.6em] text-gold/70 font-bold">{label}</p>
                <div className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-gold/50" />
              </div>
            )}

            <h1
              className="tamil-heading text-white italic"
              style={{
                fontSize: 'clamp(1.1rem, 4.5vw, 6rem)',
                textShadow: '0 0 60px rgba(201,151,59,0.12)',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                lineHeight: '1.25',
                maxWidth: '100%',
                ...headingStyle,
              }}
            >
              {title}
            </h1>

            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <div className="w-1 h-1 rounded-full border border-gold/40" />
              <div className="h-px w-12 sm:w-20 bg-gold/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold/30" />
              <div className="h-px w-12 sm:w-20 bg-gold/20" />
              <div className="w-1 h-1 rounded-full border border-gold/40" />
            </div>

            {badge && (
              <div className="inline-block px-4 sm:px-6 py-2 border border-gold/20 bg-white/5 mt-2">
                <span className="font-cinzel text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.4em] text-gold/70 font-bold">{badge}</span>
              </div>
            )}
          </motion.div>
        </div>
      </header>
    </>
  );
};

export default PageHero;
