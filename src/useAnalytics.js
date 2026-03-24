import { useEffect, useRef } from 'react';

export function useAnalytics() {
  const sentPaths = useRef(new Set());
  const pageStartTime = useRef(null);
  const currentPath = useRef(null);

  const sendEvent = (type, path, ref, extraFields = {}) => {
    const event = {
      type,
      path,
      ref,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer || 'direct',
      sessionId: getSessionId(),
      ...extraFields,
    };
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  };

  const sendDuration = () => {
    if (!currentPath.current || !pageStartTime.current) return;
    const duration = Math.round((Date.now() - pageStartTime.current) / 1000);
    if (duration < 2) return;
    const ref = new URLSearchParams(window.location.search).get('ref') || null;
    sendEvent('page_exit', currentPath.current, ref, { durationSeconds: duration });
  };

  useEffect(() => {
    const track = () => {
      const path = window.location.pathname + window.location.search;
      const ref = new URLSearchParams(window.location.search).get('ref') || null;

      const tracked = ['/demo', '/coordinator', '/roi'];
      const shouldTrack = tracked.some(p => window.location.pathname.startsWith(p));
      if (!shouldTrack) return;

      if (currentPath.current && currentPath.current !== path) {
        sendDuration();
      }

      if (!sentPaths.current.has(path)) {
        sentPaths.current.add(path);
        sendEvent('page_enter', path, ref);
      }

      pageStartTime.current = Date.now();
      currentPath.current = path;
    };

    track();

    window.addEventListener('popstate', track);
    window.addEventListener('beforeunload', sendDuration);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendDuration();
    });

    return () => {
      window.removeEventListener('popstate', track);
      window.removeEventListener('beforeunload', sendDuration);
    };
  }, []);
}

function getSessionId() {
  const key = 'vd_sid';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}
