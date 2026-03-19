// @ts-nocheck — @types/react is not installed in this Vite project;
// this file is structurally correct React/TSX.
'use client';

import { useState, useEffect, useCallback } from 'react';

interface VisitEvent {
  timestamp: string;
  path: string;
  ip: string;
  country: string;
  city: string;
  region: string;
  lat: string | null;
  lon: string | null;
  userAgent: string;
  referer: string;
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '24px',
  } as React.CSSProperties,
  header: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '24px',
    color: '#f1f5f9',
  } as React.CSSProperties,
  loading: {
    textAlign: 'center' as const,
    padding: '48px',
    color: '#94a3b8',
    fontSize: '16px',
  } as React.CSSProperties,
  error: {
    backgroundColor: '#1e293b',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '24px',
    color: '#fca5a5',
    marginBottom: '16px',
  } as React.CSSProperties,
  tip: {
    marginTop: '12px',
    color: '#94a3b8',
    fontSize: '13px',
  } as React.CSSProperties,
  summary: {
    marginBottom: '16px',
    color: '#94a3b8',
    fontSize: '14px',
  } as React.CSSProperties,
  filterInput: {
    width: '100%',
    maxWidth: '400px',
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '14px',
    marginBottom: '16px',
    outline: 'none',
  } as React.CSSProperties,
  ipSection: {
    marginBottom: '20px',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    alignItems: 'center',
  } as React.CSSProperties,
  ipLabel: {
    fontSize: '13px',
    color: '#94a3b8',
    marginRight: '8px',
  } as React.CSSProperties,
  ipButton: (excluded: boolean) =>
    ({
      padding: '4px 10px',
      borderRadius: '4px',
      border: `1px solid ${excluded ? '#ef4444' : '#334155'}`,
      backgroundColor: excluded ? '#450a0a' : '#1e293b',
      color: excluded ? '#fca5a5' : '#e2e8f0',
      textDecoration: excluded ? 'line-through' : 'none',
      cursor: 'pointer',
      fontSize: '12px',
      fontFamily: 'monospace',
    }) as React.CSSProperties,
  excludeMsg: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#fbbf24',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  } as React.CSSProperties,
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  } as React.CSSProperties,
  badge: (color: string) =>
    ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: color,
      color: '#fff',
      marginRight: '6px',
    }) as React.CSSProperties,
  label: {
    fontSize: '12px',
    color: '#64748b',
    marginRight: '6px',
  } as React.CSSProperties,
  value: {
    fontSize: '13px',
    color: '#cbd5e1',
  } as React.CSSProperties,
  timestamp: {
    fontSize: '12px',
    color: '#94a3b8',
  } as React.CSSProperties,
};

const PATH_COLORS: Record<string, string> = {
  '/demo': '#6366f1',
  '/coordinator': '#0ea5e9',
  '/patient': '#10b981',
};

function getPathColor(path: string): string {
  for (const [prefix, color] of Object.entries(PATH_COLORS)) {
    if (path.startsWith(prefix)) return color;
  }
  return '#64748b';
}

export default function AnalyticsPage() {
  const [visits, setVisits] = useState<VisitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kvNotConfigured, setKvNotConfigured] = useState(false);
  const [filter, setFilter] = useState('');
  const [excludedIps, setExcludedIps] = useState<Set<string>>(new Set());

  const fetchVisits = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const secret = params.get('secret') || '';
      const res = await fetch(`/api/analytics/track?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();

      if (res.status === 401) {
        setError(data.error || 'Unauthorized');
        return;
      }

      if (data.error) {
        setError(data.error);
        if (data.error.includes('KV not configured')) {
          setKvNotConfigured(true);
        }
      }

      setVisits(data.visits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const uniqueIps = Array.from(new Set(visits.map((v) => v.ip))).sort();

  const filteredVisits = visits.filter((v) => {
    if (excludedIps.has(v.ip)) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      v.ip.toLowerCase().includes(q) ||
      v.city.toLowerCase().includes(q) ||
      v.country.toLowerCase().includes(q)
    );
  });

  const toggleIp = (ip: string) => {
    setExcludedIps((prev) => {
      const next = new Set(prev);
      if (next.has(ip)) {
        next.delete(ip);
      } else {
        next.add(ip);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>Demo Analytics</div>

      {error && (
        <div style={styles.error}>
          <div>{error}</div>
          {kvNotConfigured && (
            <div style={styles.tip}>
              Tip: Check Vercel → your project → Functions → Logs and search for [DEMO_VISIT] to
              see visits without KV setup.
            </div>
          )}
        </div>
      )}

      {/* IP exclusion toggles */}
      {uniqueIps.length > 0 && (
        <div style={styles.ipSection}>
          <span style={styles.ipLabel}>IPs:</span>
          {uniqueIps.map((ip) => (
            <button
              key={ip}
              style={styles.ipButton(excludedIps.has(ip))}
              onClick={() => toggleIp(ip)}
            >
              {ip}
            </button>
          ))}
        </div>
      )}

      {excludedIps.size > 0 && (
        <div style={styles.excludeMsg}>
          To permanently exclude, add these IPs to EXCLUDED_IPS in middleware.ts:{' '}
          {Array.from(excludedIps).join(', ')}
        </div>
      )}

      {/* Filter */}
      <input
        style={styles.filterInput}
        placeholder="Filter by IP, city, or country..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {/* Summary */}
      <div style={styles.summary}>
        {filteredVisits.length} visits shown · {visits.length} total · {uniqueIps.length} unique IPs
      </div>

      {/* Visit cards */}
      {filteredVisits.map((v, i) => (
        <div key={`${v.timestamp}-${i}`} style={styles.card}>
          <div style={styles.cardRow}>
            <div>
              <span style={styles.badge(getPathColor(v.path))}>{v.path}</span>
              <span style={styles.badge('#475569')}>
                {v.country} · {v.city}
              </span>
            </div>
            <span style={styles.timestamp}>{new Date(v.timestamp).toLocaleString()}</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <span style={styles.label}>IP:</span>
            <span style={styles.value}>{v.ip}</span>
          </div>
          <div>
            <span style={styles.label}>Referrer:</span>
            <span style={styles.value}>{v.referer}</span>
          </div>
          <div>
            <span style={styles.label}>UA:</span>
            <span style={styles.value}>
              {v.userAgent.length > 80 ? v.userAgent.slice(0, 80) + '...' : v.userAgent}
            </span>
          </div>
        </div>
      ))}

      {filteredVisits.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          No visits recorded yet.
        </div>
      )}
    </div>
  );
}
