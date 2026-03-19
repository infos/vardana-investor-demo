import { useEffect, useRef } from 'react';

export function useAnalytics() {
  const sentPaths = useRef(new Set());

  useEffect(() => {
    const track = () => {
      const path = window.location.pathname + window.location.search;

      // Don't double-fire for the same path in same session
      if (sentPaths.current.has(path)) return;
      sentPaths.current.add(path);

      // Extract ?ref= param for contact attribution
      const ref = new URLSearchParams(window.location.search).get('ref') || null;

      // Only track demo-related paths
      const tracked = ['/demo', '/coordinator', '/roi'];
      const shouldTrack = tracked.some(p => window.location.pathname.startsWith(p));
      if (!shouldTrack) return;

      const event = {
        path,
        ref,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct',
        sessionId: getSessionId(),
      };

      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true,
      }).catch(() => {}); // Never surface errors to user
    };

    track(); // Fire on mount

    // Also fire on popstate (back/forward navigation)
    window.addEventListener('popstate', track);
    return () => window.removeEventListener('popstate', track);
  }, []);
}

function getSessionId() {
  // Persist a session ID in sessionStorage so multiple pages
  // in same visit can be correlated
  const key = 'vd_sid';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}
