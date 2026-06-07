import { useEffect, useRef, useState } from 'react';

/**
 * ═══════════════════════════════════════════════════════
 *  Cloudflare Turnstile — React Component
 * ═══════════════════════════════════════════════════════
 *  Renders the "Verify you are human" challenge widget.
 *  Uses the implicit rendering API for React compatibility.
 *
 *  Props:
 *    onVerify(token)  — called when user passes the challenge
 *    onExpire()       — called when the token expires (optional)
 *    onError()        — called on widget error (optional)
 *    theme            — 'dark' | 'light' | 'auto' (default: 'dark')
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

if (!SITE_KEY && typeof window !== 'undefined') {
  console.error('[Turnstile] ⚠️ VITE_TURNSTILE_SITE_KEY is not set — bot protection is DISABLED in this environment.');
}

export default function Turnstile({ onVerify, onExpire, onError, theme = 'dark' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // If no site key configured, auto-pass ONLY in dev builds
  useEffect(() => {
    if (!SITE_KEY && import.meta.env.DEV) {
      console.warn('[Turnstile] Dev mode — auto-passing verification');
      onVerify?.('dev-bypass-no-site-key');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the Turnstile script once
  useEffect(() => {
    if (!SITE_KEY) return;
    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }

    // Check if script tag already exists
    if (document.querySelector('script[src*="turnstile"]')) {
      const check = setInterval(() => {
        if (window.turnstile) {
          setScriptLoaded(true);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Render widget when script is loaded
  useEffect(() => {
    if (!SITE_KEY) return;
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;

    // Clean up previous widget
    if (widgetIdRef.current !== null) {
      try { window.turnstile.remove(widgetIdRef.current); } catch {}
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme,
      callback: (token) => onVerify?.(token),
      'expired-callback': () => onExpire?.(),
      'error-callback': () => onError?.(),
    });

    return () => {
      if (widgetIdRef.current !== null) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!SITE_KEY) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: '65px',
        margin: '4px 0',
      }}
    />
  );
}
