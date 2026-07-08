import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getBookCover } from '../utils/bookCovers';

const API = 'http://localhost:3001';

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
        <div className="absolute left-[4%] top-1/2 -translate-y-1/2 w-[24vw] max-w-[320px] min-w-[200px] pointer-events-none select-none hidden xl:block z-10">
          <img src="/images/book_transparent.png" alt="Ancient book and manuscripts with quill" className="w-full h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />
        </div>

        {/* Right Hero Illustration - South Indian Dravidian Temple line-art */}
        <div className="absolute right-[4%] top-1/2 -translate-y-1/2 w-[22vw] max-w-[280px] min-w-[180px] pointer-events-none select-none hidden xl:block z-10 opacity-30">
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

            <h1 className="font-cinzel text-5xl md:text-7xl text-white font-bold tracking-wide" style={{ textShadow: '0 0 60px rgba(201,151,59,0.15)' }}>
              {t('செவ்வியல் நூல்கள்', 'Classical Tamil Texts')}
            </h1>

            {/* Gold divider ornament image */}
            <div className="flex justify-center my-4">
              <img src="/images/gold_divider.png" alt="divider ornament" className="h-6 object-contain opacity-80" />
            </div>

            <p className="tamil-body text-white/75 max-w-2xl mx-auto leading-loose text-lg font-medium">
              {t(
                'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் பட்டியலிட்டுள்ள செவ்வியல் நூல்களும் அவற்றுக்கான ஓலைச்சுவடி வகைகளும்.',
                'A comprehensive repository of Classical Tamil primary texts identified by the Institute, including their corresponding digital manuscript archives.'
              )}
            </p>

            {texts.length > 0 && (
              <div className="inline-block px-6 py-2 border border-gold/30 bg-gold/5 rounded-sm">
                <span className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-gold font-bold">
                  {texts.length} {t('செவ்வியல் நூல்கள்', 'Primary Texts')}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </header>

      {/* ── Introduction Section ── */}
      <section className="relative py-10 md:py-14 bg-[#FAF8F2]">
        <div className="w-[92%] lg:w-[95%] max-w-[1600px] mx-auto px-0 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white border border-gold/20 shadow-[0_8px_40px_rgba(201,151,59,0.12),0_2px_8px_rgba(60,20,5,0.06)] rounded-sm overflow-hidden"
          >
            {/* Top accent bar */}
            <div className="h-[3px] w-full bg-gradient-to-r from-maroon via-gold to-maroon" />

            <div className="px-6 md:px-10 lg:px-14 py-8 md:py-10">

              {/* Section label */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-gold/50" />
                <span className="font-cinzel text-[10px] uppercase tracking-[0.5em] text-gold/70 font-bold">
                  {t('செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil')}
                </span>
                <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-gold/50" />
              </div>

              {/* Page title */}
              <h2 className="font-cinzel text-2xl md:text-3xl lg:text-4xl text-maroon font-bold mb-3 text-center tracking-wide">
                {t('செம்மொழித் தமிழ் நூல்களின் முதல் அச்சுப் பதிப்புகள்', 'First Print Editions of Classical Tamil Texts')}
              </h2>

              {/* Gold divider */}
              <div className="flex justify-center my-6">
                <img src="/images/gold_divider.png" alt="divider" className="h-4 object-contain opacity-70" />
              </div>

              {/* ── அறிமுகம் — Introduction ── */}
              <h3 className="font-cinzel text-base md:text-lg text-maroon font-black uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
                <span className="text-gold/60">◆</span>
                {t('அறிமுகம்', 'Introduction')}
              </h3>

              <div className="space-y-5 tamil-body text-stone/80 text-base md:text-[1.0625rem] leading-[1.9] md:leading-[2.1] font-medium text-justify">
                <p>
                  {t(
                    'தமிழின் தொன்மை, தனித்தன்மை, தமிழர்களின் நாகரிகம், பண்பாடு ஆகியவற்றின் சிறப்புகளைக் கவனத்தில் கொண்டு பல்வேறு வெளியீடுகளைக் கொண்டுவருவதைச் செம்மொழி நிறுவனம் குறிக்கோளாகக் கொண்டுள்ளது. இந்த வகையில் பழந்தமிழ் நூல்களை வெளியிடுதல், செம்மொழித் தமிழ் தொடர்பான தகவல்களை வழங்குதல் முதலான பணிகளை நிறுவனம் மேற்கொண்டுள்ளது. அந்த வகையில் செம்மொழித் தமிழுக்கு ஆதாரமாக உள்ள 41 நூல்களின் முதல் அச்சுப் பதிப்புகளை ஆவணப்படுத்திச் செம்மொழித் தமிழாய்வு நிறுவனம் வெளியிடுகிறது.',
                    'Focusing on the antiquity, uniqueness, civilisation, and culture of the Tamils, the Central Institute of Classical Tamil aims to bring out various publications. In this regard, the Institute has undertaken tasks such as publishing ancient Tamil texts and providing information related to Classical Tamil. The Institute is now documenting and publishing the first print editions of the 41 primary texts that serve as the foundation of Classical Tamil.'
                  )}
                </p>
                <p>
                  {t(
                    'செவ்வியல் தகுதிப்பாட்டிற்கான நூல்களைப் பாதுகாத்துக் கையளித்துவந்த தமிழ்ப் புலமை மரபிற்கும், உரையாசிரியர்கள், பதிப்பாசிரியர்களுக்கும், உலகளாவிய நிலையில் தமிழ்ச் சுவடிகளையும், நூல்களையும் பாதுகாத்து வரும் நிறுவனங்களுக்கும் தமிழ்ச் சமூகம் எப்போதும் நன்றிபாராட்ட கடமைப்பட்டுள்ளது.',
                    'The Tamil society is forever indebted to the Tamil scholarly tradition, commentators, publishers who have preserved and handed down texts of classical merit, and to the institutions worldwide that preserve Tamil manuscripts and books.'
                  )}
                </p>
                <p>
                  {t(
                    '41 செவ்வியல் நூல்களின் அச்சுப் பதிப்புகளைச் செம்மொழித் தமிழாய்வு மத்திய நிறுவனத்திற்கு வழங்கியுதவிய மறைமலையடிகள் நூலகம், டாக்டர் உ.வே. சாமிநாதையர் நூல்நிலையம், ரோஜா முத்தையா ஆராய்ச்சி நூலகம், தமிழ்ப் பல்கலைக்கழக நூலகம், தமிழ் இணையக் கல்விக்கழக மின்நூலகம் உள்ளிட்ட நூலகத்தார்களுக்கும், ஆய்வாளர்களுக்கும் செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் நன்றி பாராட்டி மகிழ்கிறது.',
                    'The Central Institute of Classical Tamil expresses its profound gratitude to the libraries — including Maraimalai Adigal Library, Dr. U.V. Swaminatha Iyer Library, Roja Muthiah Research Library, Tamil University Library, and Tamil Virtual Academy Library — as well as to researchers who generously provided the first print editions of the 41 classical texts to the Institute.'
                  )}
                </p>
              </div>

              {/* ── பதிப்புக் குறிப்புகள் — Publication Notes ── */}
              <div className="my-10 border-t border-gold/20" />

              <h3 className="font-cinzel text-base md:text-lg text-maroon font-black uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
                <span className="text-gold/60">◆</span>
                {t('பதிப்புக் குறிப்புகள்', 'Publication Notes')}
              </h3>

              <div className="space-y-5 tamil-body text-stone/80 text-base md:text-[1.0625rem] leading-[1.9] md:leading-[2.1] font-medium text-justify">
                <p>
                  {t(
                    'தமிழ்ச் செவ்வியல் நூல்களுள் திருக்குறள், நாலடியார் ஆகிய இரு நூல்களே முதன் முதலாக அச்சு வடிவம் பெற்றன. 1812இல் தஞ்சை நகரைச் சேர்ந்த மலையப்பப் பிள்ளையின் மகனாகிய ஞானப்பிரகாசன் எனும் அறிஞர் திருக்குறள், நாலடியார் இரண்டையும் ஒன்றாக இணைத்து அச்சிட்டு வெளியிட்டார். அதனுடன் திருவள்ளுவமாலை மூலமும் இடம்பெற்றிருந்தது.',
                    'Among the Classical Tamil texts, Thirukkural and Naladiyar were the first to be printed. In 1812, a scholar named Gnanaprakasan — son of Malaiyappa Pillai of Thanjavur — printed and published Thirukkural and Naladiyar together as a single volume, which also included the Thiruvalluvamalai source text.'
                  )}
                </p>
                <p>
                  {t(
                    'தொல்காப்பியத்தின் அச்சுப் பதிப்பு வரலாறு மழைவை மகாலிங்கையர் பதிப்பித்து வெளியிட்ட எழுத்ததிகார நச்சினார்க்கினியர் உரைப் பதிப்பிலிருந்து தொடங்குகிறது. 1847ஆம் ஆண்டு மகாலிங்கையரின் பதிப்பு வெளிவந்தது. நச்சினார்க்கினியர் உரைப் பதிப்பில் தொடங்கிய தொல்காப்பிய அச்சுப் பதிப்பு வரலாறு 1935ஆம் ஆண்டு வ.உ. சிதம்பரம் பிள்ளை பதிப்பித்து வெளியிட்ட தொல்காப்பிய இளம்பூரணர் உரைப் பதிப்போடு முதல் கட்ட பதிப்பு வரலாறு நிறைவுகொண்டிருக்கிறது.',
                    'The print history of Tolkappiyam begins with the Ezhuttatikara Nacchinarkiniyar commentary edition published by Mazhaivai Mahalingaiyar in 1847. This history of Tolkappiyam print editions concludes its first phase with the Ilamporanar commentary edition published by V.O. Chidambaram Pillai in 1935.'
                  )}
                </p>
                <p>
                  {t(
                    'சங்க இலக்கிய நூல்களுள் முதன் முதலாக அச்சு வடிவம் பெற்ற நூல் கலித்தொகை ஆகும். 1887ஆம் ஆண்டு சி.வை. தாமோதரம் பிள்ளை நச்சினார்க்கனியர் உரையுடன் கலித்தொகையைப் பதிப்பித்து வெளியிட்டதன் வழியாகச் சங்க இலக்கியப் பதிப்பு வரலாறு தொடங்குகிறது. கலித்தொகைக்கு முன்னரே பத்துப்பாட்டினுள் ஒன்றாகிய திருமுருகாற்றுப்படைக்குப் பல அச்சுப் பதிப்புகள் வெளிவந்துள்ளன. அப்பதிப்புகளைப் பத்துப்பாட்டின் முழுமையான பதிப்பாகக் கொள்ளமுடியாத நிலையில், சங்க இலக்கிய நூல்களுள் முதன் முதலாக அச்சுவடிவம் பெற்ற நூலாகக் கலித்தொகை அமைகிறது.',
                    'Among Sangam literary texts, Kalithokai was the first to be printed. The print history of Sangam literature begins with C.V. Damodaram Pillai\'s publication of Kalithokai with Nacchinarkiniyar\'s commentary in 1887. Although Thirumurugaatruppadai (one of the Pattuppattu) had received multiple print editions before Kalithokai, since those cannot be considered a complete edition of Pattuppattu, Kalithokai stands as the first Sangam literary text to attain print form.'
                  )}
                </p>
                <p>
                  {t(
                    '1872ஆம் ஆண்டில் சிலப்பதிகாரமும் 1894ஆம் ஆண்டில் மணிமேகலையும் முதன் முதலாக அச்சுவடிவம் பெற்றன. 1883இல் இறையனார் களவியலுரைக்கும், 1905இல் முத்தொள்ளாயிரத்திற்கும் முதல் அச்சுப் பதிப்பு வெளிவந்துள்ளன.',
                    'Silappadikaram received its first print edition in 1872, and Manimekalai in 1894. The first print editions of Irayanarar Kalaviyalurai and Muthollayiram appeared in 1883 and 1905 respectively.'
                  )}
                </p>
                <p>
                  {t(
                    'தொல்காப்பியம், சங்க இலக்கியம், காப்பிய நூல்களுக்கான முதல் அச்சுப் பதிப்புகளைக் கண்டறிவதில் நமக்குச் சிக்கல் ஏதும் ஏற்படவில்லை. கீழ்க்கணக்கு நூல்களுள் திருக்குறள், நாலடியார் நூல்களைத் தவிர்த்து ஏனைய நூல்களின் முதல் அச்சுப் பதிப்புகளைக் கண்டறிவதில் பெருஞ்சிரமம் ஏற்படுகிறது. இதனால் கிடைத்திருக்கிற கீழ்க்கணக்கு நூல்களுக்கான அச்சுப் பதிப்புகளில் மிகவும் காலத்தால் மூத்த பதிப்புகளை முதல் பதிப்பாகக் கருதி இங்குத் தரப்பட்டுள்ளன.',
                    'Identifying the first print editions of Tolkappiyam, Sangam literature, and epic texts posed no significant difficulty. However, tracing the first print editions of Keezhakanakku texts — other than Thirukkural and Naladiyar — has been considerably challenging. Consequently, the oldest available print editions for Keezhakanakku texts have been recorded here as the first editions.'
                  )}
                </p>
                <p>
                  {t(
                    'கீழ்க்கணக்கு நூல்களில் இங்குத் தரப்பட்டுள்ள அச்சுப் பதிப்புகளுக்கும் காலத்தால் முன்னரான பதிப்புகள் இருப்பதாகத் தகவல்கள் மட்டும் கிடைக்கின்றன; அச்சுப் பதிப்புகள் எங்கும் கிடைக்கப்பெறவில்லை. அதனால் அதற்கடுத்தடுத்த நிலையில் வெளிவந்த அச்சுப் பதிப்புகள் இங்குத் தரப்பட்டுள்ளன.',
                    'For some Keezhakanakku texts listed here, there is only historical information indicating earlier print editions existed; the actual copies are no longer traceable. In such cases, the next earliest available print editions have been recorded.'
                  )}
                </p>
                <p>
                  {t(
                    'ஐந்திணையெழுபது நூல் பழையுரையுள்ள 26 பாடல்களை மட்டும் மு. இராகவையங்கார் 1906இல் செந்தமிழில் வெளியிட்டிருக்கிறார். அவை முழுமையான பதிப்பாகக் கருதமுடியாத நிலையில் அதன் பின்னர் 1926இல் வெளிவந்த சோமசுந்தர தேசிகர் பதிப்பை முதல் பதிப்பாகக் கொண்டு இங்குத் தரப்பட்டுள்ளது.',
                    'M. Ragavaiyengar published only 26 songs of Ainthanaiyezhupathu with old commentary in Senthamizh in 1906. Since that cannot be considered a complete edition, the Somasundara Desika edition published in 1926 has been recorded here as the first edition.'
                  )}
                </p>
                <p>
                  {t(
                    'இனியவை நாற்பது முகவை இராமாநுச கவிராயரால் 1844இல் அச்சிட்டு வெளியிட்டிருப்பதாக ஒரு தகவலுண்டு. அந்த அச்சுப் பதிப்பு எங்கும் கிடைக்கப்பெறாமையால் 1903இல் வெளிவந்த ரா. இராகவையங்கார் பதிப்பு இங்குத் தரப்பட்டுள்ளது.',
                    'There is a record that Iniyavai Narpathu was printed and published by Mukavai Ramanuja Kavirayar in 1844. Since that edition is not traceable anywhere, the 1903 edition by Ra. Ragavaiyengar has been recorded here.'
                  )}
                </p>
                <p>
                  {t(
                    'பழமொழி நானூற்றை 1874இல் சோடசாவதானம் சுப்பராயசெட்டியார் பதிப்பித்து வெளியிட்டதாகத் தகவல் உள்ளது; இப்போது அப்பதிப்பு கிடைக்கப்பெறாமையால் 1917இல் வெளிவந்த தி. செல்வகேசவராயர் பதிப்பும், ஆசாரக்கோவைக்குத் தில்லையம்பூர் சந்திசேகர கவிராஜ பண்டிதர் 1857இல் அச்சுப் பதிப்பை வெளியிட்டிருக்கிறார் என்ற தகவல் மட்டும் உள்ள நிலையில், 1883இல் வெளிவந்த அச்சுப் பதிப்பும் இங்குத் தரப்பட்டுள்ளன.',
                    'Pazhamozhi Nanuru was reportedly published by Sodasavadhanam Subbarayasettiyar in 1874; since that edition is no longer available, the 1917 edition by T. Selvakesavarayar has been recorded. Similarly, for Asarakkovai, there is only a record that Thillayambur Chandrasekhara Kaviraja Pandithar published an edition in 1857; in its absence, the 1883 edition has been recorded here.'
                  )}
                </p>
                <p>
                  {t(
                    'ஏனைய கீழ்க்கணக்கு நூல்களின் அச்சுப் பதிப்புகள் முதல் பதிப்பாகக் கருதத்தக்கனவாகும். இந்த அச்சுப் பதிப்புகளுக்கும் மேலான பழைய அச்சுப் பதிப்புகளை வைத்திருப்பவர்களாயினும், அறிந்திருப்பவர்களாயினும் அவை பற்றிய தகவலைச் செம்மொழித் தமிழாய்வு நிறுவனத்திற்குத் தெரிவித்து உதவினால் இப்பதிப்புப் பட்டியலை மேம்படுத்த உதவியாக இருக்கும்.',
                    'The print editions of the remaining Keezhakanakku texts may be considered as their first editions. If anyone possesses or has knowledge of earlier print editions of any of these texts, sharing that information with the Central Institute of Classical Tamil would greatly help in improving this publication list.'
                  )}
                </p>
              </div>

              {/* Lower decorative ornament */}
              <div className="flex justify-center mt-12 mb-10">
                <img src="/images/gold_divider.png" alt="divider" className="h-4 object-contain opacity-60" />
              </div>

              {/* Action Button */}
              <div className="flex justify-center pb-4">
                <Link to="/ebooks" onClick={() => window.scrollTo(0, 0)} className="inline-flex items-center gap-3 bg-gradient-to-r from-maroon to-[#4A0A0A] text-white px-8 py-3.5 rounded border border-gold/40 shadow-lg hover:shadow-gold/20 hover:-translate-y-1 transition-all duration-300 font-cinzel font-bold tracking-widest text-sm uppercase group">
                  {t('மின்நூல்களை ஆராய்க', 'Explore E-Books')} 
                  <span className="text-gold text-lg group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>

            {/* Bottom accent bar */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ClassicalTexts;
