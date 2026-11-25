/**
 * JustifiedText — a plain-text paragraph justified with whole words and normal letter spacing
 * (utils/justify.js, the same as the rich-text paragraphs of the other pages).
 * A dash standing alone between words is tied to the word before it, so it never starts a line.
 */
import React, { useLayoutEffect, useRef } from 'react';
import { justifyBlock } from '../utils/justify';

export default function JustifiedText({ text, className = '' }) {
  const ref = useRef(null);
  const clean = String(text || '').replace(/\s+/g, ' ').trim().replace(/ ([-–—])(?= |$)/g, ' $1');

  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    return justifyBlock(ref.current);
  }, [clean]);

  // Set as HTML (escaped) so React replaces the whole content if the text ever changes
  const html = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return <p ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
