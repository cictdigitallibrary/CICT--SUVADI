const normalizeText = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0B80-\u0BFF]/g, " ") // Keep alphanumeric and Tamil block
    .replace(/\s+/g, " ")
    .trim();
};

const getTokens = (text) => normalizeText(text).split(" ");

// Basic synonym/alias dictionary
const ALIASES = {
  // English to Tamil entities
  "tholkappiyam": "தொல்காப்பியம்",
  "tolkappiyam": "தொல்காப்பியம்",
  "sanga": "சங்க இலக்கியம்",
  "sangam": "சங்க இலக்கியம்",
  "ettuthogai": "எட்டுத்தொகை",
  "pathupattu": "பத்துப்பாட்டு",
  "pathinenkilkanakku": "பதினெண்கீழ்க்கணக்கு",
  "kappiyangal": "காப்பியங்கள்",
  "muthollayiram": "முத்தொள்ளாயிரம்",
  "silappadikaram": "சிலப்பதிகாரப் பதிப்பு",
  "silappathikaram": "சிலப்பதிகாரப் பதிப்பு",
  "manimegalai": "மணிமேகலைப் பதிப்பு",
  "manimekalai": "மணிமேகலைப் பதிப்பு",
  "thirukkural": "திருக்குறள்",
  "tirukkural": "திருக்குறள்",
  
  // Intents
  "author": "ஆசிரியர்",
  "who wrote": "ஆசிரியர்",
  "writer": "ஆசிரியர்",
  "published": "பதிப்பகம்",
  "publisher": "பதிப்பகம்",
  "press": "அச்சகம்",
  "printed": "அச்சகம்",
  "year": "ஆண்டு",
  "when": "ஆண்டு",
  "count": "எண்ணிக்கை",
  "how many": "எண்ணிக்கை",
  "how much": "எண்ணிக்கை",
  "list": "பட்டியல்",
  "what are": "பட்டியல்"
};

const expandQuery = (query) => {
  let expanded = query;
  Object.keys(ALIASES).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    if (regex.test(expanded)) {
      expanded += " " + ALIASES[key];
    }
  });
  return normalizeText(expanded);
};

const CONTEXT_PRONOUNS = [
  "it", "they", "them", "those", "these", "its", "their",
  "of it", "under it", "categories of it",
  "category", "items", "details", "ones", "names", "more", "about",
  "அவை", "இவை", "அது", "இது", "அவற்றின்", "இவற்றின்", "விவரங்கள்", "அவைகள்"
];

const hasContextPronoun = (rawQuery) => {
  const norm = normalizeText(rawQuery);
  return CONTEXT_PRONOUNS.some(p => norm.includes(p));
};

const scoreMatch = (queryTokens, targetText) => {
  if (!targetText) return 0;
  const targetNorm = normalizeText(targetText);
  let score = 0;
  
  queryTokens.forEach(token => {
    if (token.length > 2 && targetNorm.includes(token)) {
      score += token.length;
    }
  });
  return score;
};

module.exports = { normalizeText, getTokens, expandQuery, scoreMatch, ALIASES, CONTEXT_PRONOUNS, hasContextPronoun };
