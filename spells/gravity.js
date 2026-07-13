import { resizeCanvas, bindRange, mulberry32, ritualColor } from "../js/shared.js";

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const state = {
  count: 6,
  G: 0.85,
  trailLen: 100,
  bodies: [],
  seed: 42,
};

function spawn() {
  const { w, h } = resizeCanvas(canvas, 1.5);
  const rng = mulberry32(state.seed++);
  state.bodies = [];
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (let i = 0; i < state.count; i++) {
    const a = (i / state.count) * Math.PI * 2 + rng() * 0.4;
    const r = Math.min(w, h) * (0.18 + rng() * 0.22);
    const m = 12 + rng() * 40;
    const speed = (0.6 + rng() * 0.8) * Math.sqrt(state.G * 80 / r);
    state.bodies.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
      vx: -Math.sin(a) * speed * (0.7 + rng() * 0.5),
      vy: Math.cos(a) * speed * (0.7 + rng() * 0.5),
      m,
      hue: i / state.count,
      trail: [],
    });
  }
}

function integrate() {
  const soft = 18;
  const n = state.bodies.length;
  const ax = new Float32Array(n);
  const ay = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = state.bodies[i];
      const b = state.bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist2 = dx * dx + dy * dy + soft * soft;
      const dist = Math.sqrt(dist2);
      const f = (state.G * a.m * b.m) / dist2;
      const fx = (f * dx) / dist;
      const fy = (f * dy) / dist;
      ax[i] += fx / a.m;
      ay[i] += fy / a.m;
      ax[j] -= fx / b.m;
      ay[j] -= fy / b.m;
    }
  }

  const { w, h } = { w: canvas.width, h: canvas.height };
  for (let i = 0; i < n; i++) {
    const b = state.bodies[i];
    b.vx += ax[i];
    b.vy += ay[i];
    // mild drag to keep the dance readable
    b.vx *= 0.9992;
    b.vy *= 0.9992;
    b.x += b.vx;
    b.y += b.vy;

    // soft walls — bounce gently
    if (b.x < 20) {
      b.x = 20;
      b.vx *= -0.6;
    }
    if (b.x > w - 20) {
      b.x = w - 20;
      b.vx *= -0.6;
    }
    if (b.y < 20) {
      b.y = 20;
      b.vy *= -0.6;
    }
    if (b.y > h - 20) {
      b.y = h - 20;
      b.vy *= -0.6;
    }

    b.trail.push([b.x, b.y]);
    while (b.trail.length > state.trailLen) b.trail.shift();
  }
}

function draw() {
  const { w, h } = resizeCanvas(canvas, 1.5);
  if (!state.bodies.length) spawn();

  ctx.fillStyle = "rgba(5, 4, 3, 0.22)";
  ctx.fillRect(0, 0, w, h);

  for (const b of state.bodies) {
    if (b.trail.length < 2) continue;
    ctx.beginPath();
    ctx.strokeStyle = ritualColor(b.hue, 0.55);
    ctx.lineWidth = 1.25;
    ctx.lineJoin = "round";
    ctx.moveTo(b.trail[0][0], b.trail[0][1]);
    for (let i = 1; i < b.trail.length; i++) {
      ctx.lineTo(b.trail[i][0], b.trail[i][1]);
    }
    ctx.stroke();
  }

  for (const b of state.bodies) {
    const r = Math.sqrt(b.m) * 0.9;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 3);
    g.addColorStop(0, ritualColor(b.hue, 0.9));
    g.addColorStop(1, ritualColor(b.hue, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = ritualColor(b.hue, 1);
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function loop() {
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

window.addEventListener("resize", () => {
  resizeCanvas(canvas, 1.5);
  spawn();
});

spawn();
requestAnimationFrame(loop);
