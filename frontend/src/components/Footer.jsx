import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
  const { language, t } = useLanguage();

  return (
    <footer className="site-footer text-ivory" style={{ paddingTop: '3.5rem', paddingBottom: '2rem' }}>
      {/* Top gold line */}
      <div className="absolute top-0 left-0 w-full h-[3px]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #C9973B 25%, #E8B86D 50%, #C9973B 75%, transparent 100%)' }} />

      {/* Realistic Manuscript Bundle — right side, bottom corner */}
      <div className="absolute bottom-[-20px] right-[-150px] pointer-events-none select-none" style={{ zIndex: 1, width: '400px' }}>
        <img src="/images/palm_manuscript.png" alt="Decorative Footer Manuscript" aria-hidden="true" className="w-full h-auto object-contain" style={{ opacity: 0.9 }} />
      </div>

      <div className="footer-inner container mx-auto px-6" style={{ position: 'relative', zIndex: 2 }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10" style={{ marginBottom: '2.5rem' }}>

          {/* ── Brand & Socials ── */}
          <div className="col-span-1" style={{ paddingRight: '1rem' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
              <div className="w-11 h-11 flex items-center justify-center">
                <img src="/images/logo_cict.png" alt="CICT Logo" className="w-full h-full object-contain" />
              </div>
              <span style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Cinzel", serif', fontWeight: 800, fontSize: '1.5rem', color: '#C9973B' }}>
                {t('சுவடி', 'Suvadi')}
              </span>
            </div>
            <p style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Inter", sans-serif', fontWeight: 400, fontSize: '0.82rem', color: 'rgba(245,240,232,0.72)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              {t(
                'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் (CICT) - தமிழ் செவ்வியல் நூல்களையும் சுவடிகளையும் பாதுகாத்து ஆய்வாளர்களுக்கு வழங்கும் மின்னணுத் தளம்.',
                'Central Institute of Classical Tamil (CICT) – preserving, digitizing, and promoting the timeless treasures of Classical Tamil literature for future generations.'
              )}
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
              {[
                { icon: 'f', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                { icon: 't', path: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
                { icon: 'i', rect: true },
                { icon: 'y', path: 'M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33 2.78 2.78 0 001.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.33 29 29 0 00-.46-5.33zM9.75 15.02V8.48l6.15 3.27-6.15 3.27z' },
              ].map((s, i) => (
                <a key={i} href="#" style={{
                  width: '2rem', height: '2rem', borderRadius: '50%',
                  border: '1px solid rgba(201,151,59,0.40)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#C9973B', transition: 'all 0.3s',
                  flexShrink: 0,
                }}>
                  {s.rect ? (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01" stroke="#1A0202" strokeWidth="1.5" fill="none" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d={s.path} /></svg>
                  )}
                </a>
              ))}
            </div>
            <span style={{ fontFamily: '"Cinzel", serif', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,151,59,0.55)', fontWeight: 700 }}>
              CENTRAL INSTITUTE OF CLASSICAL TAMIL
            </span>
          </div>

          {/* ── Resources ── */}
          <div>
            <p className="footer-col-heading">{t('வளங்கள்', 'RESOURCES')}</p>
            <div className="footer-col-rule" />
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: t('செவ்வியல் நூல்கள்', 'Classical Texts'), path: '/classical-texts' },
                { label: t('மின் நூலகம்', 'Digital Library'), path: '/ebooks' },
                { label: t('சுவடித் தேடல்', 'Manuscript Search'), path: '/search' },
                { label: t('மின் நூல்கள்', 'E-Books'), path: '/ebooks' },
                { label: t('கருத்துக்கள் - பதிவு', 'Feedback / Remarks'), path: '/feedback' },
                { label: t('பதிவிறக்கங்கள்', 'Downloads'), path: '/' },
              ].map((item, i) => (
                <li key={i}>
                  <Link to={item.path} className="footer-link">
                    <span className="footer-link-arrow">›</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Institution ── */}
          <div>
            <p className="footer-col-heading">{t('நிறுவனம்', 'INSTITUTION')}</p>
            <div className="footer-col-rule" />
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: t('நிறுவனத்தைப் பற்றி', 'About the Institute'), path: '/team' },
                { label: t('நிர்வாகம்', 'Administration'), path: '/team' },
                { label: t('ஆய்வு', 'Research'), path: '/search' },
                { label: t('குழு', 'Team'), path: '/team' },
                { label: t('செய்திகள்', 'News & Updates'), path: '/' },
                { label: t('தொடர்புக்கு', 'Contact Us'), path: '/contact' },
              ].map((item, i) => (
                <li key={i}>
                  <Link to={item.path} className="footer-link">
                    <span className="footer-link-arrow">›</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact ── */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <p className="footer-col-heading">{t('தொடர்பு', 'CONTACT US')}</p>
            <div className="footer-col-rule" />
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <li style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <svg style={{ width: '1.1rem', height: '1.1rem', color: '#C9973B', flexShrink: 0, marginTop: '0.1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span style={{ fontSize: '0.82rem', color: 'rgba(245,240,232,0.72)', lineHeight: 1.6 }}>
                  Central Institute of Classical Tamil<br />
                  Semmozhi Salai, Perumbakkam,<br />
                  Chennai - 600 100, Tamil Nadu, India
                </span>
              </li>
              <li style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <svg style={{ width: '1.1rem', height: '1.1rem', color: '#C9973B', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span style={{ fontSize: '0.82rem', color: 'rgba(245,240,232,0.72)' }}>+91 44 4990 4200</span>
              </li>
              <li style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <svg style={{ width: '1.1rem', height: '1.1rem', color: '#C9973B', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span style={{ fontSize: '0.82rem', color: 'rgba(245,240,232,0.72)' }}>cict@tn.gov.in</span>
              </li>
              <li style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <svg style={{ width: '1.1rem', height: '1.1rem', color: '#C9973B', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span style={{ fontSize: '0.82rem', color: 'rgba(245,240,232,0.72)' }}>Mon - Sat : 10:00 AM - 05:30 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="footer-bottom">
          {/* Ornamental center separator */}
          <div className="footer-bottom-ornament">
            <div className="orn-line" />
            <div className="orn-dot" />
            <div className="orn-diamond" />
            <div className="orn-dot" />
            <div className="orn-line-rev" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,0.45)', fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Inter", sans-serif', margin: 0 }}>
              © 2025 {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}. {t('அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.', 'All Rights Reserved.')}
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              {['Privacy Policy', 'Terms of Use', 'Accessibility'].map((item, i, arr) => (
                <React.Fragment key={i}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,0.45)', cursor: 'pointer', transition: 'color 0.3s' }}
                    onMouseEnter={e => e.target.style.color = '#C9973B'}
                    onMouseLeave={e => e.target.style.color = 'rgba(245,240,232,0.45)'}>
                    {item}
                  </span>
                  {i < arr.length - 1 && (
                    <span style={{ color: 'rgba(201,151,59,0.30)', fontSize: '0.7rem' }}>|</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
