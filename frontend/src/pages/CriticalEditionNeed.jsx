import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const CriticalEditionNeed = () => {
  const { t } = useLanguage();

  return (
    <div className="pt-32 pb-20 bg-ivory min-h-screen">
      <header className="py-20 bg-maroon text-white relative overflow-hidden text-center">
         <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
         <div className="container mx-auto px-6 relative z-10">
            <h1 className="text-4xl md:text-6xl font-playfair italic leading-tight">
              {t('செம்பதிப்பின் தேவை', 'செம்பதிப்பின் தேவை')}
            </h1>
         </div>
      </header>

      <div className="container mx-auto px-6 max-w-4xl py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-lg prose-stone max-w-none"
        >
          <section className="mb-16">
            <p className="tamil-text text-xl text-stone/80 leading-relaxed mb-6">
              தரம்வாய்ந்த மிகப்பழம் பதிப்புக்களில் கூடப் பொருந்தாப்பாடம், எழுத்துப்பிழை, புணர்ச்சிப்பிழை, சீர்ப்பிறழ்வு, அடிப்பிறழ்வு போன்றவை அருகியும் பரவலாகவும் காணப்படுகின்றன. செவ்வியல் நூல்களை உயர்தரமுடையனவாகவும் பிழை பிறழ்வுகளினின்றும் நீங்கினவாகவும் பாடம் உறுதி செய்து பதிப்பித்தல் இன்றியமையாதது. ஆகவே ஆய்வு நோக்கில் செம்பதிப்புப் பெரிதும் பயன்பாடு உடையது.
            </p>
            <p className="tamil-text text-xl text-stone/80 leading-relaxed mb-6">
              மரபுவழிப் புணர்ச்சிகளை மேற்கொள்ளல், சீர்பிரித்து யாப்பமைதி கெடாதவாறு வடிவமைத்தல் ஆகியவற்றின் அடிப்படையில் செம்பதிப்புக்கள் அமையுமாதலின் அவற்றை வெளியிடுவதன் மூலம் பழந்தமிழ் மரபுகள் பாதுகாக்கப்படும்.
            </p>
            <p className="tamil-text text-xl text-stone/80 leading-relaxed mb-6">
              செம்பதிப்பு நூற்கள், உலக அளவிலும் தமிழக அளவிலும் ஆராய்ச்சி செய்வதற்கு ஏற்ற அடிப்படை ஆய்வுக்களங்களாக அமையும்.
            </p>
            <p className="tamil-text text-xl text-stone/80 leading-relaxed mb-6">
              தரப்படுத்தப்பட்ட பதிப்புக்கள் வெளிவருங்கால், பள்ளி, கல்லூரி, பல்கலைக்கழகப் பாடத்திட்டங்களில், பிழையும் பிறழ்வுமற்ற பழந்தமிழ் நூற்பகுதிகளைப் பயில வாய்ப்பு ஏற்படும்.
            </p>
            <p className="tamil-text text-xl text-stone/80 leading-relaxed mb-6">
              எல்லாப் பழந்தமிழ் நூல்களும் எழுத்தமைதி, கட்டுக்கோப்பு, நூற்கட்டமைப்பு போன்றவற்றில் ஒரே சீரினவாகச் சீரமைக்கப்படல், ஒருவகை அழகுணர்ச்சியைத் தோற்றுவிப்பதொடு பயில்வோர்க்கு ஈடுபாடு ஏற்படவும் உதவும்.
            </p>
          </section>

          <section className="mb-16">
            <h2 className="text-3xl font-playfair text-maroon border-b border-maroon/10 pb-4 mb-8">
               செம்பதிப்புப் பணி - மூன்று கட்டங்கள்
            </h2>
            
            <div className="mb-6">
              <h3 className="text-2xl font-playfair text-maroon mb-4">
                I. சுவடிகளையும் பதிப்புக்களையும் கண்டறிந்து தொகுத்தல்
              </h3>
              <p className="tamil-text text-xl text-stone/80 leading-relaxed">
                அட்டவணைகளின் அடிப்படையில் தேடிக் கண்டறிந்த சுவடிகளை மின்படி (Scan) எடுத்தல். மூன்று,நான்கு ஏடுகளை வரிசையாக அடுக்கிப் படம் எடுத்தல், அவற்றைத் தனித்தனிப் பக்கங்களாகப் பிரித்தமைத்தல், தனிப்பக்கங்களைத் தூய்மை செய்து (Colour correction) படி எடுத்தல் என்று இது அமையும். சுவடிகளின் மின்படிகளை விரைந்து படிப்பதற்கு ஏதுவாகத் தேவையான பக்கங்கள் மற்றும் பாடல்களை உடனே திரைக்குக் கொண்டுவரும் வகையில் உரிய மென்பொருள் உருவாக்கப்பட்டுள்ளது.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-playfair text-maroon mb-4">
                II. பாடவேறுபாட்டுத் தரவுகளைத் தொகுத்தலும் பட்டியலிடுதலும்.
              </h3>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-playfair text-maroon mb-4">
                III. சரியான பாடங்களையும் யாப்பு மற்றும் புணர்ச்சி அமைவுகளையும் உறுதி செய்து வரையறுத்தலும் மீட்டுருவாக்கம் செய்தலும்.
              </h3>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-3xl font-playfair text-maroon border-b border-maroon/10 pb-4 mb-8">
               செம்பதிப்பின் தனித்தன்மைகள்
            </h2>
            <p className="tamil-text text-xl text-stone/80 leading-relaxed mb-6">
              எல்லா மூலச்சுவடிகளிலும் அனைத்துப் பதிப்புக்களிலும் உரைமேற்கோள்களிலும் இடம்பெறும் அனைத்துப் பாடவேறுபாடுகளையும் ஒருங்குதிரட்டித்தருதலால் செம்மொழித் தமிழாய்வு மத்திய நிறுவனம் வெளியிடும் செம்பதிப்பு வேறு எப்பதிப்பையும் விடத் தனித்தன்மை வாய்ந்ததாகிறது. பிற பதிப்புகளில் பாடம் உறுதி செய்து, அதற்கான காரணங்கள் விரிவாக விளக்கப்படவில்லை. செம்பதிப்பு பாடத் தேர்வு விளக்கங்கள் பெற்றிருத்தலால் தனிச்சிறப்புப் பெறுகிறது. வரையறுக்கப்பட்ட யாப்பு வடிவங்களை மேற்கொள்ளுதலும் மரபுவழிப்பட்ட சரியான புணர்ச்சிகளை எய்திநிற்றலும் யாப்பும் புணர்ச்சியும் இறுதி செய்யப்பட்டமைக்கான விளக்கங்களைப் பெற்றிருத்தலும் செம்பதிப்பை ஒப்புயர்வற்றதாக உயர்த்துகின்றன. பதிப்புக்களையும், சுவடிகளையும் குலவரிசைப்படுத்தித் தருவது, பொதுவாகத் தமிழ்ப் பதிப்புலகில் காணப்படாத பெருமை சான்றது. 
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default CriticalEditionNeed;
