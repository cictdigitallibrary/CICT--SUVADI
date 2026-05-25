import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-stone text-ivory pt-20 pb-10 relative overflow-hidden">
      {/* Top gold line */}
      <div className="absolute top-0 left-0 w-full h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent, #C9973B 40%, #E8B86D 50%, #C9973B 60%, transparent)' }} />

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">

          {/* ── Brand ── */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gold/20 flex items-center justify-center rounded-full border border-gold/30">
                <span className="text-gold font-cinzel text-xl font-bold">சு</span>
              </div>
              <span className="font-bold text-lg text-gold"
                style={{ fontFamily: '"Baloo Thambi 2", sans-serif', fontWeight: 800 }}>
                {t('சுவடி', 'Suvadi')}
              </span>
            </div>
            <p className="text-sm text-ivory/60 leading-relaxed mb-8"
              style={{ fontFamily: '"Baloo Thambi 2", "Noto Sans Tamil", sans-serif', fontWeight: 400 }}>
              {t(
                'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் (CICT) - சுவடியியல் புலம். தமிழ் செவ்வியல் நூல்களையும் சுவடிகளையும் பாதுகாத்து ஆய்வாளர்களுக்கு வழங்கும் மின்னணுத் தளம்.',
                'Central Institute of Classical Tamil (CICT) – Faculty of Manuscriptology. A digital platform for preserving and providing access to Classical Tamil manuscripts and scholarly resources.'
              )}
            </p>
          </div>

          {/* ── Resources ── */}
          <div>
            <h4 className="font-cinzel text-gold text-[10px] uppercase tracking-widest mb-8 border-b border-gold/20 pb-4 inline-block">
              {t('வளங்கள்', 'Resources')}
            </h4>
            <ul className="space-y-4 text-sm text-ivory/70">
              <li>
                <Link to="/classical-texts" className="hover:text-gold transition-colors"
                  style={{ fontFamily: '"Baloo Thambi 2", "Noto Sans Tamil", sans-serif', fontWeight: 500 }}>
                  {t('செவ்வியல் நூல்கள்', 'Classical Texts')}
                </Link>
              </li>
              <li>
                <Link to="/search" className="hover:text-gold transition-colors"
                  style={{ fontFamily: '"Baloo Thambi 2", "Noto Sans Tamil", sans-serif', fontWeight: 500 }}>
                  {t('சுவடித் தேடல்', 'Manuscript Search')}
                </Link>
              </li>
              <li>
                <Link to="/ebooks" className="hover:text-gold transition-colors"
                  style={{ fontFamily: '"Baloo Thambi 2", "Noto Sans Tamil", sans-serif', fontWeight: 500 }}>
                  {t('மின் நூல்கள்', 'E-Books')}
                </Link>
              </li>
              <li>
                <Link to="/feedback" className="hover:text-gold transition-colors"
                  style={{ fontFamily: '"Baloo Thambi 2", "Noto Sans Tamil", sans-serif', fontWeight: 500 }}>
                  {t('கருத்துக்கள் - பதிவு', 'Feedback / Remarks')}
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Institution ── */}
          <div>
            <h4 className="font-cinzel text-gold text-[10px] uppercase tracking-widest mb-8 border-b border-gold/20 pb-4 inline-block">
              {t('நிறுவனம்', 'Institution')}
            </h4>
            <ul className="space-y-4 text-sm text-ivory/70">
              <li>
                <Link to="/team" className="hover:text-gold transition-colors"
                  style={{ fontFamily: '"Baloo Thambi 2", "Noto Sans Tamil", sans-serif', fontWeight: 500 }}>
                  {t('மைய நிறுவனத்தைப் பற்றி', 'About the Institute')}
                </Link>
              </li>
              <li>
                <Link to="/team" className="hover:text-gold transition-colors"
                  style={{ fontFamily: '"Baloo Thambi 2", "Noto Sans Tamil", sans-serif', fontWeight: 500 }}>
                  {t('நிர்வாகம்', 'Administration')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-gold transition-colors"
                  style={{ fontFamily: '"Baloo Thambi 2", "Noto Sans Tamil", sans-serif', fontWeight: 500 }}>
                  {t('தொடர்புக்கு', 'Contact Us')}
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-gold transition-colors"
                  style={{ fontFamily: '"Baloo Thambi 2", "Noto Sans Tamil", sans-serif', fontWeight: 500 }}>
                  {t('செய்திகள்', 'News & Updates')}
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Contact ── */}
          <div>
            <h4 className="font-cinzel text-gold text-[10px] uppercase tracking-widest mb-8 border-b border-gold/20 pb-4 inline-block">
              {t('தொடர்பு', 'Contact Us')}
            </h4>
            <div className="text-sm text-ivory/70 space-y-3"
              style={{ fontFamily: '"Baloo Thambi 2", "Noto Sans Tamil", sans-serif', fontWeight: 400 }}>
              <p>{t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}</p>
              <p>{t('செம்மொழிச் சாலை, பெரும்பாக்கம்,', 'Semmozhi Salai, Perumbakkam,')}</p>
              <p>{t('சென்னை - 600 100.', 'Chennai – 600 100.')}</p>
              <p className="pt-2 text-gold text-xs">Email: contact@suvadi.cict.in</p>
            </div>
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] uppercase tracking-widest text-ivory/40"
            style={{ fontFamily: '"Cinzel", serif' }}>
            © {new Date().getFullYear()} {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}. {t('அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.', 'All Rights Reserved.')}
          </p>
          <div className="flex gap-6">
            <span className="text-[10px] uppercase tracking-widest text-ivory/40 cursor-pointer hover:text-ivory/70 transition-colors"
              style={{ fontFamily: '"Cinzel", serif' }}>
              {t('தனியுரிமைக் கொள்கை', 'Privacy Policy')}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-ivory/40 cursor-pointer hover:text-ivory/70 transition-colors"
              style={{ fontFamily: '"Cinzel", serif' }}>
              {t('பயன்பாட்டு விதிகள்', 'Terms of Use')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
