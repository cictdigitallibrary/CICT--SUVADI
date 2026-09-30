const normalizeText = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0B80-\u0BFF]/g, " ") // Keep alphanumeric and Tamil block
    .replace(/\s+/g, " ")
    .trim();
};

const getTokens = (text) => normalizeText(text).split(" ");

// English to Tamil entity mapping
const ALIASES = {
  "tholkappiyam": "தொல்காப்பியம்",
  "tolkappiyam": "தொல்காப்பியம்",
  "sanga": "சங்க இலக்கியம்",
  "sangam": "சங்க இலக்கியம்",
  "ilakkanam": "இலக்கணம்",
  "grammar": "இலக்கணம்",
  "ilakkiyam": "இலக்கியம்",
  "literature": "இலக்கியம்",
  "ettuthogai": "எட்டுத்தொகை",
  "pathupattu": "பத்துப்பாட்டு",
  "pathinenkilkanakku": "பதினெண் கீழ்க்கணக்கு",
  "pathinen": "பதினெண் கீழ்க்கணக்கு",
  "kappiyam": "காப்பியம்",
  "kappiyangal": "காப்பியம்",
  "epics": "காப்பியம்",
  "epic": "காப்பியம்",
  "muthollayiram": "முத்தொள்ளாயிரம்",
  "silappadikaram": "சிலப்பதிகாரம்",
  "silappathikaram": "சிலப்பதிகாரம்",
  "manimegalai": "மணிமேகலை",
  "manimekalai": "மணிமேகலை",
  "thirukkural": "திருக்குறள்",
  "tirukkural": "திருக்குறள்"
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
  "அவை", "இவை", "அது", "இது", "அவற்றின்", "இவற்றின்", "விவரங்கள்", "அவைகள்", "அவற்றில்",
  "one", "that", "எந்த", "எதில்",
  "idhula", "adhula", "avanga", "indha", "andha", "adhoda", "idhoda",
  "idhu", "adhu"
];

const FILLER_WORDS = [
  "what", "is", "under", "about", "tell", "me", "show", "give", "list", "are", "the", "in", "for", "a", "an", "know", "want", "to", "i", "can", "you",
  "பற்றி", "சொல்", "காட்டு", "என்ன", "எவை", "யாவை",
  "sollu", "kudu", "pathi", "enna", "iruku", "irukku", "aachu", "yaaru", "edhu"
];

const hasContextPronoun = (rawQuery) => {
  const norm = normalizeText(rawQuery);
  const tokens = norm.split(' ');
  return CONTEXT_PRONOUNS.some(p => tokens.includes(p));
};

const COMMON_SUFFIXES = [
  "la", "il", "ila", "ku", "ukku", "oda", "gal", "kal",
  "ல", "ல்", "க்கு", "உக்கு", "கள்", "இல்", "இல"
];

const stripSuffixes = (token) => {
  let stripped = token;
  for (const suf of COMMON_SUFFIXES) {
    if (stripped.endsWith(suf) && stripped.length > suf.length + 2) {
      stripped = stripped.slice(0, -suf.length);
    }
  }
  return stripped;
};

const scoreMatch = (queryTokens, targetText) => {
  if (!targetText) return 0;
  const targetNorm = normalizeText(targetText);
  const targetWords = targetNorm.split(' ').filter(w => w.length > 2);
  let score = 0;

  queryTokens.forEach(token => {
    if (token.length <= 2) return;
    
    const simplifiedToken = token.replace(/(.)\1+/g, '$1');

    if (targetNorm === token || targetNorm === simplifiedToken) {
      score += token.length * 2;
      return;
    }
    
    const exactWordRegex = new RegExp(`(^|\\s)${token}(\\s|$)`);
    if (exactWordRegex.test(targetNorm)) {
      score += token.length * 1.5;
      return;
    }

    if (targetNorm.includes(token) || targetNorm.includes(simplifiedToken)) {
      score += token.length;
      return;
    }

    const strippedToken = stripSuffixes(token);
    const strippedSimplified = stripSuffixes(simplifiedToken);

    for (const tw of targetWords) {
      const strippedTw = stripSuffixes(tw);
      
      if (strippedToken.startsWith(strippedTw) || strippedTw.startsWith(strippedToken) || 
          strippedSimplified.startsWith(strippedTw) || strippedTw.startsWith(strippedSimplified)) {
        if (strippedToken.length >= 4) {
          score += tw.length * 0.8;
          break;
        }
      }
    }
  });

  return score;
};

const INTENT_MAPPINGS = {
  count: ["ethana", "ethanai", "evlo", "evalo", "evvalavu", "how many", "how much", "count", "எத்தனை", "எவ்வளவு", "எண்ணிக்கை", "total"],
  list: ["list", "what are", "யாவை", "names", "show", "categories", "enumerate", "என்னென்ன", "peru", "names", "all"],
  author: ["author", "who wrote", "writer", "ஆசிரியர்", "ezhudhunadhu", "ezhudhniyavar", "ezhuthiyavar"],
  publisher: ["published", "publisher", "press", "printed", "பதிப்பகம்", "அச்சகம்", "publish aachu", "publish", "veliyita", "veliyeedu", "veliyeettalar"],
  year: ["year", "when", "ஆண்டு", "varusham", "varudam"],
  detail: ["detail", "details", "description", "more", "விவரங்கள்", "விவரம்", "about", "pathi", "information"]
};

const detectIntent = (tokens) => {
  const normStr = tokens.join(' ');
  const simplifiedStr = normStr.replace(/(.)\1+/g, '$1');

  for (const [intent, keywords] of Object.entries(INTENT_MAPPINGS)) {
    for (const kw of keywords) {
      const simplifiedKw = kw.replace(/(.)\1+/g, '$1');
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      const simplifiedRegex = new RegExp(`\\b${simplifiedKw}\\b`, 'i');
      
      if (regex.test(normStr) || simplifiedRegex.test(simplifiedStr)) {
        return intent;
      }
    }
  }
  return null;
};

const detectAllIntents = (tokens) => {
  const normStr = tokens.join(' ');
  const simplifiedStr = normStr.replace(/(.)\1+/g, '$1');
  const intents = [];

  for (const [intent, keywords] of Object.entries(INTENT_MAPPINGS)) {
    for (const kw of keywords) {
      const simplifiedKw = kw.replace(/(.)\1+/g, '$1');
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      const simplifiedRegex = new RegExp(`\\b${simplifiedKw}\\b`, 'i');
      
      if (regex.test(normStr) || simplifiedRegex.test(simplifiedStr)) {
        intents.push(intent);
        break;
      }
    }
  }
  return intents;
};

// Check for language explicitly to assist debugging
const detectLanguage = (tokens) => {
  const text = tokens.join(' ');
  const hasTamil = /[\u0B80-\u0BFF]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);
  
  if (hasTamil && hasEnglish) return 'Mixed';
  if (hasTamil) return 'Tamil';
  return 'English/Tanglish';
};

module.exports = { 
  normalizeText, 
  getTokens, 
  expandQuery, 
  scoreMatch, 
  ALIASES, 
  CONTEXT_PRONOUNS, 
  FILLER_WORDS, 
  hasContextPronoun, 
  detectIntent,
  detectAllIntents,
  detectLanguage
};
