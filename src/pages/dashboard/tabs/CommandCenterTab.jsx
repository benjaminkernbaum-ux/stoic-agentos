import { useEffect, useRef } from 'react';

export default function CommandCenterTab() {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Auto-resize iframe to fill available space
    const resize = () => {
      if (iframeRef.current) {
        const top = iframeRef.current.getBoundingClientRect().top;
        iframeRef.current.style.height = `${window.innerHeight - top}px`;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="dash-content" style={{ padding: 0, overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        src="/command-center.html"
        title="Benjamin Command Center"
        style={{
          width: '100%',
          height: 'calc(100vh - 64px)',
          border: 'none',
          borderRadius: 0,
          background: '#0a0a0f',
        }}
        allow="clipboard-write"
      />
    </div>
  );
}
