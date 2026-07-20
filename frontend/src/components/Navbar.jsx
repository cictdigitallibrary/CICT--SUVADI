import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const Navbar = () => {
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const isScrolled = scrollY > 40;

  // Navbar is always solid maroon theme now.
  const navBg = 'bg-[#1A0505]/95 backdrop-blur-lg shadow-2xl';
  const logoTextColor  = 'text-white';
  const subTextColor   = 'text-gold/80';
  const linkColor      = 'text-white/85 hover:text-gold';
  const activeColor    = 'text-gold';

  const navLinks = [
    { nameTa: 'முகப்பு',          nameEn: 'Home',              path: '/' },
    { nameTa: 'செவ்வியல் நூல்கள்', nameEn: 'Classical Texts',   path: '/classical-texts' },
    { nameTa: 'மின் நூல்கள்',     nameEn: 'E-Books',           path: '/ebooks' },
    { nameTa: 'சுவடித் தேடல்',    nameEn: 'Manuscript Search', path: '/search' },
    { nameTa: 'உருவாக்கம்',       nameEn: 'Team',              path: '/team' },
    { nameTa: 'தொடர்புக்கு',      nameEn: 'Contact',           path: '/contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ease-in-out ${navBg} ${isScrolled ? 'py-4' : 'py-6'}`}>
      {/* Decorative top gold line */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-80" />
      
      {/* Bottom border line */}
      <div className="absolute bottom-0 left-0 w-full h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, #C9973B40, transparent)' }} />

      <div className="container mx-auto px-6 flex justify-between items-center">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-5 group flex-shrink-0">
          <div className="w-[72px] h-[72px] flex items-center justify-center transition-transform duration-500 flex-shrink-0 group-hover:scale-105">
            <img src="/images/cict_emblem.png" alt="CICT Emblem"
              className="w-full h-full object-contain drop-shadow-md"
              onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span class="text-white text-xs font-bold">CICT</span>'; }}
            />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className={`font-black tracking-[0.25em] text-xl uppercase transition-colors duration-500 ${logoTextColor}`}
              style={{ fontFamily: '"Cinzel", serif' }}
            >
              SUVADI
            </span>
            <span
              className={`text-[10.5px] uppercase tracking-[0.2em] font-bold mt-1.5 transition-colors duration-500 ${subTextColor}`}
              style={{ fontFamily: '"Cinzel", serif' }}
            >
              {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
            </span>
          </div>
        </Link>

        {/* ── Right side container ── */}
        <div className="flex items-center gap-4 lg:gap-6 ml-auto">
          {/* ── Desktop Nav links ── */}
          <div className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative text-[11px] font-black uppercase tracking-[0.18em] transition-all duration-300 ${isActive ? activeColor : linkColor} group py-2`}
                style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Cinzel", sans-serif' }}
              >
                {t(link.nameTa, link.nameEn)}
                {/* Visual indicator for active link */}
                <motion.span
                  className={`absolute -bottom-1 left-0 h-[2px] bg-gold rounded-full`}
                  initial={{ width: isActive ? '100%' : '0%' }}
                  animate={{ width: isActive ? '100%' : '0%' }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            );
          })}

          {/* Language Toggle with attractive styling */}
          <button
            onClick={toggleLanguage}
            id="lang-toggle-btn"
            className="flex items-center gap-2 px-6 py-2.5 text-[12px] font-black uppercase tracking-[0.2em] border-2 transition-all duration-300 shadow-lg border-gold/30 text-gold hover:bg-gold hover:text-maroon"
            style={{ fontFamily: '"Cinzel", serif' }}
          >
            <span className="text-sm">🌐</span>
            <span>{language === 'ta' ? 'English' : 'தமிழ்'}</span>
          </button>
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <div className="flex flex-col gap-[6px]">
            <span className={`block w-6 h-[2.5px] transition-all duration-500 ease-out bg-white ${mobileMenuOpen ? 'rotate-45 translate-y-[8.5px] bg-gold' : ''}`} />
            <span className={`block w-5 h-[2.5px] transition-all duration-300 bg-white ${mobileMenuOpen ? 'opacity-0 -translate-x-4' : ''}`} />
            <span className={`block w-6 h-[2.5px] transition-all duration-500 ease-out bg-white ${mobileMenuOpen ? '-rotate-45 -translate-y-[8.5px] bg-gold' : ''}`} />
          </div>
        </button>

        {/* ── New Right Emblem ── */}
        <div className="w-14 h-14 lg:w-[68px] lg:h-[68px] flex items-center justify-center bg-white rounded-full p-[2px] ml-2 flex-shrink-0 shadow-md border border-gray-200">
          <img src="/images/emblem_right.png" alt="Institutional Emblem" className="w-full h-full object-contain rounded-full" />
        </div>
      </div>
      </div>

      {/* ── Mobile Menu Drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            className="lg:hidden overflow-hidden origin-top"
            style={{ background: 'linear-gradient(180deg, rgba(26,5,5,0.98) 0%, rgba(46,10,10,0.98) 100%)', backdropFilter: 'blur(20px)' }}
          >
            <div className="container mx-auto px-8 py-10 flex flex-col gap-6">
              {navLinks.map((link, idx) => {
                const isActive = location.pathname === link.path;
                return (
                  <motion.div
                    key={link.path}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to={link.path}
                      className={`text-base font-black uppercase tracking-[0.25em] pb-6 block transition-all ${isActive ? 'text-gold border-gold/30' : 'text-white/60 hover:text-gold border-white/5'}`}
                      style={{ borderBottomWidth: '1px', fontFamily: '"Cinzel", sans-serif' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{t(link.nameTa, link.nameEn)}</span>
                        {isActive && <motion.span layoutId="mobile-active" className="w-2 h-2 rounded-full bg-gold" />}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
              
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }}
                className="mt-6 border-2 border-gold/40 text-gold py-5 text-xs font-black uppercase tracking-[0.3em] hover:bg-gold hover:text-maroon transition-all shadow-xl active:scale-95"
                style={{ fontFamily: '"Cinzel", serif' }}
              >
                {language === 'ta' ? 'Switch to English Context' : 'தமிழில் தொடரவும்'}
              </motion.button>
              
              <p className="text-white/20 text-[8px] uppercase tracking-[0.4em] text-center mt-12 font-bold">
                © {new Date().getFullYear()} Central Institute of Classical Tamil
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
