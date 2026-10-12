import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getBookCover } from '../utils/bookCovers';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const CornerOrnament = ({ position }) => {
  const styles = {
    'top-left': { top: '8px', left: '8px' },
    'top-right': { top: '8px', right: '8px', transform: 'scaleX(-1)' },
    'bottom-left': { bottom: '8px', left: '8px', transform: 'scaleY(-1)' },
    'bottom-right': { bottom: '8px', right: '8px', transform: 'scale(-1)' },
  };
  return (
    <img
      src="/images/gold_corner.png"
      alt="corner ornament"
      className="absolute pointer-events-none select-none w-16 h-16 opacity-100 contrast-125"
      style={styles[position]}
    />
  );
};

const PandyaCorner = ({ className, style }) => (
  <img
    src="/images/pandya_corner.png"
    alt="pandya corner decoration"
    className={`absolute pointer-events-none select-none w-[320px] h-[320px] opacity-100 drop-shadow-md ${className}`}
    style={style}
  />
);

const FloatingGlyphs = () => {
  const glyphs = ['a', 'i', 'u', 'e', 'ai'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-10 mix-blend-multiply">
      {glyphs.map((g, i) => (
        <img
          key={i}
          src={`/images/glyph_${g}.png`}
          alt="tamil glyph watermark"
          className="absolute w-48 h-48"
          style={{
            left: `${5 + i * 22}%`,
            top: `${15 + (i % 2) * 45}%`,
            transform: `rotate(${i * 12}deg)`,
          }}
        />
      ))}
    </div>
  );
};

const TitleFlourishLeft = () => (
  <img
    src="/images/gold_flourish_left.png"
    alt="flourish"
    className="w-12 h-auto object-contain inline-block align-middle mr-3 opacity-100 contrast-125"
  />
);

const TitleFlourishRight = () => (
  <img
    src="/images/gold_flourish_right.png"
    alt="flourish"
    className="w-12 h-auto object-contain inline-block align-middle ml-3 opacity-100 contrast-125"
  />
);

const ClassicalTexts = () => {
  const { t } = useLanguage();

  const { data: texts = [], isLoading } = useQuery({
    queryKey: ['texts'],
    queryFn: async () => (await axios.get(`${API}/api/texts`)).data,
  });

  const { data: manuscripts = [] } = useQuery({
    queryKey: ['manuscripts'],
    queryFn: async () => (await axios.get(`${API}/api/manuscripts`)).data,
  });

  return (
    <div className="min-h-screen selection:bg-maroon selection:text-white" style={{ background: '#FAF8F2' }}>

      {/* Hero Section */}
      <header className="relative pt-44 pb-28 overflow-hidden selection:bg-white selection:text-maroon">
        {/* Background gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #1A0303 0%, #3D0707 40%, #5C1A08 75%, #1A0303 100%)' }} />

        {/* Glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #C9973B 0%, transparent 70%)', filter: 'blur(60px)' }} />

        {/* Elegant ornamental frame (natively responsive with absolute corners) */}
        <div className="absolute inset-6 border-2 border-gold/30 pointer-events-none select-none z-10 hidden md:block">
          <div className="absolute inset-1 border border-gold/15" />
          {/* Corner images */}
          <img src="/images/gold_corner.png" alt="ornament" className="absolute top-[-2px] left-[-2px] w-6 h-6" style={{ transform: 'none' }} />
          <img src="/images/gold_corner.png" alt="ornament" className="absolute top-[-2px] right-[-2px] w-6 h-6" style={{ transform: 'scaleX(-1)' }} />
          <img src="/images/gold_corner.png" alt="ornament" className="absolute bottom-[-2px] left-[-2px] w-6 h-6" style={{ transform: 'scaleY(-1)' }} />
          <img src="/images/gold_corner.png" alt="ornament" className="absolute bottom-[-2px] right-[-2px] w-6 h-6" style={{ transform: 'scale(-1)' }} />
        </div>

        {/* Left Hero Illustration - Open book & quill */}
        <div className="absolute left-[2%] md:left-[4%] top-1/2 -translate-y-1/2 w-[35vw] md:w-[24vw] max-w-[320px] min-w-[120px] pointer-events-none select-none z-0 xl:z-10 opacity-30 xl:opacity-100">
          <img src="/images/book_transparent.png" alt="Ancient book and manuscripts with quill" className="w-full h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />
        </div>

        {/* Right Hero Illustration - South Indian Dravidian Temple line-art */}
        <div className="absolute right-[2%] md:right-[4%] top-1/2 -translate-y-1/2 w-[35vw] md:w-[22vw] max-w-[280px] min-w-[120px] pointer-events-none select-none z-0 xl:z-10 opacity-10 xl:opacity-30">
          <img src="/images/temple_transparent.png" alt="Dravidian Temple Gopuram Line Art" className="w-full h-auto object-contain" />
        </div>

        {/* Subtle Tamil letters watermark in background */}
        <div className="absolute inset-0 opacity-[0.03] select-none pointer-events-none flex flex-wrap gap-24 p-10 items-center justify-around text-gold text-7xl font-bold font-serif">
          <span>அ</span><span>ஆ</span><span>இ</span><span>ஈ</span><span>உ</span><span>ஊ</span><span>எ</span><span>ஏ</span><span>ஐ</span><span>ஒ</span><span>ஓ</span><span>ஔ</span>
        </div>

        {/* Bottom divider line */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        {/* Content */}
        <div className="container mx-auto px-6 max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6 animate-fadeUp"
          >
            <div className="flex items-center justify-center gap-5">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60" />
              <p className="font-cinzel text-[10px] uppercase tracking-[0.5em] text-gold/80 font-bold">
                {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
              </p>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60" />
            </div>

            <h1 className="font-cinzel text-white font-bold tracking-wide" style={{ textShadow: '0 0 60px rgba(201,151,59,0.15)', fontSize: 'clamp(1.5rem, 6vw, 4.5rem)', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.2' }}>
              {t('செம்பதிப்பின் தேவை', 'Classical Tamil Texts')}
            </h1>

            {/* Gold divider ornament image */}
            <div className="flex justify-center my-4">
              <img src="/images/gold_divider.png" alt="divider ornament" className="h-6 object-contain opacity-80" />
            </div>

            {/* Tagline removed */}


          </motion.div>
        </div>
      </header>

      {/* ── Introduction & Scholarly Content Section ── */}
      <section className="relative py-12 md:py-16 bg-[#FAF8F5]">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white border border-gold/30 shadow-[0_10px_45px_rgba(201,151,59,0.14),0_2px_10px_rgba(60,20,5,0.05)] rounded-lg overflow-hidden"
          >
            {/* Top decorative gradient bar */}
            <div className="h-[4px] w-full bg-gradient-to-r from-maroon via-gold to-maroon" />

            <div className="p-6 sm:p-10 md:p-14 space-y-12">

              {/* ══════════════════════════════════════════
                  1. செம்பதிப்பின் தேவை (Need for Critical Edition)
              ══════════════════════════════════════════ */}
              <div className="bg-[#FAF8F2] border border-gold/25 rounded-lg p-6 md:p-8 relative shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                  <h2 className="font-cinzel text-xl md:text-2xl text-maroon font-bold tracking-wide">
                    {'செவ்வியல் நூல்கள்'}
                  </h2>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-gold/40 via-gold/15 to-transparent mb-6" />

                <div className="space-y-4 tamil-body text-stone/85 text-base md:text-[1.05rem] leading-relaxed md:leading-[2] font-medium text-justify">
                  <p>
                    {'தரமாய்ந்த மிகப்பகழ் பதிப்புகளில் கூடப் பொருந்தாப்பாடம், எழுத்துப் பிழை, புணர்ச்சிப் பிழை, சீர்ப்பிரிவு, அடிப்பிரிவு போன்றவை அருகியும் பரவலாகவும் காணப்படுகின்றன. செவ்வியல் நூல்களை உயர்தரமுடையனவாகவும் பிழை பிறழ்வுகளினின்றும் நீங்கினவாகவும் பாடம் உறுதி செய்து பதிப்பித்தல் இன்றியமையாதது. ஆகவே ஆய்வு நோக்கில் செம்பதிப்பு பெரிதும் பயன்பாடு உடையது.'}
                  </p>
                  <p>
                    {'மரபுவழிப் புணர்ச்சிகளை மேற்கொண்டால், சீர்ப்பிரித்து யாப்பமைதி கெடாதவாறு வடிவமைத்தல் ஆகியவற்றின் அடிப்படையில் செம்பதிப்புகள் அமையுமாதலின் அவற்றுளு வெளிப்படுவதன் மூலம் பழந்தமிழ் மரபுகள் பாதுகாக்கப்படும்.'}
                  </p>
                  <p>
                    {'செம்பதிப்பு நூல்கள், உலக அளவிலும் தமிழக அளவிலும் ஆராய்ச்சி செய்வதற்கு ஏற்ற அடிப்படை ஆய்வுக்களங்களாக அமையும்.'}
                  </p>
                  <p>
                    {'தரப்படுத்தப்பட்ட பதிப்புகளை வெளியிடுவதால, பள்ளி, கல்லூரி, பல்கலைக்கழகப் பாடத்திட்டங்களில், பிழையும பிறழ்வுமற்ற பழந்தமிழ் நூற்பகுதிகளைப் பயிற்றுவிக்க வாய்ப்பு ஏற்படும்.'}
                  </p>
                  <p>
                    {'எல்லாப் பழந்தமிழ் நூல்களும் எழுத்தாட்சி, கட்டுக்கோப்பு, நூற்கட்டமைப்பு போன்றவற்றில் ஒரே சீரினவாகச் சீரமைக்கப்பட்டால், ஒருவகை அழகுணர்ச்சியைத் தோற்றுவிப்பதோடு பயில்வோர்க்கு ஈடுபாடு ஏற்படவும் உதவும்.'}
                  </p>
                </div>
              </div>


              {/* ══════════════════════════════════════════
                  2. செம்பதிப்புப் பணி - மூன்று கட்டங்கள்
              ══════════════════════════════════════════ */}
              <div className="bg-[#FAF8F2] border border-gold/25 rounded-lg p-6 md:p-8 relative shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                  <h2 className="font-cinzel text-xl md:text-2xl text-maroon font-bold tracking-wide">
                    {'செம்பதிப்புப் பணி - மூன்று கட்டங்கள்'}
                  </h2>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-gold/40 via-gold/15 to-transparent mb-6" />

                {/* Numbered Steps */}
                <div className="space-y-6">
                  {/* Step I */}
                  <div className="bg-white border border-gold/20 rounded-md p-5 shadow-xs transition-all hover:border-gold/40">
                    <div className="flex items-start gap-4">
                      <span className="font-cinzel text-lg md:text-xl font-bold text-gold border border-gold/30 rounded px-2.5 py-1 bg-[#FAF8F2] flex-shrink-0">
                        Ⅰ
                      </span>
                      <div className="space-y-3">
                        <h3 className="font-tamil-bold text-lg text-maroon font-bold">
                          {'சுவடிகளையும் பதிப்புகளையும் கண்டறிந்து தொகுத்தல்'}
                        </h3>
                        <p className="tamil-body text-stone/80 text-base leading-relaxed text-justify">
                          {'அட்டவணைகளின் அடிப்படையில் தேடிக் கண்டறிந்த சுவடிகளை மின்படி (Scan) எடுத்தல்; மற்றொன்று ஏடுகளை வரிசையாக அடுக்கிப் படம் எடுத்தல், அவற்றைத் தனித்தனி பக்கங்களாகப் பிரித்து அமைத்தல், தனிப்பக்கங்களைத் தூய்மை செய்து (Color correction) படி எடுத்தல் என்று இது அமையும். சுவடிகளின் பின்படங்களை விரைந்து படிப்பதற்கு ஏதுவாகத் தேவையான பக்கங்கள் மற்றும் பாடல்களை உடனே திரைக்குக் கொண்டுவரும் வகையில் உரிய மென்பொருள் உருவாக்கப்பட்டுள்ளது.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step II */}
                  <div className="bg-white border border-gold/20 rounded-md p-5 shadow-xs transition-all hover:border-gold/40">
                    <div className="flex items-start gap-4">
                      <span className="font-cinzel text-lg md:text-xl font-bold text-gold border border-gold/30 rounded px-2.5 py-1 bg-[#FAF8F2] flex-shrink-0">
                        Ⅱ
                      </span>
                      <div>
                        <h3 className="font-tamil-bold text-lg text-maroon font-bold">
                          {'பாடவேறுபாட்டுத் தரவுகளைத் தொகுத்தலும் பட்டியலிடுதலும்.'}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Step III */}
                  <div className="bg-white border border-gold/20 rounded-md p-5 shadow-xs transition-all hover:border-gold/40">
                    <div className="flex items-start gap-4">
                      <span className="font-cinzel text-lg md:text-xl font-bold text-gold border border-gold/30 rounded px-2.5 py-1 bg-[#FAF8F2] flex-shrink-0">
                        Ⅲ
                      </span>
                      <div>
                        <h3 className="font-tamil-bold text-lg text-maroon font-bold">
                          {'சரியான பாடங்களையும் யாப்பு மற்றும் புணர்ச்சி அமைவுகளையும் உறுதி செய்து வரையறுத்தலும் மீட்டுருவாக்கம் செய்தலும்.'}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* ══════════════════════════════════════════
                  3. செம்பதிப்பின் தனித்தன்மைகள்
              ══════════════════════════════════════════ */}
              <div className="bg-[#FAF8F2] border border-gold/25 rounded-lg p-6 md:p-8 relative shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                  <h2 className="font-cinzel text-xl md:text-2xl text-maroon font-bold tracking-wide">
                    {'செம்பதிப்பின் தனித்தன்மைகள்'}
                  </h2>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-gold/40 via-gold/15 to-transparent mb-6" />

                <div className="space-y-4 tamil-body text-stone/85 text-base md:text-[1.05rem] leading-relaxed md:leading-[2] font-medium text-justify">
                  <p>
                    {'எல்லா மூலச்சுவடிகளிலும அனைத்துப் பதிப்புகளிலும் உரைமேற்கோள்களிலும் இடம்பெறும் அனைத்துப் பாடவேறுபாடுகளையும் ஒருங்கிணைத்தளிக்குந்தன்மையால் செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் வெளியிடும் செம்பதிப்பு வேறு எந்தப்பதிப்பையும் விடத் தனித்தன்மை வாய்ந்ததாகிறது. பிற பதிப்புகளில் பாடம் உறுதி செய்து, அதற்கான காரணங்கள் விரிவாக விளக்கப்படவில்லை. செம்பதிப்பு பாடத் தேர்வு விளக்கங்களை பெற்றிருத்தலால் தனிச்சிறப்புப் பெறுகிறது. வரையறுக்கப்பட்ட யாப்பு வடிவங்களை மேற்கொள்வதாலும் மரபுவழிப்பட்ட சரியான புணர்ச்சிகளை எதிர்நிற்கும் யாப்பும் புணர்ச்சியும் இறுதி செய்யப்பட்டமைக்கான விளக்கங்களைப் பெற்றிருத்தலும் செம்பதிப்பை ஒப்புயர்வற்றதாக உயர்த்துகின்றன. பதிப்புகளையும், சுவடிகளையும் காலவரிசைப்படுத்தித் தருவது, பொதுவாகத் தமிழ்ப் பதிப்புகளில் காணப்படாத பெருமை சான்றது.'}
                  </p>
                </div>
              </div>


              {/* Decorative bottom ornament divider */}
              <div className="flex justify-center pt-4">
                <img src="/images/gold_divider.png" alt="divider" className="h-5 object-contain opacity-70" />
              </div>

            </div>

            {/* Bottom decorative bar */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ClassicalTexts;
