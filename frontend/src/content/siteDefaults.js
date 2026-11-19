/**
 * siteDefaults.js — the editable sections of the public pages, with their built-in content.
 *
 * Each page has a fixed set of sections (shown in this order in the admin):
 *   section — a content window: a heading (optional) and rich text, per language.
 *             Inside the text, headings, paragraphs, lists and tables keep the page's own
 *             design (each page explains how in `help`).
 *   fields  — short texts / numbers (e.g. the home page counts, the search window labels).
 *   list    — the rows of a list page (the 41 classical texts).
 * An empty English text shows the Tamil one, as on the page before.
 * The built-in content is the pages' original text (long texts: defaults/extracted.json,
 * read from the original page sources). What the admin publishes replaces it.
 *
 * BANNERS: built-in image and text of each banner placement (sizes: backend lib/siteContent.js).
 */
import X from './defaults/extracted.json';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const p = (html) => `<p>${html}</p>`;
const section = (label, ta, en, extra = {}) => ({ kind: 'section', label, heading: true, ta, en, ...extra });
const fields = (label, list, extra = {}) => ({ kind: 'fields', label, fields: list, ...extra });
const f = (key, label, ta, en = '', extra = {}) => ({ key, label, ta, en, ...extra });

// ── Home ─────────────────────────────────────────────────────────────────────
const facultyHtml = X.faculty.map(b => (b.type === 'list'
  ? `<ol>${b.items.map(it => `<li>${it.id ? `<a href="/publication/${it.id}">${esc(it.ta)}</a>` : esc(it.ta)}</li>`).join('')}</ol>`
  : p(esc(b.ta)))).join('');

const home = {
  label: 'Home', path: '/',
  sections: {
    article: section('Content window — சுவடியியல் புலம்',
      { title: 'சுவடியியல் புலம்', body: facultyHtml }, { title: '', body: '' },
      { help: 'The heading above the window and its text. A numbered list is shown as the list of critical editions (each item can be a link).' }),
    stats: fields('Counts', [
      f('palm', 'ஓலைச்சுவடிகள் (Digitized Palm Leaf Manuscripts)', '96215', '', { single: true }),
      f('paper', 'காகித சுவடிகள் (Digitized Paper Manuscripts)', '39061', '', { single: true }),
      f('total', 'மொத்த சுவடிகள் (Total Digitized Manuscripts)', '135276', '', { single: true }),
    ], { help: 'The three numbers below the content window.' }),
  },
};

// ── செம்பதிப்பின் தேவை (/classical-texts) ─────────────────────────────────────
const steps = `<ol>${X.ctSteps.map(s => `<li><strong>${esc(s.title)}</strong>${s.paras.map(p).join('')}</li>`).join('')}</ol>`;
const boxHelp = 'One box of the page. A numbered list is shown as numbered step boxes (Ⅰ, Ⅱ, Ⅲ…; the bold first line of an item is its heading).';
const classicalTexts = {
  label: 'செம்பதிப்பின் தேவை', path: '/classical-texts',
  sections: {
    hero: fields('Top banner', [
      f('label', 'Small label', 'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil'),
      f('title', 'Heading', 'செம்பதிப்பின் தேவை', 'Classical Tamil Texts'),
    ]),
    need: section(`Box 1 — ${X.ctBox1.title}`, { title: X.ctBox1.title, body: X.ctBox1.paras.map(p).join('') }, { title: '', body: '' }, { help: boxHelp }),
    phases: section(`Box 2 — ${X.ctBox2Title}`, { title: X.ctBox2Title, body: steps }, { title: '', body: '' }, { help: boxHelp }),
    unique: section(`Box 3 — ${X.ctBox3.title}`, { title: X.ctBox3.title, body: X.ctBox3.paras.map(p).join('') }, { title: '', body: '' }, { help: boxHelp }),
  },
};

// ── செவ்வியல் நூல்கள் (/classical-texts-list) ──────────────────────────────────
const classicalTextsList = {
  label: 'செவ்வியல் நூல்கள்', path: '/classical-texts-list',
  sections: {
    hero: fields('Top banner', [
      f('label', 'Small label', 'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', 'Central Institute of Classical Tamil'),
      f('title', 'Heading', 'செவ்வியல் நூல்கள்', 'Classical Tamil Texts'),
    ]),
    intro: section('Introductory lines',
      { title: '', body: p('செவ்வியல் நூல்கள் என வரையறுக்கப்பட்டவை அனைத்தும் கி.பி. 6 ஆம் நூற்றாண்டிற்கு முந்தியவை.') + p('41 செவ்வியல் நூல்கள் கீழே குறிப்பிடப்பட்டுள்ளன.') },
      { title: '', body: '' }, { heading: false }),
    texts: {
      kind: 'list', label: 'List of classical texts',
      help: 'Each row is a heading, a sub-heading, a text (Tamil name and English transliteration; numbered automatically) or a gap.',
      title: { ta: 'செவ்வியல் நூல்கள் - Classical Tamil texts', en: '' },
      rows: X.textsList.map(l => (l.type === 'space' ? { type: 'gap' }
        : l.type === 'heading1' ? { type: 'heading', ta: l.text, en: '' }
          : l.type === 'heading2' ? { type: 'subheading', ta: l.text, en: '' }
            : { type: 'item', ta: l.ta, en: l.en })),
    },
  },
};

// ── Manuscript search (/search) ───────────────────────────────────────────────
const searchIntro = (lang) => {
  const ta = lang === 'ta';
  const parts = [
    p('ஆய்வாளர்கள் எளிதாகச் செவ்வியல் சுவடிகளைப் படிப்பதற்கும், பாடவேறுபாடு கண்டறிவதற்கும் ஏற்றவாறு இணைய வழிச் சுவடித் தேடலில் பாடலின் எண்ணிட்டுத் தேடும் வசதியும் பாடலின் குறிப்பிட்ட ஏதெனும் ஒரு சொல்லைக் கொண்டு தேடும் முறையும் உருவாக்கப்பட்டுள்ளது.'),
    p('To enable researchers to easily read classical manuscripts and identify textual variations, an online manuscript search has been developed with the facility to search by entering the song number and a method to search using any specific word from the song.'),
    `<ol>${X.searchSteps.map(s => `<li>${esc(s.ta)}<br><small>${esc(s.en)}</small></li>`).join('')}</ol>`,
    '<h3>தேடல் குறிப்புகள் / Search Notes:</h3>',
    X.searchNotes.map((n, i) => p(`<strong>${i + 1}. ${esc(n.ta_title)}</strong> ${esc(n.ta)}`) + p(`<small><strong>${esc(n.en_title)}</strong> ${esc(n.en)}</small>`)).join(''),
    `<h3>${ta ? 'இந்த சுவடித் தேடலில் பதிவேற்றம் செய்யப்பட்டடுள்ள ஓலைச்சுவடிகள் விபரம்:' : 'Details of palm-leaf manuscripts uploaded in this search:'}</h3>`,
    `<table><thead><tr>${(ta ? ['நூல் தலைப்பு', 'செவ்வியல் நூல்', 'செம்மொழி நிறுவனக் குறுந்தகடு எண்', 'எண்ணிக்கை'] : ['Book Title', 'Classical Text', 'CICT CD Number', 'Count']).map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
      X.searchTable.map(r => `<tr><td>${esc(ta ? r.title_ta : r.title_en)}</td><td>${esc(ta ? r.text_ta : r.text_en)}</td><td>${esc(ta ? r.cd_ta : r.cd_en)}</td><td>${esc(r.count)}</td></tr>`).join('')}</tbody></table>`,
    p(ta ? 'மேலும் பல மின்படியாக்கப்பட்ட சுவடிகள், இத்தேடலில் பதிவேற்றம் செய்யப்படும்.' : 'More digitized manuscripts will be uploaded in this search.'),
  ];
  return parts.join('');
};
const search = {
  label: 'Manuscript Search', path: '/search',
  sections: {
    intro: section('Content window — செவ்வியல் சுவடித் தேடல்',
      { title: 'செவ்வியல் சுவடித் தேடல் (Online Classical Tamil Manuscripts Search Engine)', body: searchIntro('ta') },
      { title: '', body: searchIntro('en') },
      { help: 'The whole description window shown before the search opens. A numbered list = the numbered steps; a paragraph in small text = the English line under the Tamil one; a heading = a section heading; the table keeps the page’s table design (rows can be added / removed with the table buttons).' }),
    searchbox: fields('Search window — சுவடித் தேடல்', [
      f('open', 'Button that opens the search', 'சுவடித் தேடல்', 'Search Manuscripts'),
      f('heading', 'Search window heading', 'சுவடித் தேடல்', 'Manuscript Search'),
      f('back', 'Back button', 'விளக்கத்திற்குத் திரும்ப', 'Back to Description'),
      f('hints', 'Hints button', 'தேடல் குறிப்புகள்', 'Search Hints'),
      f('hints-title', 'Hints — heading', 'தேடல் குறிப்புகள்', 'Search Hints'),
      f('hint1-title', 'Hint 1 — title', 'எண் வழித் தேடல்:', 'Search by Number:'),
      f('hint1-text', 'Hint 1 — text', 'தேடலுக்குரிய செவ்வியல் நூலின் பாடல்/ நூற்பா எண்ணைக் கொடுப்பதன் மூலம் உரிய சுவடியின் பக்கம் கிடைக்கப்பெறும்.', 'By entering song/nūṟpā number you can get the particular page of the manuscript.', { multiline: true }),
      f('hint2-title', 'Hint 2 — title', 'பாடலின் குறிப்பிட்ட சொல் வழித் தேடல்:', 'Search by Word:'),
      f('hint2-text', 'Hint 2 — text', 'தேடலுக்குரிய செவ்வியல் நூல் பாடலின் குறிப்பிட்ட சொல்லைக் கொடுப்பதன் மூலம் உரிய சுவடியின் பக்கம் கிடைக்கப் பெறும்.', 'By entering any word of the verse you can get the particular page of the manuscript.', { multiline: true }),
      f('book', 'Step 1 label', 'நூல் தலைப்பு', 'Book Title'),
      f('text', 'Step 2 label', 'செவ்வியல் நூல்', 'Classical Text'),
      f('manuscript', 'Step 3 label', 'சுவடித் தேர்வு', 'Manuscript Selection'),
      f('query', 'Search box label', 'எண் / பாடலின் குறிப்பிட்ட சொல்', 'Number / Specific Word from Verse'),
      f('submit', 'Search button', 'தேடுக', 'Search'),
    ], { help: 'The texts of the search window (Tamil and English).' }),
  },
};

// ── E-Books (/ebooks) ─────────────────────────────────────────────────────────
const ebooksIntroHtml = X.ebooksIntro.map(b => `<h3>${esc(b.title)}</h3>${b.paras.map(p).join('')}`).join('');
const ebooksDetailsHtml = X.ebooksDetails.sections.map(s => `<h3>${esc(s.title)}</h3>${s.html}`).join('');
const ebooks = {
  label: 'E-Books', path: '/ebooks',
  sections: {
    intro: section('அறிமுகம் window',
      { title: 'செம்மொழித் தமிழ் நூல்களின் முதல் அச்சுப் பதிப்புகள் - அறிமுகம்', body: ebooksIntroHtml }, { title: '', body: '' },
      { help: 'Each heading in the text starts a new box with that title (அறிமுகம், பதிப்புக் குறிப்புகள்).' }),
    details: section('அச்சுப் பதிப்புகளின் வெளியீட்டு விவரம் window',
      { title: X.ebooksDetails.heading, body: ebooksDetailsHtml }, { title: '', body: '' },
      { help: 'The heading is also the button on the அறிமுகம் window. In the text: a heading is a centred title (தொல்காப்பியம்…), a sub-heading a main division, a paragraph in bold a sub-heading. The project team cards stay at the end.' }),
  },
};

// ── Team (/team) ──────────────────────────────────────────────────────────────
// Photos: /images/team/… are served by the backend, other /images/… by the website itself,
// /api/site-banners/file/… are photos uploaded in the admin.
const m = (photo, name_ta, name_en, title_ta, title_en) => ({ photo, name_ta, name_en, title_ta, title_en });
const team = {
  label: 'Team', path: '/team',
  sections: {
    members: {
      kind: 'members', label: 'Team members — சுவடியியல் புலக்குழு',
      help: 'One member per row, shown on the page from top to bottom in this order: photo, post, name. Photos are shown in an upright frame (recommended 600 × 720 pixels, JPEG / PNG / WebP, up to 8 MB).',
      rows: [
        m('/images/team/director.jpg', 'பேராசிரியர் இரா. சந்திரசேகரன்', 'Prof. Ra. Chandrasekaran', 'இயக்குநர்', 'Director'),
        m('/images/registrar.png', 'முனைவர் ரெ. புவனேஸ்வரி', 'Dr. Re. Bhuvaneswari', 'பதிவாளர்', 'Registrar'),
        m('/images/team/arulmani.jpg', 'முனைவர் இரா. அருள்மணி', 'Dr. Ra. Arulmani', 'ஒருங்கிணைப்பாளர் & ஆராய்ச்சி அலுவலர்', 'Coordinator & Research Officer'),
        m('/images/team/tamilvannan.jpg', 'முனைவர் ம. தமிழ்வாணன்', 'Dr. M. Tamilvannan', 'இளநிலை ஆராய்ச்சி அலுவலர்', 'Junior Research Officer'),
        m('/images/team/karumbu.jpg', 'முனைவர் சே. கரும்பாயிரம்', 'Dr. Se. Karumpaayiram', 'இளநிலை ஆராய்ச்சி அலுவலர்', 'Junior Research Officer'),
        m('/images/team/nagarajan.jpg', 'முனைவர் ம. நாகராஜன்', 'Dr. M. Nagarajan', 'இளநிலை ஆராய்ச்சி அலுவலர்', 'Junior Research Officer'),
        m('/images/Murugaswaminathan.jpg', 'திரு. அ. முருக சுவாமிநாதன்', 'Mr. A. Muruga Swaminathan', 'நிரலாளர்', 'Programmer'),
        m('/images/team/aruloli.jpg', 'திரு. தி.ஞா. அருள்ஒளி', 'Mr. Ti. Gna. Arulolli', 'தரவு உள்ளீட்டாளர்', 'Data Entry Operator'),
      ],
    },
  },
};

export const PAGES = {
  home,
  'classical-texts': classicalTexts,
  'classical-texts-list': classicalTextsList,
  search,
  ebooks,
  team,
};

// Address of a team photo (see the Team section above)
export const photoUrl = (photo, api) => (!photo ? ''
  : /^\/(api|images\/team)\//.test(photo) ? `${api}${photo}` : photo);

// Built-in value of a section, in the stored shape
export function builtInValue(def) {
  if (def.kind === 'section') return { title_ta: def.ta.title || '', title_en: def.en.title || '', body_ta: def.ta.body || '', body_en: def.en.body || '' };
  if (def.kind === 'fields') return { values: Object.fromEntries(def.fields.map(x => [x.key, { ta: x.ta || '', en: x.en || '' }])) };
  if (def.kind === 'members') return { rows: def.rows.map(r => ({ ...r })) };
  return { title_ta: def.title.ta || '', title_en: def.title.en || '', rows: def.rows.map(r => ({ ...r })) };
}

// Built-in banner images and texts (placements and sizes: backend lib/siteContent.js)
export const BANNERS = {
  'home.hero': { image: '/images/bg/home_hero_final.png', text: {
    title: { ta: 'சுவடியியல் புலம்', en: 'Faculty of Manuscriptology' },
    subtitle: { ta: 'செம்மொழித் தமிழாய்வு மத்திய நிறுவனம்', en: 'Central Institute of Classical Tamil' } } },
  'search.hero': { image: '/images/bg/search-hero-panoramic.png', text: {
    title: { ta: 'இணையவழிச் செவ்வியல் சுவடித் தேடல்', en: 'Manuscript Search — Online Classical Archives' } } },
  'ebooks.hero': { image: '/images/bg/ebooks-panoramic-clean.jpg', text: {
    label: { ta: 'மின் நூலகம்', en: 'DIGITAL LIBRARY' },
    title: { ta: 'முதல் அச்சுப் பதிப்புகள்', en: 'First Printed Editions' } } },
  'contact.hero': { image: '/images/bg/Contact.png', text: {
    label: { ta: 'தொடர்பு', en: 'GET IN TOUCH' },
    title: { ta: 'எங்களைத் தொடர்புகொள்ளுங்கள்', en: 'Contact Us' } } },
  'ebook.9': { image: '/images/bg/hero_ebook_9_panoramic_fit1920.png', text: { alt: { ta: 'Category Banner', en: '' } } },
  'ebook.13': { image: '/images/bg/hero_ebook_13_panoramic_fit1920.png', text: { alt: { ta: 'Category Banner', en: '' } } },
  'ebook.11': { image: '/images/bg/hero_ebook_11_panoramic_fit1920.png', text: { alt: { ta: 'Category Banner', en: '' } } },
  'ebook.15': { image: '/images/bg/hero_ebook_15_panoramic_fit1920.png', text: { alt: { ta: 'Category Banner', en: '' } } },
  'ebook.16': { image: '/images/bg/hero_ebook_16_panoramic_fit1920.png', text: { alt: { ta: 'Category Banner', en: '' } } },
  'ebook.17': { image: '/images/bg/hero_ebook_17_panoramic_fit1920.png', text: { alt: { ta: 'Category Banner', en: '' } } },
  'ebook.12': { image: '/images/bg/hero_panoramic_12_fit1920.png', text: { alt: { ta: 'Category Banner', en: '' } } },
  'ebook.10': { image: '/hero_ebook_10.jpg', text: { alt: { ta: 'Ettuthogai Banner', en: '' } } },
};
