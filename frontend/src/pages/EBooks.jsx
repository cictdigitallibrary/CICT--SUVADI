import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import PageHero from '../components/PageHero';
import { getBookCover } from '../utils/bookCovers';
import FallbackImg from '../components/FallbackImg';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// திட்ட உருவாக்கக் குழு — shown at the end of the editions list (as on the old site)
const PROJECT_TEAM = [
  { photo: 'director.jpg', role: 'திட்டத் தலைமையும் ஒருங்கிணைப்பும்', name: 'பேராசிரியர் இரா. சந்திரசேகரன்', designation: 'இயக்குநர்' },
  { photo: 'venki.jpg', role: 'திட்ட ஆக்கம்', name: 'முனைவர் இரா. வெங்கடேசன்', designation: 'இளநிலை ஆராய்ச்சி அலுவலர்' },
  { photo: 'ams.jpg', role: 'தொழில்நுட்ப வடிவமைப்பு', name: 'திரு. அ. முருக சுவாமிநாதன்', designation: 'நிரலாளர்' },
];



const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
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

const EBooks = () => {
  const { t, language } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);

  const { data: fetchedEbooks = [], isLoading } = useQuery({
    queryKey: ['ebooks'],
    queryFn: async () => (await axios.get(`${API}/api/ebooks`)).data,
  });

  // Inject Manimekalai and Irayanar categories dynamically
  const ebooks = [
    ...fetchedEbooks,
    { id: 17, title_tamil: 'மணிமேகலை', edition_count: 2, book_url: '/ebooks/17' },
    { id: 15, title_tamil: 'இறையனார் அகப்பொருள்', edition_count: 1, book_url: '/ebooks/15' }
  ];

  return (
    <div className="bg-ivory min-h-screen selection:bg-maroon selection:text-white">
      <style>{`
        @media (min-width: 640px) {
          .ebooks-hero-bg {
            aspect-ratio: 1920 / 555 !important;
            min-height: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
        }
      `}</style>

      <PageHero
        label={t('மின் நூலகம்', 'DIGITAL LIBRARY')}
        title={t('முதல் அச்சுப் பதிப்புகள்', 'First Printed Editions')}
        subtitle={t(
          'செம்மொழித் தமிழுக்கு ஆதாரமான நூல்களின் முதல் அச்சுப் பதிப்புகளை ஆவணப்படுத்திச் செம்மொழி நிறுவனம் வெளியிடுகிறது.',
          'The Central Institute curates and publishes the earliest printed editions of Classical Tamil foundational texts for global scholarly access.'
        )}
        badge={undefined}
        glyphs={['முதல்', 'அச்சு', 'நூல்', 'பத்து', 'திரு', 'கலி']}
        backgroundImage="/images/bg/ebooks-panoramic-clean.jpg"
        heroClass="ebooks-hero-bg"
        headingStyle={
          language === 'ta'
            ? { fontSize: 'clamp(1rem, 3.5vw, 2.8rem)', whiteSpace: 'normal', wordBreak: 'break-word' }
            : { fontSize: 'clamp(1.2rem, 4.8vw, 3.5rem)', whiteSpace: 'normal', wordBreak: 'break-word' }
        }
      />

      <div className="w-full">
        {/* ── Introduction / Publication Details Panel ── */}
        <div className="mx-auto w-[95%] max-w-[1700px] pt-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-white border border-maroon/10 shadow-xl mb-16 relative overflow-hidden rounded-lg"
          >
            {/* Gold top accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-maroon via-gold to-maroon" />

            <div className="p-8 md:p-12 lg:p-16 max-h-[70vh] overflow-y-auto scrollbar-custom">
            <style>{`
              .scrollbar-custom::-webkit-scrollbar { width: 6px; }
              .scrollbar-custom::-webkit-scrollbar-track { background: rgba(201,151,59,0.05); }
              .scrollbar-custom::-webkit-scrollbar-thumb { background: rgba(92,26,8,0.5); border-radius: 3px; }
              .scrollbar-custom::-webkit-scrollbar-thumb:hover { background: rgba(92,26,8,0.8); }
            `}</style>

            {/* Back button (visible only in details view) */}
            {showDetails && (
              <button
                onClick={() => setShowDetails(false)}
                className="flex items-center gap-2 mb-6 text-maroon hover:text-gold transition-colors duration-300 group"
                style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }}
              >
                <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span>
                <span className="text-sm font-bold">{'அறிமுகத்திற்குச் செல்க'}</span>
              </button>
            )}

            {!showDetails ? (
              /* ═══════════ INTRODUCTION VIEW ═══════════ */
              <div>
                <h2 className="tamil-label text-2xl text-maroon border-b border-maroon/10 pb-4 mb-8">
                  {'செம்மொழித் தமிழ் நூல்களின் முதல் அச்சுப் பதிப்புகள் - அறிமுகம்'}
                </h2>

                <div className="space-y-6 text-stone/80 tamil-body leading-loose text-[15px] text-justify">
                  {/* Section: அறிமுகம் */}
                  <div className="bg-[#FAF8F2] border border-gold/20 rounded-lg p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-gold" />
                      <h3 className="font-bold text-lg text-maroon" style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }}>
                        {'அறிமுகம்'}
                      </h3>
                    </div>
                    <div className="h-px w-full bg-gradient-to-r from-gold/40 via-gold/15 to-transparent mb-5" />

                    <p className="mb-4">
                      {'தமிழின் தொன்மை, தனித்தன்மை, தமிழர்களின் நாகரிகம், பண்பாடு ஆகியவற்றின் சிறப்புகளைக் கவனத்தில் கொண்டு பல்வேறு வெளியீடுகளைக் கொண்டுவருவதைச் செம்மொழி நிறுவனம் குறிக்கோளாகக் கொண்டுள்ளது. இந்த வகையில் பழந்தமிழ் நூல்களை வெளியிடுதல், செம்மொழித் தமிழ் தொடர்பான தகவல்களை வழங்குதல் முதலான பணிகளை நிறுவனம் மேற்கொண்டுள்ளது. அந்த வகையில் செம்மொழித் தமிழுக்கு ஆதாரமாக உள்ள 41 நூல்களின் முதல் அச்சுப் பதிப்புகளை ஆவணப்படுத்திச் செம்மொழித் தமிழாய்வு நிறுவனம் வெளியிடுகிறது.'}
                    </p>
                    <p>
                      {'செவ்வியல் தகுதிப்பாட்டிற்கான நூல்களைப் பாதுகாத்துக் கையளித்துவந்த தமிழ்ப் புலமை மரபிற்கும், உரையாசிரியர்கள், பதிப்பாசிரியர்களுக்கும், உலகளாவிய நிலையில் தமிழ்ச் சுவடிகளையும், நூல்களையும் பாதுகாத்து வரும் நிறுவனங்களுக்கும் தமிழ்ச் சமூகம் எப்போதும் நன்றிபாராட்ட கடமைப்பட்டுள்ளது.'}
                    </p>
                    <p className="mt-4">
                      {'41 செவ்வியல் நூல்களின் அச்சுப் பதிப்புகளைச் செம்மொழித் தமிழாய்வு மத்திய நிறுவனத்திற்கு வழங்கியுதவிய மறைமலையடிகள் நூலகம், டாக்டர் உ.வே. சாமிநாதையர் நூல்நிலையம், ரோஜா முத்தையா ஆராய்ச்சி நூலகம், தமிழ்ப் பல்கலைக்கழக நூலகம், தமிழ் இணையக் கல்விக்கழக மின்நூலகம் உள்ளிட்ட நூலகத்தார்களுக்கும், ஆய்வாளர்களுக்கும் செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் நன்றி பாராட்டி மகிழ்கிறது.'}
                    </p>
                  </div>

                  {/* Section: பதிப்புக் குறிப்புகள் */}
                  <div className="bg-[#FAF8F2] border border-gold/20 rounded-lg p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-gold" />
                      <h3 className="font-bold text-lg text-maroon" style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }}>
                        {'பதிப்புக் குறிப்புகள்'}
                      </h3>
                    </div>
                    <div className="h-px w-full bg-gradient-to-r from-gold/40 via-gold/15 to-transparent mb-5" />

                    <p className="mb-4">
                      {'தமிழ்ச் செவ்வியல் நூல்களுள் திருக்குறள், நாலடியார் ஆகிய இரு நூல்களே முதன் முதலாக அச்சு வடிவம் பெற்றன. 1812இல் தஞ்சை நகரைச் சேர்ந்த மலையப்பப் பிள்ளையின் மகனாகிய ஞானப்பிரகாசன் எனும் அறிஞர் திருக்குறள், நாலடியார் இரண்டையும் ஒன்றாக இணைத்து அச்சிட்டு வெளியிட்டார். அதனுடன் திருவள்ளுவமாலை மூலமும் இடம்பெற்றிருந்தது.'}
                    </p>
                    <p className="mb-4">
                      {'தொல்காப்பியத்தின் அச்சுப் பதிப்பு வரலாறு மழைவை மகாலிங்கையர் பதிப்பித்து வெளியிட்ட எழுத்ததிகார நச்சினார்க்கினியர் உரைப் பதிப்பிலிருந்து தொடங்குகிறது. 1847ஆம் ஆண்டு மகாலிங்கையரின் பதிப்பு வெளிவந்தது. நச்சினார்க்கினியர் உரைப் பதிப்பில் தொடங்கிய தொல்காப்பிய அச்சுப் பதிப்பு வரலாறு 1935ஆம் ஆண்டு வ.உ. சிதம்பரம் பிள்ளை பதிப்பித்து வெளியிட்ட தொல்காப்பிய இளம்பூரணர் உரைப் பதிப்போடு முதல் கட்ட பதிப்பு வரலாறு நிறைவுகொண்டிருக்கிறது.'}
                    </p>
                    <p className="mb-4">
                      {'சங்க இலக்கிய நூல்களுள் முதன் முதலாக அச்சு வடிவம் பெற்ற நூல் கலித்தொகை ஆகும். 1887ஆம் ஆண்டு சி.வை. தாமோதரம் பிள்ளை நச்சினார்க்கனியர் உரையுடன் கலித்தொகையைப் பதிப்பித்து வெளியிட்டதன் வழியாகச் சங்க இலக்கியப் பதிப்பு வரலாறு தொடங்குகிறது. கலித்தொகைக்கு முன்னரே பத்துப்பாட்டினுள் ஒன்றாகிய திருமுருகாற்றுப்படைக்குப் பல அச்சுப் பதிப்புகள் வெளிவந்துள்ளன. அப்பதிப்புகளைப் பத்துப்பாட்டின் முழுமையான பதிப்பாகக் கொள்ளமுடியாத நிலையில், சங்க இலக்கிய நூல்களுள் முதன் முதலாக அச்சுவடிவம் பெற்ற நூலாகக் கலித்தொகை அமைகிறது. 1872ஆம் ஆண்டில் சிலப்பதிகாரமும் 1894ஆம் ஆண்டில் மணிமேகலையும் முதன் முதலாக அச்சுவடிவம் பெற்றன. 1883இல் இறையனார் களவியலுரைக்கும், 1905இல் முத்தொள்ளாயிரத்திற்கும் முதல் அச்சுப் பதிப்பு வெளிவந்துள்ளன.'}
                    </p>
                    <p className="mb-4">
                      {'தொல்காப்பியம், சங்க இலக்கியம், காப்பிய நூல்களுக்கான முதல் அச்சுப் பதிப்புகளைக் கண்டறிவதில் நமக்குச் சிக்கல் ஏதும் ஏற்படவில்லை. கீழ்க்கணக்கு நூல்களுள் திருக்குறள், நாலடியார் நூல்களைத் தவிர்த்து ஏனைய நூல்களின் முதல் அச்சுப் பதிப்புகளைக் கண்டறிவதில் பெருஞ்சிரமம் ஏற்படுகிறது. இதனால் கிடைத்திருக்கிற கீழ்க்கணக்கு நூல்களுக்கான அச்சுப் பதிப்புகளில் மிகவும் காலத்தால் மூத்த பதிப்புகளை முதல் பதிப்பாகக் கருதி இங்குத் தரப்பட்டுள்ளன.'}
                    </p>
                    <p className="mb-4">
                      {'கீழ்க்கணக்கு நூல்களில் இங்குத் தரப்பட்டுள்ள அச்சுப் பதிப்புகளுக்கும் காலத்தால் முன்னரான பதிப்புகள் இருப்பதாகத் தகவல்கள் மட்டும் கிடைக்கின்றன; அச்சுப் பதிப்புகள் எங்கும் கிடைக்கப்பெறவில்லை. அதனால் அதற்கடுத்தடுத்த நிலையில் வெளிவந்த அச்சுப் பதிப்புகள் இங்குத் தரப்பட்டுள்ளன.'}
                    </p>
                    <p className="mb-4">
                      {'ஐந்திணையெழுபது நூல் பழையுரையுள்ள 26 பாடல்களை மட்டும் மு. இராகவையங்கார் 1906இல் செந்தமிழில் வெளியிட்டிருக்கிறார். அவை முழுமையான பதிப்பாகக் கருதமுடியாத நிலையில் அதன் பின்னர் 1926இல் வெளிவந்த சோமசுந்தர தேசிகர் பதிப்பை முதல் பதிப்பாகக் கொண்டு இங்குத் தரப்பட்டுள்ளது.'}
                    </p>
                    <p className="mb-4">
                      {'இனியவை நாற்பது முகவை இராமாநுச கவிராயரால் 1844இல் அச்சிட்டு வெளியிட்டிருப்பதாக ஒரு தகவலுண்டு. அந்த அச்சுப் பதிப்பு எங்கும் கிடைக்கப்பெறாமையால் 1903இல் வெளிவந்த ரா. இராகவையங்கார் பதிப்பு இங்குத் தரப்பட்டுள்ளது.'}
                    </p>
                    <p className="mb-4">
                      {'பழமொழி நானூற்றை 1874இல் சோடசாவதானம் சுப்பராயசெட்டியார் பதிப்பித்து வெளியிட்டதாகத் தகவல் உள்ளது; இப்போது அப்பதிப்பு கிடைக்கப்பெறாமையால் 1917இல் வெளிவந்த தி. செல்வகேசவராயர் பதிப்பும், ஆசாரக்கோவைக்குத் தில்லையம்பூர் சந்திசேகர கவிராஜ பண்டிதர் 1857இல் அச்சுப் பதிப்பை வெளியிட்டிருக்கிறார் என்ற தகவல் மட்டும் உள்ள நிலையில், 1883இல் வெளிவந்த அச்சுப் பதிப்பும் இங்குத் தரப்பட்டுள்ளன. ஏனைய கீழ்க்கணக்கு நூல்களின் அச்சுப் பதிப்புகள் முதல் பதிப்பாகக் கருதத்தக்கனவாகும்.'}
                    </p>
                    <p>
                      {'இந்த அச்சுப் பதிப்புகளுக்கும் மேலான பழைய அச்சுப் பதிப்புகளை வைத்திருப்பவர்களாயினும், அறிந்திருப்பவர்களாயினும் அவை பற்றிய தகவலைச் செம்மொழித் தமிழாய்வு நிறுவனத்திற்குத் தெரிவித்து உதவினால் இப்பதிப்புப் பட்டியலை மேம்படுத்த உதவியாக இருக்கும்.'}
                    </p>
                  </div>

                  {/* View Publication Details Button */}
                  <div className="flex justify-center pt-6 pb-2">
                    <button
                      onClick={() => setShowDetails(true)}
                      className="px-8 py-3 bg-maroon text-white font-bold rounded-md shadow-lg hover:bg-[#5C1A08] hover:shadow-xl transition-all duration-300 active:scale-[0.97]"
                      style={{ fontFamily: '"Noto Sans Tamil", sans-serif', fontSize: '1rem' }}
                    >
                      {'அச்சுப் பதிப்புகளின் வெளியீட்டு விவரம்'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ═══════════ PUBLICATION DETAILS VIEW ═══════════ */
              <div>
                <h2 className="tamil-label text-2xl text-maroon border-b border-maroon/10 pb-4 mb-6">
                  {'செம்மொழித் தமிழ் நூல்களின் முதல் அச்சுப் பதிப்புகள் - அறிமுகம் & பதிப்புக் குறிப்புகள்'}
                </h2>

                <div className="space-y-6 text-stone/80 tamil-body leading-loose text-[15px]">
                  <p className="font-bold text-lg text-maroon">
                    {'அச்சுப் பதிப்புகளின் வெளியீட்டு விவரம்'}
                  </p>

                  <div className="text-center font-bold text-maroon text-xl mt-8 mb-4">{'தொல்காப்பியம்'}</div>

                  <p className="font-bold">{'எழுத்ததிகாரம்'}</p>
                  <p className="font-bold">{'நச்சினார்க்கினியர் உரைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'1. தொல்காப்பியம் எழுத்ததிகார மூலமும் மதுரை ஆசிரியர் பாரத்துவாசி நச்சினார்க்கினியர் உரையும், சகலகலாசாலைத் தமிழ்த் தலைமைப் புலமை நடாத்திய மழைவை மகாலிங்கையரால் பரிசோதிக்கப்பட்டுக் கல்விக்கடல் அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, பிலவங்க – ஆவணி [1847]'}
                  </p>

                  <p className="font-bold mt-6">{'இளம்பூரணர் உரைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'தொல்காப்பியம் எழுத்ததிகார மூலமும் உரையாசிரியரென்னும் சிறப்புப் பெயரையுடைய இளம்பூரணருரையும், மகாவித்துவான் மீனாட்சிசுந்தரம் பிள்ளையவர்கள் மாணக்கருள் ஒருவராகிய திரிசிரபுரம் சோடசாவதானம் சுப்பராய செட்டியாரால் பரிசோதிக்கப்பட்டுச் சென்னை, அத்திநீயம் அண்ட் டேலிநியூஸ் பிரான்ச் அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, விபவ – கார்த்திகை [1868]'}
                  </p>

                  <p className="font-bold mt-6">{'சொல்லதிகாரம்'}</p>
                  <p className="font-bold">{'சேனாவரையர் உரைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'தொல்காப்பியம் சொல்லதிகார மூலமும் சேனாவரையருரையும், மேலைமணம்பேடு ஸ்ரீநிவாஸசடகோப முதலியாரவர்கள் வேண்டுகோளின்படி கோமளபுரம் இராசகோபால பிள்ளையவர்களால் வர்த்தமானதரங்கிணீசாகை அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, விபவ – கார்த்திகை [1868]'}
                  </p>

                  <p className="font-bold mt-6">{'இளம்பூரணர் உரைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'தொல்காப்பியம் சொல்லதிகார மூலமும் இளம்பூரணர் உரையும், காவேரிப்பாக்கம் நமச்சிவாய முதலியாரால் பரிசோதிக்கப்பட்டுச் சென்னை, காக்ஸ்டன் பிரஸில் பதிப்பிக்கப்பட்டது, 1927'}
                  </p>

                  <p className="font-bold mt-6">{'நச்சினார்க்கினியர் உரைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'தொல்காப்பியம் சொல்லதிகார மூலமும் நச்சினார்க்கினியர் உரையும், யாழ்ப்பாணம் சி.வை. தாமோதரம் பிள்ளையால் பரிசோதிக்கப்பட்டு, சென்னபட்டணம், விக்டோரியா ஜூபிலி அச்சியந்திரசாலையில் பதிப்பிக்கப்பட்டது, நந்தன - புரட்டாசி [1892]'}
                  </p>

                  <p className="font-bold mt-6">{'தெய்வச்சிலையார் உரைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'தொல்காப்பியம் சொல்லதிகார மூலமும் தெய்வச்சிலையார் உரையும், அரங்க. வேங்கடாசலம் பிள்ளையால் பரிசோதிக்கப்பட்டுப் பதிப்பிக்கப்பட்டது, கரந்தைத் தமிழ்ச்சங்கப் பதிப்பு, சுக்கில – வைகாசி [1929]'}
                  </p>

                  <p className="font-bold mt-6">{'கல்லாடர் உரைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'தொல்காப்பியம் சொல்லதிகார மூலமும் கல்லாடனார் விருத்தியுரையும் பழைய உரையும், சைவப் புலவர் சித்தாந்த நன்மணி கு. சுந்தரமூர்த்தி எழுதிய விளக்கவுரையுடன் பதிப்பிக்கப்பட்டது, திருநெல்வேலித் தென்னிந்திய சைவசித்தாந்த நூற்பதிப்புக் கழகம், திருநெல்வேலி, 1964'}
                  </p>

                  <p className="font-bold mt-8">{'பொருளதிகாரம்'}</p>
                  <p className="font-bold">{'இளம்பூரணர் உரைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'தொல்காப்பியம் பொருளதிகாரம் அகத்திணையியல் புறத்திணையியல் மூலமும் இளம்பூரணார் உரையும், கா. நமச்சிவாய முதலியாரால் பரிசோதிக்கப்பட்டுச் சென்னை காக்ஸ்டன் பிரஸில் பதிப்பிக்கப்பட்டது, 1920'}
                  </p>
                  <p className="text-justify mt-4">
                    {'தொல்காப்பியம் பொருளதிகாரம் களவியல், கற்பியல், பொருளியல் மூலமும் இளம்பூரணர் உரையும், வ.உ. சிதம்பரம் பிள்ளையால் பரிசோதிக்கப்பட்டு, வாவிள்ள இராமஸ்வாமி சாஸ்த்ருலு அண்ட் ஸன்ஸ் அச்சுக்கூடத்தில் பதிக்கப்பட்டுள்ளது, 1933'}
                  </p>
                  <p className="text-justify mt-4">
                    {'தொல்காப்பியம் பொருளதிகாரம் மெய்ப்பாட்டியல், உவமையியல், செய்யுளியல், மரபியல் மூலமும் இளம்பூரணர் உரையும், வ.உ.சிதம்பரம் பிள்ளையால் பரிசோதிக்கப்பட்டு, வாவிள்ள இராமஸ்வாமி சாஸ்த்ருலு அண்ட் ஸன்ஸ் அச்சுக்கூடத்தில் பதிக்கப்பட்டுள்ளது, 1935'}
                  </p>

                  <p className="font-bold mt-6">{'நச்சினார்க்கினியர் உரைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'தொல்காப்பியம் பொருளதிகார மூலமும் பாரத்துவாசி நச்சினார்க்கினியர் உரையும், யாழ்ப்பாணம் சி.வை. தாமோதரம் பிள்ளையால் பரிசோதிக்கப்பட்டு, சென்னை, ஸ்காட்டிஸ் அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, பார்த்திப – ஆவணி [1885]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'தொல்காப்பியம் பொருளதிகாரம் செய்யுளியல் மூலமும் நச்சினார்க்கினியர் உரையும், ஸேதுஸமஸ்தான வித்வான், ரா. இராகவையங்காரால் பரிசோதிக்கப்பட்டு, மதுரை, தமிழ்ச்சங்க முத்திராசாலையில் பதிப்பிக்கப்பட்டது, 1917'}
                  </p>

                  <p className="font-bold mt-6">{'பேராசிரியர் உரைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'தொல்காப்பியம் பொருளதிகாரம் மெய்ப்பாட்டியல், உவமவியல், செய்யுளியல், மரபியல் மூலமும் நச்சினார்க்கினியர் உரையும், ராவ்பஹதூர் ச. பவானந்தம் பிள்ளையால் பரிசோதிக்கப்பட்டு, லாங்மென்ஸ் க்ரீன் அண்ட் கம்பெனியார் அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, 1917'}
                  </p>

                  <p className="font-bold mt-6">{'தொல்காப்பிய மூலம்'}</p>
                  <p className="text-justify">
                    {'தொல்காப்பியம் - நன்னூல் மூலம், வால்ற்றார் ஜாயீஸ் துரையவர்களுதவியைக் கொண்டு இ. சாமுவேல் பிள்ளையினால் சென்னை மாநகரம் கிறிஸ்து மதக்கியான விளக்கச் சங்கத்தார் அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, 1858'}
                  </p>

                  <div className="text-center font-bold text-maroon text-xl mt-12 mb-4">{'சங்க இலக்கியம்'}</div>

                  <p className="font-bold">{'எட்டுத்தொகை'}</p>
                  <p className="text-justify">
                    {'2. எட்டுத்தொகையிலொன்றாகிய நற்றிணை மூலமும் பின்னத்தூர் நாராயணசாமி ஐயர் அவர்கள் எழுதிய உரையும், மேற்படி உரையாசிரியரால் சென்னபட்டணம் சைவவித்தியாநுபாலன யந்திரசாலையில் அச்சிற்பதிப்பிக்கப்பட்டது, ராக்ஷச – வைகாசி [1915]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'3. எட்டுத்தொகையுள் இரண்டாவதாகிய குறுந்தொகை மூலமும் திருக்கண்ணபுரத் தலத்தான் திருமாளிகைச் சௌரிப்பெருமாளரங்கன் இயற்றிய உரையும், மேற்படி உரையாசிரியரால் வித்யாரத்னாகர அச்சுக்கூடத்திற் பதிப்பித்து வெளியிடப்பட்டது, 1915'}
                  </p>
                  <p className="text-justify mt-4">
                    {'4. எட்டுத்தொகையுள் மூன்றாவதாகிய ஐங்குறுநூறு மூலமும் பழைய உரையும், கும்பகோணம் காலேஜ் தமிழ்ப் பண்டிதராகிய உத்தமதானபுரம் வே. சாமிநாதையரால் பல பிரதிரூபங்களைக் கோண்டு பரிசோதித்து சென்னபட்டணம் வைஜயந்தி அச்சுக்கூடத்திற் பதிப்பிக்கப்பட்டது, சோபகிருது – ஆனி [1903]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'5. எட்டுத்தொகையுள் நான்காவதாகிய பதிற்றுப்பத்து மூலமும் பழைய உரையும், சென்னைப் பிரஸிடென்ஸி காலேஜ் தமிழ்ப் பண்டிதராகிய உத்தமதானபுரம் வே. சாமிநாதையரால் பரிசோதித்துச் சென்னபட்டணம் வைஜயந்தி அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, குரோதி – ஆனி [1904]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'6. எட்டுத்தொகையுள் ஐந்தாவதாகிய பரிபாடல் மூலமும் ஆசிரியர் பரிமேலழகரியற்றிய உரையும், சென்னை, பிரஸிடென்ஸி காலேஜ் தமிழ்ப் பண்டிதராகிய உத்தமதானபுரம் வே. சாமிநாதையரால் பரிசோதித்து, சென்னை, கமர்ஷியல் அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, 1918'}
                  </p>
                  <p className="text-justify mt-4">
                    {'7. நல்லந்துவனார் கலித்தொகை மூலமும் மதுரை பாரத்துவாசி நச்சினார்க்கினியர் உரையும், யாழ்ப்பாணம் சி. வை. தாமோதரம் பிள்ளையவர்களால் பரிசோதிக்கப்பட்டு, சென்னை ஸ்காட்டிஸ் அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது,1887'}
                  </p>
                  <p className="text-justify mt-4">
                    {'8. எட்டுத்தொகையுள் நெடுந்தொகை ஆகும் அகநானூறு மூலமும் பழைய உரையும், ஸேதுஸமஸ்தான வித்வான் உ. வே. ரா. இராகவையங்கார் ஸ்வாமிகள் பரிசோதித்துத் தந்து சென்னை, கம்பர் விலாஸம் வே. இராஜகோபாலையங்காரால் பதிப்பிக்கட்டது, ருதிரோத்காரி [1918]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'9. எட்டுத்தொகையுள் ஒன்றாகிய புறநானூறு மூலமும் உரையும், கும்பகோணம் காலேஜ் தமிழ்ப் பண்டிதராகிய உத்தமதானபுரம் வே. சாமிநாதையரால் பரிசோதித்துச் சென்னை, வெ.நா. ஜூபிலி அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, 1894'}
                  </p>

                  <p className="font-bold mt-8">{'பத்துப்பாட்டு'}</p>
                  <p className="text-justify">
                    {'10. பத்துப்பாட்டு மூலமும் மதுரையாசிரியர் பாரத்துவாசி நச்சினார்க்கினியர் உரையும், கும்பகோணம் காலேஜ் தமிழ்ப் பண்டிதராகிய உத்தமதானபுரம் வே. சாமிநாதையரால் பரிசோதித்து, சென்னை, திராவிடரத்நாகர அச்சுக்கூடத்திற் பதிப்பிக்கப்பட்டது, 1889'}
                  </p>

                  <p className="font-bold mt-8">{'பதினெண்கீழ்க்கணக்கு'}</p>
                  <p className="text-justify">
                    {'20. தெய்வப்புலமை திருவள்ளுவ நாயனார் அருளிச்செய்த திருக்குறள் மூலபாடம், தொண்டமண்டலம் சென்னைப் பட்டினத்தில் தஞ்சை நகரம் மலையப்ப பிள்ளை குமாரன் ஞானப்பிறகாசனால் மாசத்தினச்சரிதையின் அச்சுக்கூடத்தில் அச்சிடப்பட்டது, 1812'}
                  </p>
                  <p className="text-justify mt-4">
                    {'21. முனிவர்களருளிச்செய்த நாலடியார் மூலபாடம், தொண்டமண்டலம் சென்னைப் பட்டினத்தில் தஞ்சை நகரம் மலையப்ப பிள்ளை குமாரன் ஞானப்பிறகாசனால் மாசத்தினச்சரிதையின் அச்சுக்கூடத்தில் அச்சிடப்பட்டது,1812'}
                  </p>
                  <p className="text-justify mt-4">
                    {'22. பூதஞ்சேந்தனார் அருளிச் செய்த இனியது நாற்பது மூலமும் உரையும், சேதுஸம்ஸ்தான வித்வானும் செந்தமிழ்ப் பத்திராசிரியருமான ரா. இராகவையங்காரால் வெளியிடப்பட்டது, மதுரை, தமிழ்ச்சங்க முத்திராசாலைப் பதிப்பு, 1903'}
                  </p>
                  <p className="text-justify mt-4">
                    {'23. சங்கமருவிய சான்றோரிலொருவராகிய பெருவாயின் முள்ளியாரால் அருளிச் செய்யப்பட்ட ஆசாரக்கோவை மூலமும் உரையும், பாளையங்கோட்டை, சிந்தாமணியந்திரசாலையில் பதிப்பிக்கப்பட்டது, 1883'}
                  </p>
                  <p className="text-justify mt-4">
                    {'24. நல்லாதனாரால் செய்யப்பட்ட சங்கமருவிய நீதி நூலாகிய திரிகடுகம், திருக்கோட்டியூர் இராமாநுசாசாரியார் செய்த உரையுடன் நல்லூர் சதாசிவப்பிள்ளையால் சென்னபட்டணம் வர்த்தமானதரங்கிணீசாகை யச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, விபவ - புரட்டாதி [1868]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'25. விளம்பிநாகனார் இயற்றிய நான்மணிக்கடிகை மூலமும் உரையும் பி. வாசுதேவ முதலியாரால் பதிப்பித்து வெளியிடப்பட்டது, 1872'}
                  </p>
                  <p className="text-justify mt-4">
                    {'26. முன்றுறையரையனார் இயற்றிய பழமொழி நானூறு மூலமும் உரையும், சென்னைப் பச்சையப்பன் கல்லூரித் தமிழாசிரியர் தி. செல்வக்கேசவராய முதலியாரால் பரிசோதிக்கப்பட்டுப் பதிப்பிக்கப்பட்டது, சென்னை, எஸ்.பி.சி.கே. பிரஸ், 1917'}
                  </p>
                  <p className="text-justify mt-4">
                    {'27. காரியாசான் செய்த சிறுபஞ்சமூலம் மூலமும் உரையும், சண்முகசுந்தர முதலியாரவர்களால் பரிசோதித்து திரிசிரபுரம் புத்தக வியாபாரம் தி. சபாபதிப்பிள்ளையவர்களது மட்டுவார்குழலாம்பாள் அச்சுக்கூடத்திற் பதிப்பிக்கப்பட்டது, யுவ - மேடரவி [1875]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'28. பொய்கையாரருளிச்செய்த களவழி நாற்பது மூலமும் உரையும், கொன்றமாநகரம் சண்முகசுந்தரமுதலியாரவர்களால் பரிசோதித்து மட்டுவார்குழலாம்பாள் அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, யுவ – மேடரவி [1875]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'29. மதுரைக் கண்ணங்கூத்தனார் செய்த கார்நாற்பது மூலமும் உரையும், சண்முகசுந்தர முதலியாரவர்களால் பரிசோதித்து திரிசிரபுரம் புத்தக வியாபாரம் தி. சபாபதிப்பிள்ளையவர்களது மட்டுவார்குழலாம்பாள் அச்சுக்கூடத்திற் பதிப்பிக்கப்பட்டது, மிதுனரவி [1870]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'30. கபிலராற்செய்த இன்னா நாற்பது மூலமும் உரையும், கொன்றைமாநகரம் சண்முகசுந்தர முதலியார் அவர்களாற் பரிசோதித்து, தி. சபாபதிப்பிள்ளையவர்களது மட்டுவார்குழலாம்பாள் அச்சுக்கூடத்திற் பதிப்பிக்கப்பட்டது, தாது – ஆவணி [1876]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'31. மதுரை சங்கப்புலவருளொருவராகிய கூடலூர் கிழார் இயற்றிய முதுமொழிக் காஞ்சி, உறையூர் மதுரைநாயக முதலியாரல் பார்வையிடப்பட்டுத் திருச்சினாப்பள்ளி வி. பக்கியம் பிள்ளை அண்டு சன்ஸ் அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, 1895'}
                  </p>
                  <p className="text-justify mt-4">
                    {'32. கணிமேதையார் செய்த ஏலாதி மூலமும் உரையும், ஊ. புஷ்பரத செட்டியாரால் தமது கலாரத்நாகர அச்சுக்கூடத்திற் பதிப்பிக்கப்பட்டது, சென்னை, 1887'}
                  </p>
                  <p className="text-justify mt-4">
                    {'33. மாறன்பொறையனார் அருளிச்செய்த ஐந்திணையைம்பது மூலமும் உரையும், சேதுசம்ஸ்தான வித்துவானும் செந்தமிழ்ப் பத்திராசிரியருமாகிய ரா. இராகவையங்காரால் பரிசோதிக்கப்பட்டது, மதுரை, தமிழ்ச்சங்க முத்திராசாலை பதிப்பு, 1903'}
                  </p>
                  <p className="text-justify mt-4">
                    {'34. கணிமேதாவியார் அருளிச்செய்த திணைமாலை நூற்றைம்பது மூலமும் உரையும், சேதுசம்ஸ்தான வித்வானும் செந்தமிழ்ப் பத்திராசிரியருமான ரா. இராகவையங்காரால் பதிப்பிக்கப்பெற்றது, மதுரை, தமிழ்ச்சங்க முத்திராசாலைப் பதிப்பு, 1904'}
                  </p>
                  <p className="text-justify mt-4">
                    {'35. மூவாதியார் செய்த ஐந்திணை யெழுபது மூலமும் உரையும், இலக்கண விளக்க ஆசிரியர் பரம்பரை சோமசுந்தர தேசிகரால் பரிசோதிக்கப்பட்டு வெளியிடப்பட்டது, வஸந்தா அச்சுக்கூடம், மாயூரம், 1926'}
                  </p>
                  <p className="text-justify mt-4">
                    {'36. சாத்தந்தையார் மகனார் கண்ணன் சேந்தனார் அருளிச் செய்த திணைமொழி ஐம்பது மூலமும் பழைய உரையும், இலக்கண விளக்க பரம்பரை சோமசுந்தர தேசிகரால் பரிசோதிக்கப்பட்டு திருவாரூர்த் தமிழ்ச் சங்கத்தாரால் வெளியிடப்பட்டது, திருவாரூர் விக்டோரியா அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, 1918'}
                  </p>
                  <p className="text-justify mt-4">
                    {'37. பதினெண் கீழ்க்கணக்கினுள் கைந்நிலை மூலமும் பழைய உரையும், இடையாற்று மங்கலம் வைத்தீச்சுவரையரவர்கள் குமாரர் அனந்தராமையரால் பரிசோதித்துச் சென்னை, நோபில் அச்சுக்கூடத்தில் பதிப்பிக்கப்பெற்றது, 1931'}
                  </p>

                  <div className="text-center font-bold text-maroon text-xl mt-12 mb-4">{'காப்பியங்கள்'}</div>

                  <p className="font-bold">{'சிலப்பதிகாரப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'38. சிலப்பதிகாரம் புகார்காண்டம், வேனிற்காதை வரையுள்ள மூலம், தி. ஈ. ஸ்ரீநிவாசராகவாசாரியாரால் பு. ம. சபாபதி முதலியாரது கல்விவிளக்க அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, 1872'}
                  </p>
                  <p className="text-justify mt-4">
                    {'சிலப்பதிகாரம் முதலாவது புகார்காண்டம் மூலம், சென்னை பிரெஸிடென்ஸி காலேஜ் தமிழ்ப் பண்டிதராகிய ஈ. ஸ்ரீநிவாசராகவாசாரியாரவர்களால், ஊ. புஷ்பரத செட்டியாரவர்களது கலாரத்நாகரம் என்னும் அச்சுக்கூடத்தில் அச்சிடப்பட்டது, 1876'}
                  </p>
                  <p className="text-justify mt-4">
                    {'சேரர் குலத்துதித்த இளங்கோவடிகள் இயற்றிய பஞ்சகாவியங்களுள் ஒன்றாகிய சிலப்பதிகாரம் புகார் காண்டம் மூலமும் அடியார்க்குநல்லார் உரையும், தமிழ்ப் புலவர் தி. க. சுப்பராய செட்டியாரால் மிமோரியல் அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, விக்கிரம – சித்திரை [1880]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'இளங்கோவடிகளருளிச் செய்த சிலப்பதிகார மூலமும் அடியார்க்கு நல்லார் உரையும் அரும்பதவுரையும், கும்பகோணம் காலேஜ் தமிழ்ப் பண்டிதராகிய உத்தமதானபுரம் வே. சாமிநாதையரால் பரிசோதித்துச் சென்னை வெ.நா. ஜூபிலி அச்சுக்கூடத்தில் பதிப்பிக்கப்பட்டது, 1892'}
                  </p>

                  <p className="font-bold mt-6">{'மணிமேகலைப் பதிப்பு'}</p>
                  <p className="text-justify">
                    {'39. மணிமேகலை (மூலம் மட்டும்) மதுரைக் கூலவாணிகன் சாத்தனார் பாடியது, புரசை அட்டாவதானம் சபாபதி முதலியார் அவர்கள் மாணாக்கர் திருமயிலை சண்முகம்பிள்ளையால் பார்வையிடப்பட்டுச் சென்னை மதராஸ் ரிப்பன் அச்சியந்திரசாலையில் பதிப்பிக்கப்பட்டது, விஜய – தனுர்ரவி [1894]'}
                  </p>
                  <p className="text-justify mt-4">
                    {'கடைச்சங்கப் புலவர்களுள் ஒருவராகிய மதுரைக் கூலவாணிகன் சாத்தனார் அருளிச் செய்த மணிமேகலை மூலமும் கும்பகோணம் கவர்ன்மென்ட் காலேஜ் தமிழ்ப் பண்டிதராகிய உத்தமதானபுரம் வே. சாமிநாதையரெழுதிய அரும்பதவுரையும், உ.வே. சாமிநாதையரால் சென்னை, வெ.நா. ஜூபிலி அச்சுக்கூடத்தில் பதிப்பிக்கப்படது, 1898'}
                  </p>

                  <div className="text-center font-bold text-maroon text-xl mt-12 mb-4">{'இறையனாரகப்பொருள்'}</div>
                  <p className="text-justify">
                    {'40. இறையனாரகப்பொருள், மதுரைக் கணக்காயனார் மகனார் நக்கீரனார் கண்டருளிய உரையோடு யாழ்ப்பாணம் சி.வை. தாமோதரம் பிள்ளையால் பரிசோதிக்கப்பட்டுப் பதிப்பிக்கப்பட்டது, ஸ்காட்டிஸ் அச்சுக்கூடம், சென்னை, சுபானு - சித்திரை [1883]'}
                  </p>

                  <div className="text-center font-bold text-maroon text-xl mt-12 mb-4">{'முத்தொள்ளாயிரம்'}</div>
                  <p className="text-justify">
                    {'41. முத்தொள்ளாயிரச் செய்யுட்கள், ஸேதுஸம்தான வித்துவானும் செந்தமிழ்ப் பத்திராசிரியருமான ரா. இராகவையங்காரால் பரிசோதிக்கப்பெற்றன, மதுரை, தமிழ்ச்சங்க முத்திராசாலைப் பதிப்பு,1905'}
                  </p>

                  {/* Project team (from the old site's உருவாக்கம் page) */}
                  <div className="mt-14 pt-10 border-t border-maroon/10">
                    <div className="text-center font-bold text-maroon text-xl mb-8">{'திட்ட உருவாக்கக் குழு'}</div>
                    <div className="grid grid-cols-1 sm:max-w-md sm:mx-auto lg:max-w-none lg:grid-cols-3 gap-6">
                      {PROJECT_TEAM.map(m => (
                        <div
                          key={m.photo}
                          className="relative bg-ivory/60 border border-maroon/10 rounded-lg p-5 flex flex-col items-center gap-4 text-center shadow-sm"
                        >
                          <div className="absolute top-0 left-0 w-full h-[3px] rounded-t-lg bg-gradient-to-r from-maroon via-gold to-maroon" />
                          <img
                            src={`${API}/images/team/${m.photo}`}
                            alt={m.name}
                            width={112}
                            height={132}
                            loading="lazy"
                            decoding="async"
                            className="w-[112px] h-[132px] shrink-0 object-cover rounded-md border-2 border-gold/40 shadow"
                          />
                          <div className="min-w-0" style={{ fontFamily: '"Noto Sans Tamil", sans-serif' }}>
                            <p className="text-maroon font-bold text-sm leading-snug">{m.role}</p>
                            <p className="text-ink font-bold mt-1.5 leading-snug">{m.name}</p>
                            <p className="text-stone/70 text-sm mt-1 leading-snug">{m.designation}</p>
                            <p className="text-stone/70 text-sm leading-snug">{'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Back to introduction button */}
                  <div className="flex justify-center pt-8 pb-2">
                    <button
                      onClick={() => setShowDetails(false)}
                      className="px-8 py-3 bg-maroon text-white font-bold rounded-md shadow-lg hover:bg-[#5C1A08] hover:shadow-xl transition-all duration-300 active:scale-[0.97]"
                      style={{ fontFamily: '"Noto Sans Tamil", sans-serif', fontSize: '1rem' }}
                    >
                      {'அறிமுகத்திற்குச் செல்க'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>
        </div>

        {/* ── Book Cards ── */}
        <div className="relative mt-20 mb-20 py-16 overflow-hidden">
          {/* Pandya Corner Ornaments strictly around Archived Collections section */}
          <PandyaCorner className="top-0 left-0" />
          <PandyaCorner className="top-0 right-0" style={{ transform: 'scaleX(-1)' }} />
          <PandyaCorner className="bottom-0 left-0" style={{ transform: 'scaleY(-1)' }} />
          <PandyaCorner className="bottom-0 right-0" style={{ transform: 'scale(-1)' }} />

          <div className="mx-auto w-[95%] max-w-[1700px] relative z-10 px-6">
            <div className="flex items-center justify-between mb-16 relative z-10">
              <div className="flex-1 text-center">
                {/* Golden divider line ornament above */}
                <div className="flex justify-center mb-4">
                  <img src="/images/gold_divider.png" alt="divider" className="h-4 object-contain opacity-100 contrast-125" />
                </div>
                <div className="flex items-center justify-center gap-1">
                  <TitleFlourishLeft />
                  <h2 className="font-cinzel text-3xl md:text-4xl text-maroon font-bold tracking-wider">
                    {t('நூல் தொகுப்புகள்', 'Archived Collections')}
                  </h2>
                  <TitleFlourishRight />
                </div>
                <div className="flex justify-center my-4">
                  <img src="/images/gold_divider.png" alt="divider" className="h-4 object-contain opacity-100 contrast-125" />
                </div>
              </div>
              <div className="hidden md:flex absolute right-0 bottom-4 text-[10px] font-bold text-bronze uppercase tracking-[0.3em] items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                {ebooks.length} {t('நூல்கள்', 'Volumes Available')}
              </div>
            </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-10 h-10 border-2 border-maroon/10 border-t-gold rounded-full animate-spin" />
              <p className="font-cinzel text-bronze text-[10px] tracking-[0.4em] animate-pulse">
                {t('பதிவிறக்கம் செய்கிறது...', 'ACCESSING ARCHIVES...')}
              </p>
            </div>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 xl:gap-10 relative z-10 px-2 md:px-6 lg:px-10 xl:px-16 2xl:px-24"
            >
              {ebooks.map((book) => (
                <Link
                  key={book.id}
                  to={book.book_url || '#'}
                  className="no-underline text-inherit"
                >
                  <motion.div
                    variants={fadeUp}
                    className="group bg-[#FFF8F0] border border-[#C9973B]/40 shadow-[0_4px_12px_-2px_rgba(60,20,5,0.08),_0_12px_32px_-4px_rgba(201,151,59,0.2)] hover:shadow-[0_8px_20px_-4px_rgba(60,20,5,0.12),_0_20px_45px_-8px_rgba(201,151,59,0.35)] transition-all duration-300 rounded-xl flex flex-col h-full hover:-translate-y-2 relative overflow-hidden"
                  >
                    {/* Corner Ornaments */}
                    <CornerOrnament position="top-left" />
                    <CornerOrnament position="top-right" />
                    <CornerOrnament position="bottom-left" />
                    <CornerOrnament position="bottom-right" />

                    {/* Book Cover */}
                    <div className="relative bg-transparent flex items-center justify-center p-8 pb-4 pt-10 overflow-hidden">
                      {getBookCover(book) ? (
                        <div className="w-[95%] max-w-[280px] aspect-[2/3] shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-transform duration-300 group-hover:scale-[1.04]">
                          <FallbackImg
                            src={getBookCover(book)}
                            alt={book.title_tamil}
                            loading="lazy" decoding="async"
                            className="w-full h-full object-contain pointer-events-none"
                            fallback={<span className="text-4xl">📜</span>}
                          />
                        </div>
                      ) : (
                        <div className="text-5xl opacity-20">📜</div>
                      )}
                      
                      {/* Year badge - kept from original EBooks for info */}
                      <div className="absolute top-3 right-3 bg-maroon text-gold text-[9px] font-bold px-2 py-0.5 shadow-lg opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 rounded-sm z-10">
                        {book.first_edition_year || 'N.A.'}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-8 pb-8 pt-4 flex flex-col flex-1 relative mt-auto">
                      <div className="flex justify-between items-end gap-2 mb-4">
                        <div className="flex-1">
                          <h3 className="tamil-label text-xl text-maroon font-black mb-1 line-clamp-2 min-h-[3rem]">
                            {book.title_tamil}
                          </h3>
                          <p className="font-cinzel text-xs text-stone/50 uppercase tracking-widest font-bold">
                            {book.title_english}
                          </p>
                        </div>
                      </div>

                      {book.description_tamil && (
                        <p className="tamil-text text-[13px] text-stone/60 leading-relaxed line-clamp-3 mb-6 font-medium italic">
                          {t(book.description_tamil, book.description_english)}
                        </p>
                      )}

                      <div className="mt-auto pt-4 border-t border-gold/20 flex items-center justify-between">
                        <span className="text-[9px] text-stone/40 font-cinzel font-bold tracking-[0.2em]">
                          {t('ஆவணம்', 'VOL. ARCHIVE')}
                        </span>
                        <span className="text-maroon text-[10px] font-bold group-hover:text-gold transition-colors tracking-[0.2em] uppercase flex items-center gap-1">
                          {t('படிக்க', 'READ')} <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

export default EBooks;
