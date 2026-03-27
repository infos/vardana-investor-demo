import React, { useState, useEffect } from 'react';

const styles = {
  page: {
    background: '#0f172a',
    color: '#e2e8f0',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '24px',
  },
  header: { fontSize: '24px', fontWeight: 700, marginBottom: '16px' },
  summary: { fontSize: '14px', color: '#94a3b8', marginBottom: '16px' },
  filterInput: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#e2e8f0',
    padding: '8px 12px',
    borderRadius: '6px',
    width: '100%',
    maxWidth: '400px',
    fontSize: '14px',
    marginBottom: '16px',
    outline: 'none',
  },
  ipBar: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' },
  ipButton: (excluded) => ({
    background: excluded ? '#334155' : '#1e293b',
    border: '1px solid #334155',
    color: excluded ? '#64748b' : '#e2e8f0',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: excluded ? 'line-through' : 'none',
  }),
  excludeHint: {
    fontSize: '12px',
    color: '#94a3b8',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '10px 14px',
    marginBottom: '16px',
    wordBreak: 'break-all',
  },
  sessionCard: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    marginBottom: '12px',
    overflow: 'hidden',
  },
  sessionHeader: {
    padding: '14px 18px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    userSelect: 'none',
  },
  sessionHeaderLeft: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  sessionHeaderRight: { display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 },
  badge: {
    background: '#334155',
    color: '#e2e8f0',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  refBadge: {
    background: '#065f46',
    color: '#6ee7b7',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 700,
  },
  durationBadge: {
    background: '#1e3a5f',
    color: '#7dd3fc',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  pagesBadge: {
    background: '#292524',
    color: '#a8a29e',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  chevron: (open) => ({
    color: '#64748b',
    fontSize: '12px',
    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s',
  }),
  sessionMeta: {
    padding: '0 18px 10px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  label: { fontSize: '12px', color: '#64748b' },
  value: { fontSize: '13px', color: '#cbd5e1' },
  timestamp: { fontSize: '13px', color: '#94a3b8' },
  pageList: {
    borderTop: '1px solid #334155',
    padding: '10px 18px 14px',
  },
  pageListTitle: {
    fontSize: '11px',
    letterSpacing: '0.08em',
    color: '#475569',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  pageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #1e293b',
  },
  pageRowLeft: { display: 'flex', gap: '8px', alignItems: 'center' },
  pageType: (type) => ({
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: type === 'page_enter' ? '#34d399' : '#f59e0b',
    width: '70px',
    flexShrink: 0,
  }),
  pagePath: { fontSize: '13px', color: '#e2e8f0' },
  pageDuration: { fontSize: '12px', color: '#7dd3fc' },
  pageTime: { fontSize: '11px', color: '#475569' },
  loading: { textAlign: 'center', padding: '60px 0', fontSize: '16px', color: '#94a3b8' },
  error: { textAlign: 'center', padding: '60px 0', fontSize: '16px', color: '#f87171' },
};

function formatDuration(seconds) {
  if (!seconds || seconds < 1) return null;
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function groupIntoSessions(visits) {
  // Group by sessionId
  const sessionMap = {};
  for (const v of visits) {
    const sid = v.sessionId || v.ip || 'unknown';
    if (!sessionMap[sid]) sessionMap[sid] = [];
    sessionMap[sid].push(v);
  }

  return Object.entries(sessionMap).map(([sid, events]) => {
    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const firstEvent = events[0];
    const ref = events.find(e => e.ref)?.ref || null;
    const ip = firstEvent.ip;
    const city = firstEvent.city;
    const country = firstEvent.country;
    const userAgent = firstEvent.userAgent;
    const referrer = firstEvent.referrer;
    const startTime = firstEvent.timestamp;

    // Calculate total session duration from page_exit events
    const totalDuration = events
      .filter(e => e.type === 'page_exit' && e.durationSeconds)
      .reduce((sum, e) => sum + e.durationSeconds, 0);

    // Get unique pages visited (from page_enter events)
    const pagesVisited = events.filter(e => e.type === 'page_enter').map(e => e.path);

    return {
      sid,
      ref,
      ip,
      city,
      country,
      userAgent,
      referrer,
      startTime,
      totalDuration: totalDuration > 0 ? totalDuration : null,
      pagesVisited: pagesVisited.length,
      events,
    };
  }).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
}

export default function AdminAnalytics() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [excludedIPs, setExcludedIPs] = useState(new Set());
  const [expandedSessions, setExpandedSessions] = useState(new Set());

  useEffect(() => {
    const secret = new URLSearchParams(window.location.search).get('secret');
    fetch(`/api/analytics?secret=${encodeURIComponent(secret || '')}`)
      .then(r => r.json())
      .then(data => {
        if (data.error && !data.visits) setError(data.error);
        else {
          if (data.error) setError(data.error);
          setVisits(data.visits || []);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.page}><div style={styles.loading}>Loading analytics...</div></div>;
  if (error && visits.length === 0) return <div style={styles.page}><div style={styles.error}>{error}</div></div>;

  const allIPs = [...new Set(visits.map(v => v.ip).filter(Boolean))];

  const filteredVisits = visits
    .filter(v => !excludedIPs.has(v.ip))
    .filter(v => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return [v.ip, v.city, v.country, v.path, v.ref, v.referrer, v.sessionId]
        .filter(Boolean)
        .some(f => f.toLowerCase().includes(q));
    });

  const sessions = groupIntoSessions(filteredVisits);
  const uniqueIPs = new Set(filteredVisits.map(v => v.ip));

  const toggleIP = ip => {
    setExcludedIPs(prev => {
      const next = new Set(prev);
      next.has(ip) ? next.delete(ip) : next.add(ip);
      return next;
    });
  };

  const toggleSession = sid => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>Demo Analytics</div>

      <div style={styles.summary}>
        {sessions.length} sessions &middot; {filteredVisits.length} events &middot; {uniqueIPs.size} unique IPs
      </div>

      {error && <div style={{ ...styles.error, padding: '8px 0', textAlign: 'left', marginBottom: '12px' }}>{error}</div>}

      {allIPs.length > 0 && (
        <>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Toggle IPs to exclude:</div>
          <div style={styles.ipBar}>
            {allIPs.map(ip => (
              <button key={ip} style={styles.ipButton(excludedIPs.has(ip))} onClick={() => toggleIP(ip)}>
                {ip}
              </button>
            ))}
          </div>
        </>
      )}

      {excludedIPs.size > 0 && (
        <div style={styles.excludeHint}>
          To permanently exclude, add to EXCLUDED_IPS in api/track.js: [{[...excludedIPs].map(ip => `'${ip}'`).join(', ')}]
        </div>
      )}

      <input
        style={styles.filterInput}
        placeholder="Filter by IP, city, country, path, or ref..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      {sessions.length === 0 && <div style={styles.loading}>No sessions match your filter.</div>}

      {sessions.map(session => {
        const isOpen = expandedSessions.has(session.sid);
        return (
          <div key={session.sid} style={styles.sessionCard}>
            {/* Session header — click to expand */}
            <div style={styles.sessionHeader} onClick={() => toggleSession(session.sid)}>
              <div style={styles.sessionHeaderLeft}>
                <span style={styles.timestamp}>{new Date(session.startTime).toLocaleString()}</span>
                {session.ref && <span style={styles.refBadge}>ref: {session.ref}</span>}
                <span style={styles.badge}>{session.city !== 'unknown' ? `${decodeURIComponent(session.city)}, ${session.country}` : session.ip}</span>
                <span style={styles.pagesBadge}>{session.pagesVisited} page{session.pagesVisited !== 1 ? 's' : ''}</span>
                {session.totalDuration && (
                  <span style={styles.durationBadge}>⏱ {formatDuration(session.totalDuration)}</span>
                )}
              </div>
              <div style={styles.sessionHeaderRight}>
                <span style={{ fontSize: '11px', color: '#475569' }}>{session.sid.slice(-6)}</span>
                <span style={styles.chevron(isOpen)}>▼</span>
              </div>
            </div>

            {/* Session meta */}
            <div style={styles.sessionMeta}>
              <span><span style={styles.label}>IP: </span><span style={styles.value}>{session.ip}</span></span>
              <span><span style={styles.label}>Referrer: </span><span style={styles.value}>{session.referrer || 'direct'}</span></span>
              <span><span style={styles.label}>UA: </span><span style={styles.value}>{(session.userAgent || '').slice(0, 60)}…</span></span>
            </div>

            {/* Page list — expandable */}
            {isOpen && (
              <div style={styles.pageList}>
                <div style={styles.pageListTitle}>Page Events</div>
                {session.events.map((e, i) => (
                  <div key={i} style={styles.pageRow}>
                    <div style={styles.pageRowLeft}>
                      <span style={styles.pageType(e.type)}>
                        {e.type === 'page_enter' ? '→ ENTER' : '← EXIT'}
                      </span>
                      <span style={styles.pagePath}>{e.path}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {e.durationSeconds && (
                        <span style={styles.pageDuration}>{formatDuration(e.durationSeconds)}</span>
                      )}
                      <span style={styles.pageTime}>{new Date(e.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
