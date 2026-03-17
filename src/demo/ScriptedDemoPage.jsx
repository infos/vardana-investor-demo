export default function ScriptedDemoPage({ navigate }) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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

      {isMobile ? (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <a
            href="https://www.loom.com/share/8239272d88254e539d3952690b51c33f"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#D97706',
              color: '#fff',
              padding: '14px 28px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Watch Demo
          </a>
          <p style={{ color: '#556882', fontSize: 12, marginTop: 12 }}>
            Opens in browser — rotate for full screen
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', maxHeight: 'calc(100vh - 80px)', aspectRatio: '16 / 9', background: '#000', position: 'relative', overflow: 'hidden' }}>
          <iframe
            src="https://www.loom.com/embed/8239272d88254e539d3952690b51c33f?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
          />
        </div>
      )}

    </div>
  );
}
