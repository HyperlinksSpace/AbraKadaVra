import { resizeCanvas, mulberry32, ritualColor } from "./shared.js";
import {
  createOrbit,
  tickOrbit,
  project3D,
  bindOrbit,
  sortByDepth,
} from "./interact.js";

const canvas = document.getElementById("hero-canvas");
const ctx = canvas.getContext("2d");

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const rng = mulberry32(0xab7ada);
const orbit = createOrbit({ yaw: 0.35, pitch: 0.42, autoSpin: 0.12, zoom: 1.05 });

// Soft interaction on the hero (drag/hover orbit; keep page scroll free)
bindOrbit(canvas, orbit, { wheel: false });

const shell = [];
for (let i = 0; i < 520; i++) {
  const frac = i / 520;
  const r = Math.sqrt(frac);
  const a = i * GOLDEN;
  shell.push({
    x: Math.cos(a) * r,
    y: Math.sin(a) * r * 0.9,
    z: (0.5 - frac) * 0.7 + Math.sin(a * 3) * 0.05,
    t: frac,
    r: 1.1 + frac * 2.4,
    phase: rng() * Math.PI * 2,
  });
}

// Inner chaos lace (Clifford sample projected to a sphere-ish volume)
const lace = [];
{
  let x = 0.1,
    y = 0.1;
  const a = -1.4,
    b = 1.6,
    c = 1.0,
    d = 0.7;
  for (let i = 0; i < 3500; i++) {
    const nx = Math.sin(a * y) + c * Math.cos(a * x);
    const ny = Math.sin(b * x) + d * Math.cos(b * y);
    x = nx;
    y = ny;
    if (i < 80) continue;
    lace.push({
      x: x * 0.28,
      y: y * 0.28,
      z: Math.sin(x + y * 1.3) * 0.22,
      t: ((i * 0.0017) % 1),
      r: 1.05,
      phase: (i * 0.01) % (Math.PI * 2),
    });
  }
}

const rings = [0.42, 0.58, 0.74].map((radius, i) => ({
  radius,
  tilt: 0.35 + i * 0.18,
  speed: 0.25 + i * 0.08,
  phase: i * 1.1,
}));

let t0 = performance.now();
let last = t0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickOrbit(orbit, dt);

  const { w, h } = resizeCanvas(canvas, 1.5);
  const t = (now - t0) * 0.001;

  ctx.fillStyle = "rgba(14, 12, 10, 0.28)";
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.48;

  // atmospheric glow in screen space
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.55);
  g.addColorStop(0, "rgba(196, 92, 38, 0.09)");
  g.addColorStop(0.45, "rgba(61, 122, 104, 0.05)");
  g.addColorStop(1, "rgba(14, 12, 10, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const drawn = [];

  for (const p of shell) {
    const breathe = 1 + 0.035 * Math.sin(t * 1.1 + p.phase);
    const pr = project3D(
      p.x * breathe,
      p.y * breathe + Math.sin(t * 0.8 + p.phase) * 0.02,
      p.z * breathe,
      orbit,
      w,
      h,
      1.35
    );
    drawn.push({
      ...pr,
      t: p.t,
      r: p.r,
      a: 0.35 + 0.45 * ((p.z + 1) * 0.35 + 0.4),
    });
  }

  for (const p of lace) {
    const pr = project3D(
      p.x,
      p.y + Math.sin(t * 1.3 + p.phase) * 0.015,
      p.z,
      orbit,
      w,
      h,
      1.35
    );
    drawn.push({
      ...pr,
      t: (p.t + t * 0.04) % 1,
      r: p.r,
      a: 0.55,
    });
  }

  sortByDepth(drawn);
  for (const p of drawn) {
    const depth = Math.max(0.2, Math.min(1, 0.4 + p.z * 0.35));
    ctx.beginPath();
    ctx.fillStyle = ritualColor((p.t + t * 0.02) % 1, (p.a || 0.5) * depth);
    ctx.arc(p.x, p.y, Math.max(0.55, p.r * depth * 0.55 * (w / 1100 + 0.55)), 0, Math.PI * 2);
    ctx.fill();
  }

  // orbital rings in 3D
  for (const ring of rings) {
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2 + t * ring.speed + ring.phase;
      const x = Math.cos(a) * ring.radius;
      const z = Math.sin(a) * ring.radius;
      const y = Math.sin(a * 2 + t * 0.4) * 0.04;
      // tilt around x
      const yt = y * Math.cos(ring.tilt) - z * Math.sin(ring.tilt);
      const zt = y * Math.sin(ring.tilt) + z * Math.cos(ring.tilt);
      const p = project3D(x, yt, zt, orbit, w, h, 1.35);
      if (first) {
        ctx.moveTo(p.x, p.y);
        first = false;
      } else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle =
      ring.radius < 0.5
        ? "rgba(232, 220, 200, 0.16)"
        : "rgba(196, 92, 38, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
window.addEventListener("resize", () => resizeCanvas(canvas, 1.5));
