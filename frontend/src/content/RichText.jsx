/**
 * RichText — shows a rich-text body edited in the admin Page Content section.
 *
 * The HTML is cleaned again here (the server already cleaned it when it was saved):
 * only the tags and attributes below survive, so nothing stored in the database can run
 * script on the public site. Page styles are applied by `classes`, a map from tag name to
 * class names (e.g. { p: 'faculty-article-p', ol: 'faculty-article-list' }), so content
 * edited in the admin looks exactly like the page's own text. Links to pages of this
 * site (href starting with "/") open inside the app without a full reload.
 */
import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const ALLOWED = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SMALL', 'UL', 'OL', 'LI', 'A', 'H3', 'H4', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH', 'FORM', 'TEXTAREA', 'SELECT', 'BUTTON', 'INPUT', 'LINK', 'META', 'TITLE', 'HEAD']);
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

export function sanitizeRichHtml(html, classes = {}) {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const clean = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) continue;                       // text
      if (child.nodeType !== 1) { child.remove(); continue; }    // comments etc.
      const tag = child.tagName;
      if (DROP.has(tag)) { child.remove(); continue; }
      clean(child);
      if (!ALLOWED.has(tag)) { child.replaceWith(...child.childNodes); continue; }
      const href = child.getAttribute('href');
      const target = child.getAttribute('target');
      const start = child.getAttribute('start');
      for (const a of [...child.attributes]) child.removeAttribute(a.name);
      if (tag === 'A') {
        if (href && SAFE_HREF.test(href.trim())) child.setAttribute('href', href.trim());
        if (target === '_blank') { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener noreferrer'); }
      }
      if (tag === 'OL' && /^\d{1,4}$/.test(start || '')) child.setAttribute('start', start);
      const cls = classes[tag.toLowerCase()];
      if (cls) child.setAttribute('class', cls);
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}

/**
 * Top-level blocks of a rich-text body, for pages that draw each block with their own
 * markup (numbered step boxes, the article's link list…). Text not inside a block is
 * gathered into a paragraph. Every `html` is already sanitised.
 *   { tag: 'p' | 'h3' | 'h4' | 'blockquote' | 'table', html }   (table: the whole <table>)
 *   { tag: 'ol' | 'ul', items: [{ html, link: { href, html, target } | null }] }
 */
export function toBlocks(html) {
  const safe = sanitizeRichHtml(html);
  if (!safe) return [];
  const doc = new DOMParser().parseFromString(`<body>${safe}</body>`, 'text/html');
  const blocks = [];
  let loose = [];
  const flush = () => {
    const h = loose.map(n => (n.nodeType === 3 ? escapeText(n.textContent) : n.outerHTML)).join('').trim();
    if (h && h !== '<br>') blocks.push({ tag: 'p', html: h });
    loose = [];
  };
  for (const n of [...doc.body.childNodes]) {
    const tag = n.nodeType === 1 ? n.tagName.toLowerCase() : null;
    if (tag === 'p' || tag === 'h3' || tag === 'h4' || tag === 'blockquote') {
      flush();
      if (n.innerHTML.trim()) blocks.push({ tag, html: n.innerHTML });
    } else if (tag === 'table') {
      flush();
      blocks.push({ tag, html: n.outerHTML });
    } else if (tag === 'ol' || tag === 'ul') {
      flush();
      blocks.push({
        tag,
        items: [...n.children].filter(li => li.tagName === 'LI').map(li => {
          const only = li.children.length === 1 && li.children[0].tagName === 'A' && li.textContent.trim() === li.children[0].textContent.trim() ? li.children[0] : null;
          return {
            html: li.innerHTML,
            link: only && only.getAttribute('href') ? { href: only.getAttribute('href'), html: only.innerHTML, target: only.getAttribute('target') } : null,
          };
        }),
      });
    } else {
      loose.push(n);
    }
  }
  flush();
  return blocks;
}
/**
 * Split a rich-text body at its headings (h3): [{ title, html }]. Text before the first
 * heading forms a group without a title. Used where each heading starts a new box.
 */
export function splitByHeading(html) {
  const safe = sanitizeRichHtml(html);
  if (!safe) return [];
  const doc = new DOMParser().parseFromString(`<body>${safe}</body>`, 'text/html');
  const groups = [];
  let cur = null;
  for (const n of [...doc.body.childNodes]) {
    if (n.nodeType === 1 && n.tagName === 'H3') {
      cur = { title: n.textContent.trim(), parts: [] };
      groups.push(cur);
      continue;
    }
    if (!cur) { cur = { title: '', parts: [] }; groups.push(cur); }
    cur.parts.push(n.nodeType === 1 ? n.outerHTML : escapeText(n.textContent));
  }
  return groups.map(g => ({ title: g.title, html: g.parts.join('') })).filter(g => g.title || g.html.trim());
}
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Inline sanitised HTML inside a span (or another tag), with in-app links. */
export function Inline({ html, as = 'span', className }) {
  return <RichText html={html} as={as} className={className} />;
}

/** A link inside rich content: in-app route for "/…", normal link otherwise. */
export function ContentLink({ link, className, children }) {
  const navigate = useNavigate();
  const internal = link.href.startsWith('/') && !link.href.startsWith('//') && link.target !== '_blank';
  return (
    <a href={link.href} className={className}
      target={link.target === '_blank' ? '_blank' : undefined}
      rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
      onClick={internal ? (e) => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); navigate(link.href); } : undefined}>
      {children}
    </a>
  );
}

export default function RichText({ html, classes, className, as: Tag = 'div', ...rest }) {
  const navigate = useNavigate();
  const safe = useMemo(() => sanitizeRichHtml(html, classes), [html, classes]);
  const onClick = useCallback((e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('//') && !/^\/(api|storage|images|pdf)\//.test(href)) {
      e.preventDefault();
      navigate(href);
    }
  }, [navigate]);
  if (!safe) return null;
  // eslint-disable-next-line react/no-danger
  return <Tag className={className} onClick={onClick} dangerouslySetInnerHTML={{ __html: safe }} {...rest} />;
}
