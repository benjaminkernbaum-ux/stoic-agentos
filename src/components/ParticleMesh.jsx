import { useRef, useEffect } from 'react';

export default function ParticleMesh({ particleCount = 40, color = '#00f0ff', speed = 0.3, connectionDistance = 120, style }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    const mouse = { x: -1000, y: -1000 };
    const particles = [];
    const rgb = hexToRgb(color);

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
      resize();
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          phase: Math.random() * Math.PI * 2,
          size: 1 + Math.random() * 2,
        });
      }
    }

    function onMouse(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }

    init();
    window.addEventListener('resize', () => resize());
    window.addEventListener('mousemove', onMouse);

    let t = 0;
    function draw() {
      t++;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Mouse scatter
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 1) {
          const force = (1 - dist / 120) * 0.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
        // Organic wandering
        p.vx += Math.sin(t * 0.01 + p.phase) * 0.01;
        p.vy += Math.cos(t * 0.01 + p.phase + 1) * 0.01;
        // Damping
        p.vx *= 0.97;
        p.vy *= 0.97;
        // Speed limit
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > speed * 2.5) { p.vx *= (speed * 2.5) / spd; p.vy *= (speed * 2.5) / spd; }

        p.x += p.vx;
        p.y += p.vy;
        // Wrap
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      }

      // Connections with glow
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance);
            // Subtle glow layer
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${rgb},${alpha * 0.06})`;
            ctx.lineWidth = 3;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            // Crisp line
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${rgb},${alpha * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Dots with glow
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulse = Math.sin(t * 0.03 + p.phase) * 0.3 + 0.7;
        // Outer glow
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        g.addColorStop(0, `rgba(${rgb},${0.2 * pulse})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();
        // Core dot
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb},${0.6 + pulse * 0.4})`;
        ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, [particleCount, color, speed, connectionDistance]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', ...style }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}

function hexToRgb(hex) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex.match(/\d+/g).slice(0, 3).join(',');
  }
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}
