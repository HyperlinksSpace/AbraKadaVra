import { resizeCanvas, mulberry32, ritualColor } from "./shared.js";

const canvas = document.getElementById("hero-canvas");
const ctx = canvas.getContext("2d");

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const particles = [];
const rng = mulberry32(0xab7ada);

for (let i = 0; i < 220; i++) {
  const r = 0.15 + Math.sqrt(i / 220) * 0.75;
  const a = i * GOLDEN;
  particles.push({
    i,
    baseR: r,
    a,
    phase: rng() * Math.PI * 2,
    speed: 0.15 + rng() * 0.35,
    size: 0.8 + rng() * 2.2,
  });
}

let t0 = performance.now();

function frame(now) {
  const { w, h } = resizeCanvas(canvas, 1.5);
  const t = (now - t0) * 0.001;
  const cx = w * 0.5;
  const cy = h * 0.48;
  const scale = Math.min(w, h) * 0.42;

  ctx.fillStyle = "rgba(14, 12, 10, 0.22)";
  ctx.fillRect(0, 0, w, h);

  // faint radial veil
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.4);
  g.addColorStop(0, "rgba(196, 92, 38, 0.07)");
  g.addColorStop(0.5, "rgba(61, 122, 104, 0.04)");
  g.addColorStop(1, "rgba(14, 12, 10, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  for (const p of particles) {
    const breathe = 1 + 0.04 * Math.sin(t * p.speed + p.phase);
    const r = p.baseR * scale * breathe;
    const ang = p.a + t * 0.08 * (0.5 + (p.i % 7) * 0.05);
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r * 0.92;
    const hueT = (p.i / particles.length + t * 0.03) % 1;
    ctx.beginPath();
    ctx.fillStyle = ritualColor(hueT, 0.35 + 0.35 * Math.sin(t + p.phase));
    ctx.arc(x, y, p.size * (w / 900 + 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  // central sigil ring
  ctx.strokeStyle = "rgba(232, 220, 200, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, scale * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, scale * 0.72 + Math.sin(t * 0.7) * 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(196, 92, 38, 0.18)";
  ctx.stroke();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
window.addEventListener("resize", () => resizeCanvas(canvas, 1.5));
