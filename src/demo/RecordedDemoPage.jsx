import { useRef, useEffect } from 'react';
import { DEMO_BASE } from '../demoPath';

export default function RecordedDemoPage({ navigate }) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const videoRef = useRef(null);

  // Disable any embedded subtitle/caption tracks that browsers auto-enable
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const disableTracks = () => {
      for (let i = 0; i < v.textTracks.length; i++) {
        v.textTracks[i].mode = 'disabled';
      }
    };
    disableTracks();
    v.textTracks.addEventListener?.('addtrack', disableTracks);
    v.addEventListener('loadedmetadata', disableTracks);
    return () => {
      v.textTracks.removeEventListener?.('addtrack', disableTracks);
      v.removeEventListener('loadedmetadata', disableTracks);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0C1420' }}>
      {/* Back link */}
      <div style={{ padding: '20px 24px' }}>
        <span
          onClick={() => navigate(DEMO_BASE)}
          style={{ fontSize: 13, color: '#556882', textDecoration: 'none', cursor: 'pointer' }}
        >
          &larr; Back
        </span>
      </div>

      <div
        style={{
          width: '100%',
          maxHeight: 'calc(100vh - 80px)',
          aspectRatio: '16 / 9',
          background: '#000',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          src="/recorded-demo.mp4"
          controls
          autoPlay={!isMobile}
          playsInline
          preload="auto"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: '#000',
          }}
        />
      </div>
    </div>
  );
}
