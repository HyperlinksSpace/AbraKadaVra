import { resizeCanvas, bindRange } from "../js/shared.js";
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

const orbit = createOrbit({ yaw: 0.5, pitch: 0.28, autoSpin: 0.12 });
mountHint(stage, ["Drag to orbit", "Scroll to zoom", "Hover to tilt"]);
bindOrbit(canvas, orbit);

const state = {
  kind: "clifford",
  density: 4,
  hue: 0.2,
  params: { a: -1.4, b: 1.6, c: 1.0, d: 0.7 },
  points: [],
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

function useCanonical() {
  if (state.kind === "clifford") state.params = { a: -1.4, b: 1.6, c: 1.0, d: 0.7 };
  else if (state.kind === "dejong") state.params = { a: 1.4, b: -2.3, c: 2.4, d: -2.1 };
  else if (state.kind === "aizawa")
    state.params = { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 };
  else state.params = { sigma: 10, rho: 28, beta: 8 / 3 };
  rebuild();
}

function reshuffle() {
  if (state.kind === "clifford") state.params = randomClifford();
  else if (state.kind === "dejong") state.params = randomDeJong();
  else useCanonical();
  rebuild();
}

function rebuild() {
  const n = 18000 * state.density;
  const pts = [];
  const p = state.params;

  if (state.kind === "clifford" || state.kind === "dejong") {
    let x = 0.1,
      y = 0.1;
    for (let i = 0; i < n; i++) {
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
      if (i < 80) continue;
      pts.push({
        x: x * 0.48,
        y: y * 0.48,
        z: Math.sin(x * 1.1 + y * 0.8) * 0.32,
        t: (i / n) % 1,
      });
    }
  } else {
    let x = 0.1,
      y = 0,
      z = 0;
    const dt = 0.008;
    for (let i = 0; i < n; i++) {
      let dx, dy, dz;
      if (state.kind === "lorenz") {
        dx = p.sigma * (y - x);
        dy = x * (p.rho - z) - y;
        dz = x * y - p.beta * z;
      } else {
        dx = (z - p.b) * x - p.d * y;
        dy = p.d * x + (z - p.b) * y;
        dz =
          p.c +
          p.a * z -
          (z * z * z) / 3 -
          (x * x + y * y) * (1 + p.e * z) +
          p.f * z * x * x * x;
      }
      x += dx * dt;
      y += dy * dt;
      z += dz * dt;
      if (i < 200) continue;
      const s = state.kind === "lorenz" ? 0.045 : 0.22;
      pts.push({ x: x * s, y: y * s, z: z * s, t: (i / n) % 1 });
    }
  }
  state.points = pts;
}

function colorAt(t, v) {
  const x = (t * 0.75 + state.hue) % 1;
  let r, g, b;
  if (x < 0.45) {
    const u = x / 0.45;
    r = 190 + u * 50;
    g = 55 + u * 50;
    b = 28 + u * 25;
  } else if (x < 0.7) {
    const u = (x - 0.45) / 0.25;
    r = 230 - u * 30;
    g = 190 + u * 35;
    b = 150 + u * 40;
  } else {
    const u = (x - 0.7) / 0.3;
    r = 70 + u * 50;
    g = 140 + u * 40;
    b = 110 + u * 35;
  }
  return `rgba(${r | 0},${g | 0},${b | 0},${(0.35 + v * 0.6).toFixed(3)})`;
}

let last = performance.now();
let t0 = last;

function frame(now) {
  if (!state.ready) {
    requestAnimationFrame(frame);
    return;
  }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const tSec = (now - t0) * 0.001;
  tickOrbit(orbit, dt);

  const { w, h } = resizeCanvas(canvas, 1.5);
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);

  const drawn = [];
  const bob = Math.sin(tSec * 0.9) * 0.02;
  for (let i = 0; i < state.points.length; i += 2) {
    const p = state.points[i];
    const pr = project3D(p.x, p.y + bob, p.z, orbit, w, h, 1.15);
    drawn.push({ ...pr, t: p.t });
  }
  sortByDepth(drawn);

  for (const p of drawn) {
    const depth = Math.max(0.2, Math.min(1, 0.4 + (p.z + 1) * 0.35));
    ctx.fillStyle = colorAt(p.t + tSec * 0.02, depth);
    ctx.fillRect(p.x, p.y, 1.2 * depth + 0.4, 1.2 * depth + 0.4);
  }

  requestAnimationFrame(frame);
}

document.getElementById("attractor").addEventListener("change", (e) => {
  state.kind = e.target.value;
  useCanonical();
  hideHint(stage);
});
bindRange("density", (v) => {
  state.density = v;
  if (state.ready) rebuild();
});
bindRange("hue", (v) => {
  state.hue = v;
});
document.getElementById("reshuffle").addEventListener("click", () => {
  reshuffle();
  hideHint(stage);
});

window.addEventListener("resize", () => resizeCanvas(canvas, 1.5));
state.ready = true;
useCanonical();
requestAnimationFrame(frame);
