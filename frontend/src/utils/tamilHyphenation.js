/**
 * tamilHyphenation.js — even justified Tamil text on narrow screens.
 *
 * Tamil words are long. In a justified paragraph on a phone a line often holds only two or
 * three words, and the space left over is spread between them as wide gaps. Browsers hyphenate
 * Tamil only partly (Chrome) or not at all (Safari, Firefox), so this module marks the places
 * where a long Tamil word may be broken, with invisible soft hyphens (U+00AD). The browser
 * breaks a word there only when it ends a line, and shows a hyphen at that point; otherwise
 * nothing changes on screen.
 *
 * Break rules (between letters, i.e. a consonant with its vowel sign or pulli):
 * - only in words of 5 or more letters, at least 2 letters on each side;
 * - never before a consonant with pulli (a Tamil line cannot start with one, e.g. not "பதி-ப்பு");
 * - க்ஷ and ஸ்ரீ stay together.
 *
 * Applied to justified reading text only: .text-justify, .faculty-article-p, .search-intro-p.
 * Copying text from the page gives the words without the soft hyphens.
 */

const SELECTOR = '.text-justify, .faculty-article-p, .search-intro-p';
const SHY = '­';
const PULLI = '்';
const TAMIL_WORD = /[஀-௿­]{6,}/g;

const isMark = (c) => (c >= 0x0BBE && c <= 0x0BCD) || c === 0x0BD7;

function letters(word) {
  const out = [];
  for (const ch of word) {
    if (isMark(ch.codePointAt(0)) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  // Keep conjuncts together: க்ஷ, ஸ்ரீ
  for (let i = out.length - 2; i >= 0; i--) {
    if ((out[i] === 'க்' && out[i + 1].startsWith('ஷ')) || (out[i] === 'ஸ்' && out[i + 1].startsWith('ர'))) {
      out.splice(i, 2, out[i] + out[i + 1]);
    }
  }
  return out;
}

// The part carried to the next line: 2 or more letters, or one consonant with a vowel sign
// (ஆராய்ச்-சி, பதிப்புக்-கள்), never a lone pulli consonant or bare vowel.
function canEnd(l, i) {
  const rest = l.length - i;
  if (rest >= 2) return true;
  return rest === 1 && l.length >= 5 && /[ா-ௌ]$/.test(l[i]);
}

export function hyphenateTamilWord(word) {
  if (word.includes(SHY)) return word;
  const l = letters(word);
  if (l.length < 5) return word;
  let out = l[0];
  for (let i = 1; i < l.length; i++) {
    if (i >= 2 && canEnd(l, i) && !l[i].endsWith(PULLI)) out += SHY;
    out += l[i];
  }
  return out;
}

function hyphenateElement(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue;
    if (!text || text.length < 6) continue;
    const next = text.replace(TAMIL_WORD, hyphenateTamilWord);
    if (next !== text) n.nodeValue = next;
  }
}

function hyphenateAll() {
  document.querySelectorAll(SELECTOR).forEach(hyphenateElement);
}

export function installTamilHyphenation() {
  if (typeof document === 'undefined' || window.__suvadiTamilHyphenation) return;
  window.__suvadiTamilHyphenation = true;

  // Pages render and change text after load: re-apply shortly after any change.
  // Re-applying is a no-op for text already marked, so this does not loop.
  let timer = null;
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; hyphenateAll(); }, 60);
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();

  // Copy without the soft hyphens
  document.addEventListener('copy', (e) => {
    const sel = window.getSelection();
    const text = sel ? sel.toString() : '';
    if (!text.includes(SHY) || !e.clipboardData) return;
    e.clipboardData.setData('text/plain', text.replace(/­/g, ''));
    e.preventDefault();
  });
}
