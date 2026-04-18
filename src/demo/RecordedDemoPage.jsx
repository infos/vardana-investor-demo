import { useRef, useEffect } from 'react';
import { DEMO_BASE } from '../demoPath';

export default function RecordedDemoPage({ navigate }) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const videoRef = useRef(null);

  // Subtitles only show during specific windows: 0–20s and 1:33–1:56 (93–116s).
  // Outside those windows, tracks are set to 'disabled' so cues don't render.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const SUBTITLE_WINDOWS = [
      [0, 20],
      [93, 116],
    ];
    const inWindow = (t) => SUBTITLE_WINDOWS.some(([s, e]) => t >= s && t <= e);

    const applyMode = () => {
      const shouldShow = inWindow(v.currentTime);
      for (let i = 0; i < v.textTracks.length; i++) {
        v.textTracks[i].mode = shouldShow ? 'showing' : 'disabled';
      }
    };

    applyMode();
    v.addEventListener('loadedmetadata', applyMode);
    v.addEventListener('timeupdate', applyMode);
    v.addEventListener('seeked', applyMode);
    v.textTracks.addEventListener?.('addtrack', applyMode);

    return () => {
      v.removeEventListener('loadedmetadata', applyMode);
      v.removeEventListener('timeupdate', applyMode);
      v.removeEventListener('seeked', applyMode);
      v.textTracks.removeEventListener?.('addtrack', applyMode);
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
