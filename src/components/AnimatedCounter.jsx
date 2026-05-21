import { useState, useRef, useEffect } from 'react';

export default function AnimatedCounter({ end, prefix = '', suffix = '', duration = 2000, color = '#00f0ff', label = '' }) {
  const [display, setDisplay] = useState(typeof end === 'number' ? 0 : end);
  const [done, setDone] = useState(false);
  const ref = useRef(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (typeof end !== 'number' || triggered.current) return;
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !triggered.current) {
        triggered.current = true;
        obs.disconnect();
        const start = performance.now();
        function step(now) {
          const t = Math.min((now - start) / duration, 1);
          // Spring easing (overshoot + settle)
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.cos((t * 10 - 0.75) * (2 * Math.PI / 3) * 0.15 + 1);
          setDisplay(Math.round(Math.min(eased, 1) * end));
          if (t < 1) {
            requestAnimationFrame(step);
          } else {
            setDone(true);
          }
        }
        requestAnimationFrame(step);
      }
    }, { threshold: 0.2 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);

  // For non-number values like ∞, trigger done immediately when visible
  useEffect(() => {
    if (typeof end === 'number') return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setDone(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end]);

  return (
    <div className={`metric-counter ${done ? 'metric-counter-done' : ''}`} ref={ref}>
      <div
        className="metric-counter-value"
        style={{
          color,
          textShadow: done
            ? `0 0 30px ${color}66, 0 0 60px ${color}33, 0 0 100px ${color}18`
            : `0 0 20px ${color}22`,
        }}
      >
        {prefix}{typeof end === 'number' ? display.toLocaleString() : end}{suffix}
      </div>
      {label && <div className="metric-counter-label">{label}</div>}
      {/* Glow ring that appears on completion */}
      <div className="metric-counter-ring" style={{
        borderColor: done ? `${color}15` : 'transparent',
        boxShadow: done ? `inset 0 0 30px ${color}08, 0 0 20px ${color}06` : 'none',
      }} />
    </div>
  );
}
