import { resizeCanvas, bindRange, mulberry32, ritualColor } from "../js/shared.js";
import {
  createOrbit,
  tickOrbit,
  project3D,
  bindOrbit,
  mountHint,
  sortByDepth,
  hideHint,
} from "../js/interact.js";

const canvas = document.getElementById("c");
const stage = canvas.closest(".stage");
const ctx = canvas.getContext("2d");

const orbit = createOrbit({ yaw: 0.4, pitch: 0.35, autoSpin: 0.1 });
mountHint(stage, ["Drag to orbit", "Scroll to zoom", "Hover to tilt"]);
bindOrbit(canvas, orbit);

const state = {
  count: 6,
  G: 0.85,
  trailLen: 90,
  bodies: [],
  seed: 42,
  last: performance.now(),
};

function spawn() {
  const rng = mulberry32(state.seed++);
  state.bodies = [];
  for (let i = 0; i < state.count; i++) {
    const a = (i / state.count) * Math.PI * 2 + rng() * 0.35;
    const r = 0.35 + rng() * 0.35;
    const m = 0.8 + rng() * 1.8;
    const speed = (0.004 + rng() * 0.006) * Math.sqrt(state.G);
    state.bodies.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r * 0.7,
      z: Math.sin(a * 2) * 0.28,
      vx: -Math.sin(a) * speed,
      vy: Math.cos(a) * speed,
      vz: (rng() - 0.5) * speed * 0.6,
      m,
      hue: i / state.count,
      trail: [],
    });
  }
  hideHint(stage);
}

function integrate() {
  const soft = 0.14;
  const n = state.bodies.length;
  const ax = new Float32Array(n);
  const ay = new Float32Array(n);
  const az = new Float32Array(n);
  const G = 0.00055 * state.G;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = state.bodies[i];
      const b = state.bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const dist2 = dx * dx + dy * dy + dz * dz + soft * soft;
      const dist = Math.sqrt(dist2);
      const f = (G * a.m * b.m) / dist2;
      const fx = (f * dx) / dist;
      const fy = (f * dy) / dist;
      const fz = (f * dz) / dist;
      ax[i] += fx / a.m;
      ay[i] += fy / a.m;
      az[i] += fz / a.m;
      ax[j] -= fx / b.m;
      ay[j] -= fy / b.m;
      az[j] -= fz / b.m;
    }
  }

  for (let i = 0; i < n; i++) {
    const b = state.bodies[i];
    b.vx = (b.vx + ax[i]) * 0.996;
    b.vy = (b.vy + ay[i]) * 0.996;
    b.vz = (b.vz + az[i]) * 0.996;
    b.x += b.vx;
    b.y += b.vy;
    b.z += b.vz;
    // soft spherical cage
    const R = Math.hypot(b.x, b.y, b.z);
    if (R > 1.35) {
      b.x *= 1.35 / R;
      b.y *= 1.35 / R;
      b.z *= 1.35 / R;
      b.vx *= -0.4;
      b.vy *= -0.4;
      b.vz *= -0.4;
    }
    b.trail.push([b.x, b.y, b.z]);
    while (b.trail.length > state.trailLen) b.trail.shift();
  }
}

function draw() {
  const { w, h } = resizeCanvas(canvas, 1.5);
  ctx.fillStyle = "rgba(5,4,3,0.28)";
  ctx.fillRect(0, 0, w, h);

  for (const b of state.bodies) {
    if (b.trail.length < 2) continue;
    ctx.beginPath();
    for (let i = 0; i < b.trail.length; i++) {
      const [x, y, z] = b.trail[i];
      const p = project3D(x, y, z, orbit, w, h, 1.2);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = ritualColor(b.hue, 0.45);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  const dots = state.bodies.map((b) => {
    const p = project3D(b.x, b.y, b.z, orbit, w, h, 1.2);
    return { ...p, hue: b.hue, r: 3.5 + Math.sqrt(b.m) * 3.5 };
  });
  sortByDepth(dots);
  for (const p of dots) {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.4);
    g.addColorStop(0, ritualColor(p.hue, 0.95));
    g.addColorStop(1, ritualColor(p.hue, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = ritualColor(p.hue, 1);
    ctx.arc(p.x, p.y, p.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function loop(now) {
  const dt = Math.min(0.05, (now - state.last) / 1000);
  state.last = now;
  tickOrbit(orbit, dt);
  for (let i = 0; i < 2; i++) integrate();
  draw();
  requestAnimationFrame(loop);
}

bindRange("bodies", (v) => {
  state.count = v;
  spawn();
});
bindRange("G", (v) => (state.G = v));
bindRange("trail", (v) => (state.trailLen = v));
document.getElementById("reset").addEventListener("click", spawn);

spawn();
requestAnimationFrame(loop);
