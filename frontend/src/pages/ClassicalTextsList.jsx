import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

// ─── Data ─────────────────────────────────────────────────────────────────────
const CONTENT_LINES = [
  { type: 'heading1', text: '  இலக்கணம்' },
  { type: 'item', num: '1.', ta: 'தொல்காப்பியம்', en: 'Tolkāppiyam' },
  { type: 'item', num: '2.', ta: 'இறையனார் களவியல்', en: 'Iṟaiyaṉār kaḷaviyal' },
  { type: 'space' },
  { type: 'heading1', text: '  இலக்கியம்' },
  { type: 'heading2', text: ' எட்டுத்தொகை' },
  { type: 'item', num: '3.', ta: 'நற்றிணை', en: 'Naṟṟiṇai' },
  { type: 'item', num: '4.', ta: 'குறுந்தொகை', en: 'Kuṟuntokai' },
  { type: 'item', num: '5.', ta: 'ஐங்குறுநூறு', en: 'Aiṅkuṟunūṟu' },
  { type: 'item', num: '6.', ta: 'பதிற்றுப்பத்து', en: 'Patiṟṟuppattu' },
  { type: 'item', num: '7.', ta: 'பரிபாடல்', en: 'Paripāṭal' },
  { type: 'item', num: '8.', ta: 'கலித்தொகை', en: 'Kalittokai' },
  { type: 'item', num: '9.', ta: 'அகநானூறு', en: 'Akanāṉūṟu' },
  { type: 'item', num: '10.', ta: 'புறனானூறு', en: 'Puṟanāṉūṟu' },
  { type: 'heading2', text: ' பத்துப்பாட்டு' },
  { type: 'item', num: '11.', ta: 'திருமுருகாற்றுப்படை', en: 'Tirumurukāṟṟuppaṭai' },
  { type: 'item', num: '12.', ta: 'பொருநராற்றுப்படை', en: 'Porunarāṟṟuppaṭai' },
  { type: 'item', num: '13.', ta: 'சிறுபாணாற்றுப்படை', en: 'Ciṟupāṇāṟṟuppaṭai' },
  { type: 'item', num: '14.', ta: 'பெரும்பாணாற்றுப்படை', en: 'Perumpāṇāṟṟuppaṭai' },
  { type: 'item', num: '15.', ta: 'முல்லைப்பாட்டு', en: 'Mullaippāṭṭu' },
  { type: 'item', num: '16.', ta: 'மதுரைக்காஞ்சி', en: 'Maturaikkāñci' },
  { type: 'item', num: '17.', ta: 'நெடுநல்வாடை', en: 'Neṭunalvāṭai' },
  { type: 'item', num: '18.', ta: 'குறிஞ்சிப்பாட்டு', en: 'Kuṟiñcippāṭṭu' },
  { type: 'item', num: '19.', ta: 'பட்டினப்பாலை', en: 'Paṭṭiṉappālai' },
  { type: 'item', num: '20.', ta: 'மலைபடுகடாம்', en: 'Malaipaṭukaṭām' },
  { type: 'space' },
  { type: 'heading1', text: ' பதினெண் கீழ்க்கணக்கு' },
  { type: 'item', num: '21.', ta: 'நாலடியார்', en: 'Nālaṭiyār' },
  { type: 'item', num: '22.', ta: 'நான்மணிக்கடிகை', en: 'Nāṉmaṇikkaṭikai' },
  { type: 'item', num: '23.', ta: 'இன்னா நாற்பது', en: 'Iṉṉā nāṟpatu' },
  { type: 'item', num: '24.', ta: 'இனியவை நாற்பது', en: 'Iṉiyavai nāṟpatu' },
  { type: 'item', num: '25.', ta: 'கார் நாற்பது', en: 'Kār nāṟpatu' },
  { type: 'item', num: '26.', ta: 'களவழி நாற்பது', en: 'Kaḷavaḻi nāṟpatu' },
  { type: 'item', num: '27.', ta: 'ஐந்திணை ஐம்பது', en: 'Aintiṇai aimpatu' },
  { type: 'item', num: '28.', ta: 'ஐந்திணை யெழுபது', en: 'Aintiṇai yeḻupatu' },
  { type: 'item', num: '29.', ta: 'திணைமொழி ஐம்பது', en: 'Tiṇaimoḻi aimpatu' },
  { type: 'item', num: '30.', ta: 'திணைமாலை நூற்றைம்பது', en: 'Tiṇaimālai nūṟṟaimpatu' },
  { type: 'item', num: '31.', ta: 'திருக்குறள்', en: 'Tirukkuṟaḷ' },
  { type: 'item', num: '32.', ta: 'திரிகடுகம்', en: 'Tirikaṭukam' },
  { type: 'item', num: '33.', ta: 'ஆசாரக்கோவை', en: 'Ācārakkōvai' },
  { type: 'item', num: '34.', ta: 'பழமொழி நானூறு', en: 'Paḻamoḻi nāṉūṟu' },
  { type: 'item', num: '35.', ta: 'சிறுபஞ்சமூலம்', en: 'Ciṟupañcamūlam' },
  { type: 'item', num: '36.', ta: 'முதுமொழிக் காஞ்சி', en: 'Mutumoḻik kāñci' },
  { type: 'item', num: '37.', ta: 'ஏலாதி', en: 'Ēlāti' },
  { type: 'item', num: '38.', ta: 'கைந்நிலை', en: 'Kainnilai' },
  { type: 'space' },
  { type: 'heading1', text: '  காப்பியம்' },
  { type: 'item', num: '39.', ta: 'சிலப்பதிகாரம்', en: 'Cilappatikāram' },
  { type: 'item', num: '40.', ta: 'மணிமேகலை', en: 'Maṇimēkalai' },
  { type: 'space' },
  { type: 'item', num: '41.', ta: 'முத்தொள்ளாயிரம்', en: 'Muttoḷḷāyiram' }
];

// ─── Page ──────────────────────────────────────────────────────────────────────
const ClassicalTextsList = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen selection:bg-maroon selection:text-white" style={{ background: '#FAF8F2' }}>

      {/* ── Hero Banner ── */}
      <header className="relative pt-44 pb-28 overflow-hidden selection:bg-white selection:text-maroon">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #1A0303 0%, #3D0707 40%, #5C1A08 75%, #1A0303 100%)' }}
        />

        {/* Glow orb */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #C9973B 0%, transparent 70%)', filter: 'blur(60px)' }}
        />

        {/* Ornamental frame */}
        <div className="absolute inset-6 border-2 border-gold/30 pointer-events-none select-none z-10 hidden md:block">
          <div className="absolute inset-1 border border-gold/15" />
          <img src="/images/gold_corner.png" alt="" className="absolute top-[-2px] left-[-2px] w-6 h-6" style={{ transform: 'none' }} />
          <img src="/images/gold_corner.png" alt="" className="absolute top-[-2px] right-[-2px] w-6 h-6" style={{ transform: 'scaleX(-1)' }} />
          <img src="/images/gold_corner.png" alt="" className="absolute bottom-[-2px] left-[-2px] w-6 h-6" style={{ transform: 'scaleY(-1)' }} />
          <img src="/images/gold_corner.png" alt="" className="absolute bottom-[-2px] right-[-2px] w-6 h-6" style={{ transform: 'scale(-1)' }} />
        </div>

        {/* Left illustration */}
        <div className="absolute left-[2%] md:left-[4%] top-1/2 -translate-y-1/2 w-[35vw] md:w-[22vw] max-w-[300px] min-w-[120px] pointer-events-none select-none z-0 xl:z-10 opacity-30 xl:opacity-100">
          <img src="/images/book_transparent.png" alt="" className="w-full h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />
        </div>

        {/* Right illustration */}
        <div className="absolute right-[2%] md:right-[4%] top-1/2 -translate-y-1/2 w-[35vw] md:w-[20vw] max-w-[260px] min-w-[120px] pointer-events-none select-none z-0 xl:z-10 opacity-10 xl:opacity-25">
          <img src="/images/temple_transparent.png" alt="" className="w-full h-auto object-contain" />
        </div>

        {/* Tamil watermarks */}
        <div className="absolute inset-0 opacity-[0.03] select-none pointer-events-none flex flex-wrap gap-24 p-10 items-center justify-around text-gold text-7xl font-bold font-serif">
          <span>அ</span><span>ஆ</span><span>இ</span><span>ஈ</span><span>உ</span><span>ஊ</span>
          <span>எ</span><span>ஏ</span><span>ஐ</span><span>ஒ</span><span>ஓ</span><span>ஔ</span>
        </div>

        {/* Bottom divider */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        {/* Hero content */}
        <div className="container mx-auto px-6 max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {/* Eyebrow */}
            <div className="flex items-center justify-center gap-5">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60" />
              <p className="font-cinzel text-[10px] uppercase tracking-[0.5em] text-gold/80 font-bold">
                {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
              </p>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60" />
            </div>

            {/* Title */}
            <h1
              className="text-white font-bold tracking-wide animate-fade-in"
              style={{
                fontFamily: '"Noto Sans Tamil", sans-serif',
                fontSize: 'clamp(2rem, 5vw, 4.2rem)',
                textShadow: '0 0 60px rgba(201,151,59,0.15)',
              }}
            >
              {t('செவ்வியல் நூல்கள்', 'Classical Tamil Texts')}
            </h1>

            {/* Gold divider image */}
            <div className="flex justify-center mt-2">
              <img src="/images/gold_divider.png" alt="" className="h-6 object-contain opacity-80" />
            </div>
          </motion.div>
        </div>
      </header>

      {/* ── Texts Section ── */}
      <section className="relative py-12 md:py-16 bg-[#FAF8F5]">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">

          {/* Outer card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.02 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white border border-gold/30 shadow-[0_10px_45px_rgba(201,151,59,0.14),0_2px_10px_rgba(60,20,5,0.05)] rounded-xl overflow-hidden"
          >
            {/* Top bar */}
            <div className="h-[4px] w-full bg-gradient-to-r from-maroon via-gold to-maroon" />

            <div className="p-6 sm:p-10 md:p-12">
              {/* Reference Intro Text */}
              <div className="text-stone/80 text-sm md:text-[0.95rem] leading-relaxed mb-6 space-y-1" style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }}>
                <p>செவ்வியல் நூல்கள் என வரையறுக்கப்பட்டவை அனைத்தும் கி.பி. 6 ஆம் நூற்றாண்டிற்கு முந்தியவை.</p>
                <p>41 செவ்வியல் நூல்கள் கீழே குறிப்பிடப்பட்டுள்ளன.</p>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent my-6" />

              {/* List Header */}
              <div className="mb-6">
                <h2 className="text-maroon font-bold text-base md:text-lg" style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }}>
                  செவ்வியல் நூல்கள் - Classical Tamil texts
                </h2>
              </div>

              {/* Exact structured list content */}
              <div className="text-stone/90 text-[14px] md:text-[15px] w-full flex flex-col" style={{ fontFamily: '"Noto Sans Tamil", "Noto Sans", sans-serif' }}>
                {CONTENT_LINES.map((line, idx) => {
                  if (line.type === 'space') {
                    return <div key={idx} className="h-10 md:h-14 break-inside-avoid" />;
                  }

                  if (line.type === 'heading1') {
                    return (
                      <div key={idx} className="font-bold text-[#7A1515] pt-4 pb-1 mb-2 text-[15px] md:text-[16px] tracking-wide whitespace-pre break-inside-avoid">
                        {line.text}
                      </div>
                    );
                  }

                  if (line.type === 'heading2') {
                    return (
                      <div key={idx} className="font-bold text-[#7A1515] pl-2 pt-2 pb-1 mb-1 text-[14px] md:text-[15px] whitespace-pre break-inside-avoid">
                        {line.text}
                      </div>
                    );
                  }

                  // Item layout: Number (left), Tamil title (center-left), English transliteration (solid black, right)
                  return (
                    <div key={idx} className="flex items-baseline py-1.5 mb-2.5 border-b border-stone/10 hover:bg-stone/5 transition-colors duration-150 rounded-sm px-1.5 md:px-3 break-inside-avoid shadow-sm">
                      <span className="w-8 text-black font-cinzel text-xs font-semibold shrink-0 select-none">
                        {line.num}
                      </span>
                      <span className="text-[#2C1A0E] font-medium grow leading-relaxed">
                        {line.ta}
                      </span>
                      <span className="text-black font-semibold text-xs md:text-sm pl-4 leading-relaxed font-serif whitespace-nowrap">
                        {line.en}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Bottom ornament */}
              <div className="flex justify-center pt-8">
                <img src="/images/gold_divider.png" alt="" className="h-5 object-contain opacity-70" />
              </div>

            </div>

            {/* Bottom bar */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default ClassicalTextsList;
