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

const orbit = createOrbit({ yaw: 0.45, pitch: 0.4, autoSpin: 0.14 });
mountHint(stage, ["Drag to orbit", "Scroll to zoom", "Hover to tilt"]);
bindOrbit(canvas, orbit);

const state = {
  stick: 1,
  rate: 12,
  seedMode: "center",
  stuck: null,
  age: null,
  W: 0,
  H: 0,
  count: 0,
  maxR: 2,
  rng: mulberry32(7),
  running: true,
  last: performance.now(),
  points: [],
};

const N8 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];

function idx(x, y) {
  return y * state.W + x;
}

function rebuildPoints() {
  const pts = [];
  const cx = state.W / 2;
  const cy = state.H / 2;
  const scale = 1 / (Math.min(state.W, state.H) * 0.28);
  const maxAge = Math.max(1, state.count);
  for (let y = 0; y < state.H; y++) {
    for (let x = 0; x < state.W; x++) {
      if (!state.stuck[idx(x, y)]) continue;
      const t = state.age[idx(x, y)] / maxAge;
      pts.push({
        x: (x - cx) * scale,
        y: (cy - y) * scale,
        z: (t - 0.5) * 0.55,
        t,
      });
    }
  }
  state.points = pts;
}

function reset() {
  state.W = 140;
  state.H = 140;
  state.stuck = new Uint8Array(state.W * state.H);
  state.age = new Float32Array(state.W * state.H);
  state.count = 0;
  state.maxR = 2;
  state.rng = mulberry32((Math.random() * 1e9) | 0);
  state.running = true;

  const cx = (state.W / 2) | 0;
  const cy = (state.H / 2) | 0;
  const stick = (x, y) => {
    if (x < 0 || y < 0 || x >= state.W || y >= state.H) return;
    state.stuck[idx(x, y)] = 1;
    state.age[idx(x, y)] = state.count++;
  };

  if (state.seedMode === "center") stick(cx, cy);
  else if (state.seedMode === "line") {
    for (let x = 0; x < state.W; x++) stick(x, state.H - 3);
  } else {
    const r = Math.min(state.W, state.H) * 0.18;
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      stick((cx + Math.cos(a) * r) | 0, (cy + Math.sin(a) * r) | 0);
    }
  }
  rebuildPoints();
  hideHint(stage);
}

function touches(x, y) {
  for (const [dx, dy] of N8) {
    const nx = x + dx,
      ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= state.W || ny >= state.H) continue;
    if (state.stuck[idx(nx, ny)]) return true;
  }
  return false;
}

function walkOnce() {
  const cx = state.W / 2;
  const cy = state.H / 2;
  const killR = Math.min(state.W, state.H) * 0.48;
  const launch = Math.min(killR, state.maxR + 10);
  const a = state.rng() * Math.PI * 2;
  let x, y;
  if (state.seedMode === "line") {
    x = (state.rng() * state.W) | 0;
    y = 2;
  } else {
    x = (cx + Math.cos(a) * launch) | 0;
    y = (cy + Math.sin(a) * launch) | 0;
  }

  for (let step = 0; step < 2500; step++) {
    const dir = (state.rng() * 4) | 0;
    if (dir === 0) x++;
    else if (dir === 1) x--;
    else if (dir === 2) y++;
    else y--;
    if (x < 1 || y < 1 || x >= state.W - 1 || y >= state.H - 1) return false;
    const rr = Math.hypot(x - cx, y - cy);
    if (state.seedMode !== "line" && rr > killR) return false;
    if (touches(x, y) && state.rng() < state.stick) {
      state.stuck[idx(x, y)] = 1;
      state.age[idx(x, y)] = state.count++;
      if (rr > state.maxR) state.maxR = rr;
      // incremental point add
      const scale = 1 / (Math.min(state.W, state.H) * 0.28);
      state.points.push({
        x: (x - cx) * scale,
        y: (cy - y) * scale,
        z: (state.age[idx(x, y)] / Math.max(1, state.count) - 0.5) * 0.55,
        t: state.age[idx(x, y)] / Math.max(1, state.count),
      });
      return true;
    }
  }
  return false;
}

function frame(now) {
  const dt = Math.min(0.05, (now - state.last) / 1000);
  state.last = now;
  tickOrbit(orbit, dt);

  if (state.running) {
    for (let i = 0; i < state.rate; i++) walkOnce();
    if (state.count > state.W * state.H * 0.16) state.running = false;
  }

  const { w, h } = resizeCanvas(canvas, 1.4);
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);

  const drawn = state.points.map((p) => {
    const pr = project3D(p.x, p.y, p.z, orbit, w, h, 1.15);
    return { ...pr, t: p.t };
  });
  sortByDepth(drawn);
  for (const p of drawn) {
    const depth = Math.max(0.25, Math.min(1, 0.45 + p.z * 0.35));
    ctx.fillStyle = ritualColor(p.t * 0.85 + 0.08, 0.55 + depth * 0.4);
    ctx.fillRect(p.x, p.y, 1.4 * depth + 0.5, 1.4 * depth + 0.5);
  }

  requestAnimationFrame(frame);
}

bindRange("stick", (v) => (state.stick = v));
bindRange("rate", (v) => (state.rate = v));
document.getElementById("seedMode").addEventListener("change", (e) => {
  state.seedMode = e.target.value;
  reset();
});
document.getElementById("reset").addEventListener("click", reset);

reset();
requestAnimationFrame(frame);
