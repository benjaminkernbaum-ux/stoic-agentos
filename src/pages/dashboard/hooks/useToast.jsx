import { useState, useCallback } from 'react';

let _toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'info') => {
    const id = ++_toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: t.type === 'error' ? 'rgba(255,71,87,0.15)' : t.type === 'success' ? 'rgba(0,230,138,0.15)' : 'rgba(155,89,255,0.15)',
          border: `1px solid ${t.type === 'error' ? 'rgba(255,71,87,0.4)' : t.type === 'success' ? 'rgba(0,230,138,0.4)' : 'rgba(155,89,255,0.4)'}`,
          color: t.type === 'error' ? '#ff4757' : t.type === 'success' ? '#00e68a' : '#9b59ff',
          backdropFilter: 'blur(12px)',
          maxWidth: 320,
        }}>
          {t.type === 'error' ? '✕ ' : t.type === 'success' ? '✓ ' : 'ℹ '}{t.msg}
        </div>
      ))}
    </div>
  );
}
