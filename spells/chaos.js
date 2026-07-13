import { resizeCanvas, bindRange } from "../js/shared.js";

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: false });

const state = {
  kind: "clifford",
  density: 4,
  hue: 0.2,
  params: {
    a: -1.4,
    b: 1.6,
    c: 1.0,
    d: 0.7,
  },
  yaw: 0.4,
  pitch: 0.3,
  zoom: 1,
  dragging: false,
  lastX: 0,
  lastY: 0,
  ready: false,
};

function randomClifford() {
  return {
    a: -1.2 - Math.random() * 0.8,
    b: 1.2 + Math.random() * 0.8,
    c: 0.8 + Math.random() * 0.6,
    d: 0.5 + Math.random() * 0.6,
  };
}

function randomDeJong() {
  return {
    a: -2 + Math.random() * 4,
    b: -2 + Math.random() * 4,
    c: -2 + Math.random() * 4,
    d: -2 + Math.random() * 4,
  };
}

function reshuffle() {
  if (state.kind === "clifford") state.params = randomClifford();
  else if (state.kind === "dejong") state.params = randomDeJong();
  else if (state.kind === "aizawa")
    state.params = { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 };
  else state.params = { sigma: 10, rho: 28, beta: 8 / 3 };
  paint();
}

function useCanonical() {
  if (state.kind === "clifford")
    state.params = { a: -1.4, b: 1.6, c: 1.0, d: 0.7 };
  else if (state.kind === "dejong")
    state.params = { a: 1.4, b: -2.3, c: 2.4, d: -2.1 };
  else if (state.kind === "aizawa")
    state.params = { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 };
  else state.params = { sigma: 10, rho: 28, beta: 8 / 3 };
  paint();
}

function project3(x, y, z, w, h) {
  const cy = Math.cos(state.yaw),
    sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch),
    sp = Math.sin(state.pitch);
  let X = x * cy - z * sy;
  let Z = x * sy + z * cy;
  let Y = y * cp - Z * sp;
  Z = y * sp + Z * cp;
  const s = (Math.min(w, h) * 0.045 * state.zoom) / (1 + Z * 0.02);
  return [w * 0.5 + X * s, h * 0.5 + Y * s, Z];
}

function paint() {
  if (!state.ready || !state.params) return;
  const { w, h } = resizeCanvas(canvas, 1.5);
  const hits = new Float32Array(w * h);
  const depth = new Float32Array(w * h);
  const steps = (120000 * state.density) | 0;

  if (state.kind === "clifford" || state.kind === "dejong") {
    let x = 0.1,
      y = 0.1;
    const p = state.params;
    for (let i = 0; i < steps; i++) {
      let nx, ny;
      if (state.kind === "clifford") {
        nx = Math.sin(p.a * y) + p.c * Math.cos(p.a * x);
        ny = Math.sin(p.b * x) + p.d * Math.cos(p.b * y);
      } else {
        nx = Math.sin(p.a * y) - Math.cos(p.b * x);
        ny = Math.sin(p.c * x) - Math.cos(p.d * y);
      }
      x = nx;
      y = ny;
      const px = ((x + 2.5) / 5) * w;
      const py = ((y + 2.5) / 5) * h;
      const ix = px | 0;
      const iy = py | 0;
      if (ix >= 0 && iy >= 0 && ix < w && iy < h) hits[iy * w + ix]++;
    }
  } else {
    let x = 0.1,
      y = 0,
      z = 0;
    const p = state.params;
    const dt = 0.008;
    for (let i = 0; i < steps; i++) {
      let dx, dy, dz;
      if (state.kind === "lorenz") {
        dx = p.sigma * (y - x);
        dy = x * (p.rho - z) - y;
        dz = x * y - p.beta * z;
      } else {
        dx = (z - p.b) * x - p.d * y;
        dy = p.d * x + (z - p.b) * y;
        dz = p.c + p.a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + p.e * z) + p.f * z * x * x * x;
      }
      x += dx * dt;
      y += dy * dt;
      z += dz * dt;
      const [sx, sy, sz] = project3(x, y, z, w, h);
      const ix = sx | 0;
      const iy = sy | 0;
      if (ix >= 0 && iy >= 0 && ix < w && iy < h) {
        const idx = iy * w + ix;
        hits[idx]++;
        depth[idx] += sz;
      }
    }
  }

  let max = 0;
  for (let i = 0; i < hits.length; i++) if (hits[i] > max) max = hits[i];
  const logMax = Math.log1p(max);

  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 5;
    data[i * 4 + 1] = 4;
    data[i * 4 + 2] = 3;
    data[i * 4 + 3] = 255;
  }

  for (let i = 0; i < hits.length; i++) {
    if (!hits[i]) continue;
    const v = Math.pow(Math.log1p(hits[i]) / logMax, 0.85);
    const t = (v * 0.75 + state.hue) % 1;
    let r, g, b;
    if (t < 0.45) {
      const u = t / 0.45;
      r = 190 + u * 50;
      g = 55 + u * 50;
      b = 28 + u * 25;
    } else if (t < 0.7) {
      const u = (t - 0.45) / 0.25;
      r = 230 - u * 30;
      g = 190 + u * 35;
      b = 150 + u * 40;
    } else {
      const u = (t - 0.7) / 0.3;
      r = 70 + u * 50;
      g = 140 + u * 40;
      b = 110 + u * 35;
    }
    const o = i * 4;
    const a = Math.min(1, 0.25 + v * 0.95);
    data[o] = (data[o] * (1 - a) + r * a) | 0;
    data[o + 1] = (data[o + 1] * (1 - a) + g * a) | 0;
    data[o + 2] = (data[o + 2] * (1 - a) + b * a) | 0;
  }
  ctx.putImageData(img, 0, 0);
}

document.getElementById("attractor").addEventListener("change", (e) => {
  state.kind = e.target.value;
  useCanonical();
});

bindRange("density", (v) => {
  state.density = v;
  if (state.ready) paint();
});
bindRange("hue", (v) => {
  state.hue = v;
  if (state.ready) paint();
});

document.getElementById("reshuffle").addEventListener("click", reshuffle);

canvas.addEventListener("pointerdown", (e) => {
  state.dragging = true;
  state.lastX = e.clientX;
  state.lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", () => (state.dragging = false));
canvas.addEventListener("pointermove", (e) => {
  if (!state.dragging) return;
  if (state.kind === "clifford" || state.kind === "dejong") return;
  state.yaw += (e.clientX - state.lastX) * 0.01;
  state.pitch += (e.clientY - state.lastY) * 0.01;
  state.lastX = e.clientX;
  state.lastY = e.clientY;
  paint();
});
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    state.zoom *= e.deltaY > 0 ? 0.92 : 1.08;
    state.zoom = Math.max(0.3, Math.min(4, state.zoom));
    if (state.kind === "aizawa" || state.kind === "lorenz") paint();
  },
  { passive: false }
);

window.addEventListener("resize", () => paint());
state.ready = true;
useCanonical();
