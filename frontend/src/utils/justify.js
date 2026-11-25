/**
 * justify.js — justified paragraphs in which words are never split and letters are not
 * visibly spaced apart. Works on paragraphs with formatting inside (bold, links, small text).
 *
 * Browser justification of Tamil text either opens wide gaps (a long word that does not fit
 * leaves its line short), spaces out the letters of words (text-justify: inter-character), or
 * needs hyphens. Here instead:
 *   1. every word of the paragraph is measured;
 *   2. the line breaks are chosen for the whole paragraph at once (as typesetting programs
 *      do), so the spare width is shared evenly by the lines; a line may also close up a
 *      little so one more word fits;
 *   3. each line except the last is made exactly as wide as the paragraph: a tiny, invisible
 *      amount between the letters (at most MAX_LETTER px, the same on the whole line), the
 *      rest in the spaces between the words.
 * Words are never broken (no "-" at a line end; words written with a hyphen stay whole).
 * Laid out again when the width changes and when a font has loaded. On narrow screens
 * (below MIN_SCREEN px, phones) a line holds only a few long Tamil words, so the paragraph
 * is left as ordinary left-aligned text there.
 *
 * Elements handled are marked data-jt; utils/tamilHyphenation.js leaves them alone.
 */

const MAX_LETTER = 0.35;   // px added between letters, at most (not visible at reading size)
const MIN_LETTER = -0.2;   // px: letters may close up this much, to fit one more word
const MIN_SPACE = 0.65;    // a space may shrink to this part of its width, to fit one more word
const MIN_SCREEN = 0;      // justified on every screen size, phones included

const SHY = /­/g;
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('ta', { granularity: 'grapheme' }) : null;
const graphemes = (s) => (segmenter ? [...segmenter.segment(s)].length : s.length);

// Best line breaks for words of the given widths (sum of cubes of how much each line's
// spaces must widen or shrink; the last line is free).
function breakLines(words, space, width) {
  const n = words.length;
  const best = new Array(n + 1).fill(Infinity);
  const from = new Array(n + 1).fill(0);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    let w = -space;
    let c = 0;
    for (let i = j - 1; i >= 0; i--) {
      w += words[i].w + space;
      c += words[i].c;
      const gaps = j - 1 - i;
      let cost;
      if (w > width) {
        const shrink = gaps * space * (1 - MIN_SPACE) + c * -MIN_LETTER * 0.7;
        if (w - width > shrink) { if (i < j - 1) break; cost = 0; }
        else cost = 2 * ((w - width) / shrink) ** 3 + 0.5;
      } else if (j === n) {
        cost = 0;
      } else {
        const slack = Math.max(0, width - w - c * MAX_LETTER * 0.7);
        const stretch = gaps ? slack / gaps / space : (slack > 1 ? 50 : 0);
        cost = stretch ** 3 + 0.5;
      }
      if (best[i] + cost < best[j]) { best[j] = best[i] + cost; from[j] = i; }
    }
  }
  const lines = [];
  for (let j = n; j > 0; j = from[j]) lines.unshift([from[j], j]);
  return lines;
}

// Wrap every word piece and every space of the element in a span; returns the segments
// (runs of words between forced line breaks), each a list of words { pieces, spaceAfter }.
function tokenize(el) {
  const texts = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n);
  for (const node of texts) {
    // (a no-break space U+00A0 joins what it stands between into one word)
    const parts = node.nodeValue.replace(SHY, '').split(/([ \t\n\r\f]+)/);
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      const s = document.createElement('span');
      if (/^[ \t\n\r\f]+$/.test(part)) { s.className = 'jt-s'; s.textContent = ' '; }
      else { s.className = 'jt-w'; s.textContent = part; }
      frag.appendChild(s);
    }
    node.parentNode.replaceChild(frag, node);
  }
  // In document order: word pieces, spaces and forced breaks
  const segments = [[]];
  let word = null;
  let pendingSpace = null;
  const all = el.querySelectorAll('span.jt-w, span.jt-s, br');
  for (const t of all) {
    const seg = segments[segments.length - 1];
    if (t.tagName === 'BR') {
      if (pendingSpace) pendingSpace.style.display = 'none';
      pendingSpace = null; word = null;
      segments.push([]);
    } else if (t.classList.contains('jt-s')) {
      if (!word) { t.style.display = 'none'; continue; }     // leading / repeated space
      if (pendingSpace) pendingSpace.style.display = 'none';
      pendingSpace = t;
      word.spaceAfter = t;
      word = null;
    } else {
      if (!word) {
        word = { pieces: [], spaceAfter: null };
        seg.push(word);
        pendingSpace = null;
      }
      word.pieces.push(t);
    }
  }
  // a space after the last word of a segment is not shown
  for (const seg of segments) {
    const last = seg[seg.length - 1];
    if (last && last.spaceAfter) { last.spaceAfter.style.display = 'none'; last.spaceAfter = null; }
  }
  return segments.filter((s) => s.length);
}

function layoutBlock(el) {
  el.innerHTML = el.__jtOriginal;
  const cs = getComputedStyle(el);
  const width = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (window.innerWidth < MIN_SCREEN || width < 120) {
    el.setAttribute('data-jt', 'plain');
    // whole words only: words written with a hyphen stay on one line
    const texts = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/\S-\S/.test(n.nodeValue)) texts.push(n);
    for (const node of texts) {
      const frag = document.createDocumentFragment();
      node.nodeValue.split(/(\S*-\S*)/).forEach((part, i) => {
        if (!part) return;
        if (i % 2) {
          const s = document.createElement('span');
          s.style.whiteSpace = 'nowrap';
          s.textContent = part;
          frag.appendChild(s);
        } else frag.appendChild(document.createTextNode(part));
      });
      node.parentNode.replaceChild(frag, node);
    }
    return;
  }
  el.setAttribute('data-jt', 'on');
  const segments = tokenize(el);
  const range = document.createRange();
  // Measured on screen, then divided by any scaling of the page section (entrance animations
  // scale boxes for a moment; the layout must use the real, unscaled widths)
  const scale = el.offsetWidth ? (el.getBoundingClientRect().width / el.offsetWidth) || 1 : 1;
  const widthOf = (node) => { range.selectNodeContents(node); return range.getBoundingClientRect().width / scale; };
  let spaceSum = 0;
  let spaceCount = 0;
  for (const seg of segments) {
    for (const wd of seg) {
      wd.w = 0; wd.c = 0;
      for (const p of wd.pieces) { wd.w += widthOf(p); wd.c += graphemes(p.textContent); }
      if (wd.spaceAfter) { wd.space = widthOf(wd.spaceAfter); spaceSum += wd.space; spaceCount++; }
    }
  }
  const space = spaceCount ? spaceSum / spaceCount : 4.5;

  for (const seg of segments) {
    const lines = breakLines(seg, space, width);
    lines.forEach(([a, b], k) => {
      const lineWords = seg.slice(a, b);
      const lastLine = k === lines.length - 1;
      // the space at the end of the line becomes the line break
      const end = lineWords[lineWords.length - 1];
      if (!lastLine && end.spaceAfter) {
        end.spaceAfter.style.display = 'none';
        end.spaceAfter.insertAdjacentElement('afterend', document.createElement('br'));
      }
      const gapsEls = lineWords.slice(0, -1).map((wd) => wd.spaceAfter).filter(Boolean);
      const words = lineWords.reduce((s, wd) => s + wd.w, 0);
      const spacesNatural = lineWords.slice(0, -1).reduce((s, wd) => s + (wd.space || 0), 0);
      const delta = width - (words + spacesNatural);
      // the last line keeps its natural spacing, unless it was given one word more than fits
      if (lastLine && delta >= 0) return;
      // letters
      let wordsNow = words;
      if (Math.abs(delta) > 0.3) {
        const step = delta > 0 ? MAX_LETTER : MIN_LETTER;
        const pieces = lineWords.flatMap((wd) => wd.pieces);
        const set = (v) => { for (const p of pieces) p.style.letterSpacing = `${v}px`; };
        set(step);
        let after = pieces.reduce((s, p) => s + widthOf(p), 0);
        const gained = after - words;
        // letters take at most a share of the line's spare width; the spaces take the rest
        const share = Math.abs(delta) * (gapsEls.length ? 0.6 : 1);
        if (Math.abs(gained) > share && Math.abs(gained) > 0.01) {
          set((step * share / Math.abs(gained)).toFixed(3));
          after = pieces.reduce((s, p) => s + widthOf(p), 0);
        } else if (!gapsEls.length && delta < 0 && after > width && Math.abs(gained) > 0.01) {
          // one word wider than the box (narrow phones): close its letters up just enough
          // to fit, at most 1px
          set(Math.max(-1, step * (width - words) / gained).toFixed(3));
          after = pieces.reduce((s, p) => s + widthOf(p), 0);
          if (after > width - 0.5) {
            // still wider (a very long word on a small phone): that word only is set a
            // little smaller, just enough to fit (at most 15% smaller); never split
            const factor = Math.max(0.85, (width - 0.5) / after);
            for (const p of pieces) p.style.fontSize = `${(parseFloat(getComputedStyle(p).fontSize) * factor).toFixed(2)}px`;
            after = pieces.reduce((s, p) => s + widthOf(p), 0);
          }
        }
        wordsNow = after;
      }
      // spaces: exact widths so the line fills the paragraph
      if (gapsEls.length) {
        // half a pixel short of the edge (invisible), so rounding never pushes the last word
        // of the line onto the next line
        const each = (width - wordsNow - 0.5) / gapsEls.length;
        for (const g of gapsEls) {
          g.style.display = 'inline-block';
          g.style.width = `${Math.max(0, each).toFixed(3)}px`;
        }
      }
    });
  }
}

const blocks = new Set();
let fontsHooked = false;

/** Justify the element (a p / li / div with inline content). Returns a function to stop. */
export function justifyBlock(el) {
  if (!el || typeof window === 'undefined') return () => {};
  // The original content is taken only from content this module has not laid out yet (React
  // may run this twice for the same element; the second run must not read the laid-out lines)
  if (el.__jtOriginal == null || el.innerHTML !== el.__jtOutput) el.__jtOriginal = el.innerHTML.replace(SHY, '');
  let lastKey = '';
  let frame = 0;
  let waiting = false;
  let loadTried = false;
  const run = (force) => {
    if (!el.isConnected || !el.clientWidth) return;
    // Measure only in the real font: until it has loaded, show ordinary justified text
    if (document.fonts && document.fonts.check) {
      const cs = getComputedStyle(el);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const sample = el.textContent.slice(0, 80) || 'அ';
      let ready = true;
      try { ready = document.fonts.check(font, sample); } catch { ready = true; }
      if (!ready && !loadTried) {
        if (!el.getAttribute('data-jt')) el.setAttribute('data-jt', 'wait');
        if (!waiting) {
          waiting = true;
          // one attempt; if the font cannot be loaded the paragraph is laid out anyway
          const timeout = new Promise((r) => setTimeout(r, 3000));
          Promise.race([document.fonts.load(font, sample).catch(() => {}), timeout])
            .then(() => { waiting = false; loadTried = true; requestAnimationFrame(() => run(true)); });
        }
        return;
      }
    }
    const key = `${window.innerWidth < MIN_SCREEN ? 'n' : 'w'}${el.clientWidth}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    layoutBlock(el);
    el.__jtOutput = el.innerHTML;
  };
  el.__jtRun = run;
  run(true);
  const ro = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => run(false)); })
    : null;
  if (ro) ro.observe(el);
  blocks.add(el);
  if (!fontsHooked && document.fonts) {
    fontsHooked = true;
    const again = () => requestAnimationFrame(() => blocks.forEach((b) => b.__jtRun && b.__jtRun(true)));
    document.fonts.ready.then(again);
    document.fonts.addEventListener('loadingdone', again);
  }
  return () => {
    if (ro) ro.disconnect();
    cancelAnimationFrame(frame);
    blocks.delete(el);
    // Put the original content back, unless React has already replaced it with new content
    if (el.innerHTML === el.__jtOutput) {
      el.innerHTML = el.__jtOriginal;
      el.removeAttribute('data-jt');
    }
    el.__jtOriginal = null;
    el.__jtOutput = null;
  };
}

/** Copy handler: selected justified text as running sentences, without line breaks. */
export function installJustifyCopy() {
  if (typeof document === 'undefined' || window.__suvadiJustifyCopy) return;
  window.__suvadiJustifyCopy = true;
  document.addEventListener('copy', (e) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !e.clipboardData) return;
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const host = (node.nodeType === 1 ? node : node.parentElement);
    if (!host || !(host.closest('[data-jt="on"]') || host.querySelector?.('[data-jt="on"]'))) return;
    // a single line break is a line of the justified layout; a blank line separates paragraphs
    e.clipboardData.setData('text/plain', sel.toString().replace(/([^\n])\n(?=[^\n])/g, '$1 ').replace(/­/g, ''));
    e.preventDefault();
  });
}
