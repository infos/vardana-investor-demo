export default function DemoPage({ navigate }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Back link */}
      <div style={{ position: 'absolute', top: 24, left: 32 }}>
        <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} style={{
          fontSize: 13,
          color: '#475569',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          ← Vardana Health
        </a>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
        }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}>
            ♥
          </div>
          <span style={{
            fontFamily: "'Georgia', serif",
            fontSize: 22,
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '-0.02em',
          }}>
            Vardana Health
          </span>
        </div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: '#f8fafc',
          letterSpacing: '-0.03em',
          marginBottom: 10,
        }}>
          Investor Demo
        </h1>
        <p style={{ fontSize: 15, color: '#64748b', maxWidth: 400 }}>
          Sarah Chen · 67F · CHF Day 15 of 90 · Decompensation risk scenario
        </p>
      </div>

      {/* Role selector cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 640, width: '100%' }}>
        {/* Coordinator */}
        <a href="/coordinator" onClick={e => { e.preventDefault(); navigate('/coordinator'); }} style={{ textDecoration: 'none' }}>
          <div
            style={{
              background: '#1e293b',
              border: '1px solid rgba(14,165,233,0.25)',
              borderRadius: 16,
              padding: 28,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#0ea5e9';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(14,165,233,0.25)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🩺</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Care Coordinator
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
              Nurse Rachel Kim
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                'Patient roster with risk stratification',
                'Sarah Chen flagged — decompensation risk',
                'Live evidence chain + AI reasoning',
                'Initiate voice / SMS outreach',
              ].map((pt, i) => (
                <li key={i} style={{
                  fontSize: 12,
                  color: '#94a3b8',
                  marginBottom: 6,
                  display: 'flex',
                  gap: 8,
                  lineHeight: 1.4,
                }}>
                  <span style={{ color: '#0ea5e9', flexShrink: 0 }}>→</span>
                  {pt}
                </li>
              ))}
            </ul>
            <div style={{
              marginTop: 20,
              background: '#0ea5e9',
              color: 'white',
              borderRadius: 8,
              padding: '10px 0',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
            }}>
              Open Coordinator View
            </div>
          </div>
        </a>

        {/* Patient */}
        <a href="/patient" onClick={e => { e.preventDefault(); navigate('/patient'); }} style={{ textDecoration: 'none' }}>
          <div
            style={{
              background: '#1e293b',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 16,
              padding: 28,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.10)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Patient Portal
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
              Sarah Chen · 67F
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                'Recovery journey: Day 15 of 90',
                'Weight alert — care team notified',
                'Vitals, medications, check-in history',
                'AI check-in conversation view',
              ].map((pt, i) => (
                <li key={i} style={{
                  fontSize: 12,
                  color: '#94a3b8',
                  marginBottom: 6,
                  display: 'flex',
                  gap: 8,
                  lineHeight: 1.4,
                }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>→</span>
                  {pt}
                </li>
              ))}
            </ul>
            <div style={{
              marginTop: 20,
              background: '#10b981',
              color: 'white',
              borderRadius: 8,
              padding: '10px 0',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
            }}>
              Open Patient Portal
            </div>
          </div>
        </a>
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 36, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: '#334155',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '8px 16px',
        }}>
          <span style={{ color: '#0ea5e9' }}>⬡</span>
          FHIR R4 · Medplum · All patient data is synthetic — Sarah Chen is a fictional demo patient
        </div>
      </div>
    </div>
  );
}
