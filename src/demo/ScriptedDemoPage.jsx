export default function ScriptedDemoPage({ navigate }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0C1420' }}>

      {/* Back link */}
      <div style={{ padding: '20px 24px' }}>
        <span
          onClick={() => navigate('/demo')}
          style={{ fontSize: 13, color: '#556882', textDecoration: 'none', cursor: 'pointer' }}
        >
          &larr; Back
        </span>
      </div>

      {/* Video — full width, 16:9 responsive */}
      <div style={{ width: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
          <iframe
            src="https://www.loom.com/embed/ab1c85d821684a919d8d7574b5ba2055?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allowFullScreen
          />
        </div>
      </div>

      {/* Mobile rotate hint */}
      <div
        className="rotate-hint"
        style={{
          display: 'none',
          textAlign: 'center',
          padding: '12px 16px',
          fontSize: 12,
          color: '#556882',
          background: '#0C1420',
        }}
      >
        Rotate your phone for the best experience
      </div>

      <style>{`
        @media (max-width: 767px) and (orientation: portrait) {
          .rotate-hint { display: block !important; }
        }
      `}</style>

    </div>
  );
}
