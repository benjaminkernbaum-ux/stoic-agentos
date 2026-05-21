import { useRef, useEffect, useCallback } from 'react';

export default function NeuralHeroCanvas() {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef(null);

  const initNodes = useCallback((w, h) => {
    const nodes = [];
    // Main network nodes
    for (let i = 0; i < 120; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.15 ? 300 : Math.random() < 0.3 ? 160 : 185, // cyan/green/magenta mix
        brightness: 0.4 + Math.random() * 0.6,
      });
    }
    nodesRef.current = nodes;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;

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
      if (nodesRef.current.length === 0) initNodes(w, h);
    }

    function onMouse(e) {
      const rect = canvas.parentElement.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);

    let t = 0;
    function draw() {
      t++;
      // Deep space background with subtle gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#06060c');
      bg.addColorStop(0.5, '#0a0a14');
      bg.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Distant star field
      if (t === 1 || t % 120 === 0) {
        // Stars are drawn every frame but they don't change much
      }
      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      for (let i = 0; i < 60; i++) {
        const sx = (Math.sin(i * 127.1 + 311.7) * 0.5 + 0.5) * w;
        const sy = (Math.sin(i * 269.5 + 183.3) * 0.5 + 0.5) * h;
        const twinkle = Math.sin(t * 0.01 + i * 2) * 0.5 + 0.5;
        ctx.globalAlpha = 0.15 + twinkle * 0.25;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5 + twinkle * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const nodes = nodesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Central breathing orb
      const orbX = w * 0.5, orbY = h * 0.45;
      const orbPulse = Math.sin(t * 0.015) * 0.3 + 0.7;
      const orbR = Math.min(w, h) * 0.12 * orbPulse;
      const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR);
      orbGrad.addColorStop(0, `rgba(0,240,255,${0.06 * orbPulse})`);
      orbGrad.addColorStop(0.5, `rgba(0,240,255,${0.02 * orbPulse})`);
      orbGrad.addColorStop(1, 'rgba(0,240,255,0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0,240,255,${0.04 * orbPulse})`;
      ctx.lineWidth = 1;
      ctx.arc(orbX, orbY, orbR * 1.5, 0, Math.PI * 2);
      ctx.stroke();

      // Update node positions
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        // Mouse attraction
        const dx = mx - n.x, dy = my - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 280 && dist > 1) {
          const force = 0.012 * (1 - dist / 280);
          n.vx += (dx / dist) * force;
          n.vy += (dy / dist) * force;
        }
        // Gentle central gravity
        const cdx = orbX - n.x, cdy = orbY - n.y;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cdist > 50) {
          n.vx += (cdx / cdist) * 0.003;
          n.vy += (cdy / cdist) * 0.003;
        }
        // Random wandering
        n.vx += (Math.random() - 0.5) * 0.008;
        n.vy += (Math.random() - 0.5) * 0.008;
        // Damping
        n.vx *= 0.993;
        n.vy *= 0.993;
        n.x += n.vx;
        n.y += n.vy;
        // Soft bounce
        if (n.x < 0) { n.x = 0; n.vx = Math.abs(n.vx) * 0.5; }
        if (n.x > w) { n.x = w; n.vx = -Math.abs(n.vx) * 0.5; }
        if (n.y < 0) { n.y = 0; n.vy = Math.abs(n.vy) * 0.5; }
        if (n.y > h) { n.y = h; n.vy = -Math.abs(n.vy) * 0.5; }
      }

      // Draw connections with gradient shimmer
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.18;
            const shimmer = Math.sin(t * 0.02 + i * 0.5 + j * 0.3) * 0.5 + 0.5;
            const h1 = nodes[i].hue, h2 = nodes[j].hue;
            ctx.beginPath();
            const lg = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
            lg.addColorStop(0, `hsla(${h1},100%,65%,${alpha * (0.7 + shimmer * 0.3)})`);
            lg.addColorStop(1, `hsla(${h2},100%,65%,${alpha * (0.7 + shimmer * 0.3)})`);
            ctx.strokeStyle = lg;
            ctx.lineWidth = 0.6;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes with multi-layer glow
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pulse = Math.sin(t * 0.025 + n.phase) * 0.5 + 0.5;
        const r = n.r * (0.7 + pulse * 0.5);

        // Outer glow
        const g1 = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5);
        g1.addColorStop(0, `hsla(${n.hue},100%,70%,${0.12 * n.brightness * pulse})`);
        g1.addColorStop(1, `hsla(${n.hue},100%,70%,0)`);
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 5, 0, Math.PI * 2);
        ctx.fill();

        // Core
        const g2 = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 1.5);
        g2.addColorStop(0, `hsla(${n.hue},100%,85%,${0.8 * n.brightness})`);
        g2.addColorStop(0.6, `hsla(${n.hue},100%,65%,${0.3 * n.brightness})`);
        g2.addColorStop(1, `hsla(${n.hue},100%,50%,0)`);
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 1.5, 0, Math.PI * 2);
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
  }, [initNodes]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(to top, var(--bg-primary, #0a0a1a), transparent)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}
