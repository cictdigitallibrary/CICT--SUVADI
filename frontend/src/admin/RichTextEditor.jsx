/**
 * RichTextEditor — small rich-text editor for the admin Page Content section.
 * No external library: an editable area with a toolbar (bold, italic, underline,
 * sub-heading, lists, links, small text, clear formatting). Pasted text is cleaned with
 * the same allow-list as the public site, and the server cleans it again on save.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Unlink, Heading3, Heading4, Type, Eraser, Pilcrow, BetweenHorizontalEnd, Minus } from 'lucide-react';
import { sanitizeRichHtml } from '../content/RichText';

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

export default function RichTextEditor({ value, onChange, lang = 'ta', placeholder, minHeight = 140 }) {
  const ref = useRef(null);
  const last = useRef(value || '');
  const [focused, setFocused] = useState(false);

  // Value changed from outside (another section loaded, restore…): show it
  useEffect(() => {
    if (ref.current && value !== last.current) {
      ref.current.innerHTML = value || '';
      last.current = value || '';
    }
  }, [value]);
  useEffect(() => { if (ref.current) ref.current.innerHTML = value || ''; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = () => {
    const html = ref.current.innerHTML.replace(/^(<br>|<p><br><\/p>)$/, '');
    last.current = html;
    onChange(html);
  };
  const cmd = (name, arg = null) => {
    ref.current.focus();
    document.execCommand(name, false, arg);
    emit();
  };
  const block = (tag) => cmd('formatBlock', tag);
  const link = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { window.alert('Select the text to turn into a link first.'); return; }
    const url = window.prompt('Link address (https://…, /page-of-this-site, mailto:…)', 'https://');
    if (!url) return;
    if (!SAFE_URL.test(url.trim())) { window.alert('Use an address starting with https://, http://, / (a page of this site), mailto: or tel:'); return; }
    cmd('createLink', url.trim());
  };
  // <small>: used for the English line under a Tamil line (e.g. the search steps)
  const small = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current.contains(sel.anchorNode)) { window.alert('Select the text to show in small type first.'); return; }
    const range = sel.getRangeAt(0);
    const el = document.createElement('small');
    el.appendChild(range.extractContents());
    range.insertNode(el);
    emit();
  };
  // Tables: add / remove the row the cursor is in
  const currentCell = () => {
    let n = window.getSelection()?.anchorNode;
    while (n && n !== ref.current) {
      if (n.nodeType === 1 && (n.tagName === 'TD' || n.tagName === 'TH')) return n;
      n = n.parentNode;
    }
    return null;
  };
  const addRow = () => {
    const c = currentCell();
    if (!c) { window.alert('Click inside a table row first.'); return; }
    const tr = c.parentElement;
    const fresh = document.createElement('tr');
    for (let i = 0; i < tr.children.length; i++) { const td = document.createElement('td'); td.innerHTML = '<br>'; fresh.appendChild(td); }
    // Below a header row: the new row goes at the top of the table body
    if (tr.parentElement.tagName === 'THEAD') {
      const table = tr.closest('table');
      let body = table.querySelector('tbody');
      if (!body) { body = document.createElement('tbody'); table.appendChild(body); }
      body.insertBefore(fresh, body.firstChild);
    } else tr.after(fresh);
    emit();
  };
  const removeRow = () => {
    const c = currentCell();
    if (!c) { window.alert('Click inside the table row to remove first.'); return; }
    const tr = c.parentElement;
    if (tr.parentElement.tagName === 'THEAD') { window.alert('The header row cannot be removed.'); return; }
    if (!window.confirm('Remove this table row?')) return;
    tr.remove();
    emit();
  };
  const onPaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const clean = html ? sanitizeRichHtml(html) : text.split(/\r?\n\r?\n/).map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\r?\n/g, '<br>')}</p>`).join('');
    document.execCommand('insertHTML', false, clean);
    emit();
  };

  const B = ({ onClick, title, children }) => (
    <button type="button" title={title} aria-label={title} onMouseDown={e => e.preventDefault()} onClick={onClick}
      className="p-1.5 rounded hover:bg-maroon/10 text-stone/70 hover:text-maroon transition-colors">{children}</button>
  );

  return (
    <div className={`border rounded-lg bg-white transition-colors ${focused ? 'border-gold ring-2 ring-gold/15' : 'border-stone/15'}`}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-stone/10 bg-stone/[0.03] rounded-t-lg">
        <B title="Bold" onClick={() => cmd('bold')}><Bold className="w-4 h-4" /></B>
        <B title="Italic" onClick={() => cmd('italic')}><Italic className="w-4 h-4" /></B>
        <B title="Underline" onClick={() => cmd('underline')}><Underline className="w-4 h-4" /></B>
        <span className="w-px h-5 bg-stone/15 mx-1" />
        <B title="Paragraph" onClick={() => block('p')}><Pilcrow className="w-4 h-4" /></B>
        <B title="Heading" onClick={() => block('h3')}><Heading3 className="w-4 h-4" /></B>
        <B title="Sub-heading" onClick={() => block('h4')}><Heading4 className="w-4 h-4" /></B>
        <B title="Small text (e.g. English line under Tamil)" onClick={small}><Type className="w-3.5 h-3.5" /></B>
        <span className="w-px h-5 bg-stone/15 mx-1" />
        <B title="Bulleted list" onClick={() => cmd('insertUnorderedList')}><List className="w-4 h-4" /></B>
        <B title="Numbered list" onClick={() => cmd('insertOrderedList')}><ListOrdered className="w-4 h-4" /></B>
        <span className="w-px h-5 bg-stone/15 mx-1" />
        <B title="Link" onClick={link}><Link2 className="w-4 h-4" /></B>
        <B title="Remove link" onClick={() => cmd('unlink')}><Unlink className="w-4 h-4" /></B>
        <B title="Clear formatting" onClick={() => cmd('removeFormat')}><Eraser className="w-4 h-4" /></B>
        <span className="w-px h-5 bg-stone/15 mx-1" />
        <B title="Table: insert a row below" onClick={addRow}><BetweenHorizontalEnd className="w-4 h-4" /></B>
        <B title="Table: remove this row" onClick={removeRow}><Minus className="w-4 h-4" /></B>
      </div>
      <div
        ref={ref}
        lang={lang}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={() => setFocused(false)}
        onFocus={() => { setFocused(true); document.execCommand('defaultParagraphSeparator', false, 'p'); }}
        onPaste={onPaste}
        data-placeholder={placeholder}
        className="cms-editor px-4 py-3 text-[15px] leading-relaxed text-stone-800 outline-none overflow-auto"
        style={{ minHeight, maxHeight: 520, fontFamily: lang === 'ta' ? '"Noto Sans Tamil", sans-serif' : 'Inter, sans-serif' }}
      />
    </div>
  );
}
