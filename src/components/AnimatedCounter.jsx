import { useState, useRef, useEffect } from 'react';

export default function AnimatedCounter({ end, prefix = '', suffix = '', duration = 2000, color = '#00f0ff', label = '' }) {
  const [display, setDisplay] = useState(typeof end === 'number' ? 0 : end);
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
          // easeOutExpo
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          setDisplay(Math.round(eased * end));
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);

  return (
    <div className="metric-counter" ref={ref}>
      <div
        className="metric-counter-value"
        style={{
          color,
          textShadow: `0 0 40px ${color}44, 0 0 80px ${color}22`,
        }}
      >
        {prefix}{typeof end === 'number' ? display.toLocaleString() : end}{suffix}
      </div>
      {label && <div className="metric-counter-label">{label}</div>}
    </div>
  );
}
