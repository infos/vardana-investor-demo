import React, { useState, useEffect } from 'react';

const styles = {
  page: {
    background: '#0f172a',
    color: '#e2e8f0',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '24px',
  },
  header: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '16px',
  },
  summary: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '16px',
  },
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
  ipBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
  },
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
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '14px 18px',
    marginBottom: '10px',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '4px',
  },
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
  label: {
    fontSize: '12px',
    color: '#64748b',
  },
  value: {
    fontSize: '13px',
    color: '#cbd5e1',
  },
  timestamp: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 0',
    fontSize: '16px',
    color: '#94a3b8',
  },
  error: {
    textAlign: 'center',
    padding: '60px 0',
    fontSize: '16px',
    color: '#f87171',
  },
};

export default function AdminAnalytics() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [excludedIPs, setExcludedIPs] = useState(new Set());

  useEffect(() => {
    const secret = new URLSearchParams(window.location.search).get('secret');
    fetch(`/api/analytics?secret=${encodeURIComponent(secret || '')}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error && !data.visits) {
          setError(data.error);
        } else {
          if (data.error) setError(data.error);
          setVisits(data.visits || []);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.page}><div style={styles.loading}>Loading analytics...</div></div>;
  if (error && visits.length === 0) return <div style={styles.page}><div style={styles.error}>{error}</div></div>;

  const allIPs = [...new Set(visits.map((v) => v.ip).filter(Boolean))];

  const filtered = visits
    .filter((v) => !excludedIPs.has(v.ip))
    .filter((v) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return [v.ip, v.city, v.country, v.path, v.ref, v.referrer, v.sessionId]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q));
    });

  const uniqueIPs = new Set(filtered.map((v) => v.ip));

  const toggleIP = (ip) => {
    setExcludedIPs((prev) => {
      const next = new Set(prev);
      if (next.has(ip)) next.delete(ip);
      else next.add(ip);
      return next;
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>Demo Analytics</div>

      <div style={styles.summary}>
        {filtered.length} visits shown &middot; {visits.length} total &middot; {uniqueIPs.size} unique IPs
      </div>

      {error && <div style={{ ...styles.error, padding: '8px 0', textAlign: 'left', marginBottom: '12px' }}>{error}</div>}

      {allIPs.length > 0 && (
        <>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Toggle IPs to exclude:</div>
          <div style={styles.ipBar}>
            {allIPs.map((ip) => (
              <button key={ip} style={styles.ipButton(excludedIPs.has(ip))} onClick={() => toggleIP(ip)}>
                {ip}
              </button>
            ))}
          </div>
        </>
      )}

      {excludedIPs.size > 0 && (
        <div style={styles.excludeHint}>
          To permanently exclude, add to EXCLUDED_IPS in api/track.js: [{[...excludedIPs].map((ip) => `'${ip}'`).join(', ')}]
        </div>
      )}

      <input
        style={styles.filterInput}
        placeholder="Filter by IP, city, country, path, or ref..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {filtered.map((v, i) => (
        <div key={i} style={styles.card}>
          <div style={styles.row}>
            <span style={styles.timestamp}>{new Date(v.timestamp).toLocaleString()}</span>
            <span style={styles.badge}>{v.path}</span>
            {v.ref && <span style={styles.refBadge}>ref: {v.ref}</span>}
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Location:</span>
            <span style={styles.value}>{v.city}, {v.country}</span>
            <span style={styles.label}>IP:</span>
            <span style={styles.value}>{v.ip}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Referrer:</span>
            <span style={styles.value}>{v.referrer || 'direct'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Session:</span>
            <span style={styles.value}>{v.sessionId ? v.sessionId.slice(-6) : '—'}</span>
            <span style={styles.label}>UA:</span>
            <span style={styles.value}>{(v.userAgent || '').slice(0, 80)}{(v.userAgent || '').length > 80 ? '…' : ''}</span>
          </div>
        </div>
      ))}

      {filtered.length === 0 && <div style={styles.loading}>No visits match your filter.</div>}
    </div>
  );
}
