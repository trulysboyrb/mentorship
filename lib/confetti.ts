// A short burst of confetti on a full-screen canvas. Browser only. Skipped when the
// device asks for reduced motion.
const COLORS = ["#6c579e", "#f5c542", "#ffffff", "#5a8ee6", "#ff5c5c"];

export function fireConfetti(count = 140, ms = 2600): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.cssText = `position:fixed;inset:0;width:${w}px;height:${h}px;pointer-events:none;z-index:9999`;
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const parts = Array.from({ length: count }, () => ({
    x: w / 2 + (Math.random() - 0.5) * 120,
    y: h * 0.6,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 15 - 6,
    s: 4 + Math.random() * 6,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    c: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));

  const start = performance.now();
  function frame(now: number) {
    const t = now - start;
    ctx!.clearRect(0, 0, w, h);
    const fade = t > ms - 600 ? Math.max(0, (ms - t) / 600) : 1;
    for (const p of parts) {
      p.vy += 0.42;
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx!.save();
      ctx!.globalAlpha = fade;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.r);
      ctx!.fillStyle = p.c;
      ctx!.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx!.restore();
    }
    if (t < ms) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
