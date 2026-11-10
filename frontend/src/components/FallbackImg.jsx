import { useState } from 'react';

/**
 * <img> that shows `fallback` if the image cannot be loaded.
 * The fallback is React state, not a DOM rewrite: replacing the parent's innerHTML
 * (the previous approach) removed React's own <img> node, so the cover stayed gone
 * after any transient error and later re-renders worked on a detached node.
 * Transient server refusals are retried first (utils/imageRetry.js); onError
 * only fires once the image really failed.
 */
const FallbackImg = ({ fallback = null, src, ...props }) => {
  // Remembers which src failed, so a new src is tried again automatically
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) return fallback;
  return <img src={src} {...props} onError={() => setFailedSrc(src)} />;
};

export default FallbackImg;
