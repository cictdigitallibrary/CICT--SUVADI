import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

// The site opens in English. A visitor's own choice (made with the language toggle)
// is remembered under this key. The older 'suvadi_lang' key is not used: it was
// written on every page load, so it held 'ta' even for visitors who never chose Tamil.
const CHOICE_KEY = 'suvadi_lang_choice';
const DEFAULT_LANGUAGE = 'en';

const savedChoice = () => {
  try {
    const v = localStorage.getItem(CHOICE_KEY);
    return v === 'ta' || v === 'en' ? v : null;
  } catch { return null; }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => savedChoice() || DEFAULT_LANGUAGE);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Changing the language is an explicit choice: remember it
  const setLanguage = (value) => {
    setLanguageState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      try { localStorage.setItem(CHOICE_KEY, next); } catch { /* storage unavailable */ }
      return next;
    });
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ta' ? 'en' : 'ta');
  };

  const t = (ta, en) => language === 'ta' ? ta : (en || ta);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
