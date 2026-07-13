import { resizeCanvas, bindRange, mulberry32 } from "../js/shared.js";

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

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

function reset() {
  const { w, h } = resizeCanvas(canvas, 1);
  // work on a coarser grid for speed
  state.W = Math.max(120, Math.min(320, (w / 2.5) | 0));
  state.H = Math.max(80, Math.min(200, (h / 2.5) | 0));
  state.stuck = new Uint8Array(state.W * state.H);
  state.age = new Float32Array(state.W * state.H);
  state.count = 0;
  state.maxR = 2;
  state.rng = mulberry32((Math.random() * 1e9) | 0);

  const cx = (state.W / 2) | 0;
  const cy = (state.H / 2) | 0;

  const stick = (x, y) => {
    if (x < 0 || y < 0 || x >= state.W || y >= state.H) return;
    state.stuck[idx(x, y)] = 1;
    state.age[idx(x, y)] = 0;
    state.count++;
  };

  if (state.seedMode === "center") {
    stick(cx, cy);
  } else if (state.seedMode === "line") {
    for (let x = 0; x < state.W; x++) stick(x, state.H - 2);
  } else {
    const r = Math.min(state.W, state.H) * 0.18;
    for (let a = 0; a < Math.PI * 2; a += 0.04) {
      stick((cx + Math.cos(a) * r) | 0, (cy + Math.sin(a) * r) | 0);
    }
  }

  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);
}

function touches(x, y) {
  for (const [dx, dy] of N8) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= state.W || ny >= state.H) continue;
    if (state.stuck[idx(nx, ny)]) return true;
  }
  return false;
}

function spawnWalker() {
  const cx = state.W / 2;
  const cy = state.H / 2;
  const R = Math.min(state.W, state.H) * 0.48;
  const launch = Math.min(R, state.maxR + 12);
  const a = state.rng() * Math.PI * 2;
  if (state.seedMode === "line") {
    return {
      x: (state.rng() * state.W) | 0,
      y: 2,
    };
  }
  return {
    x: (cx + Math.cos(a) * launch) | 0,
    y: (cy + Math.sin(a) * launch) | 0,
  };
}

function walkOnce() {
  let { x, y } = spawnWalker();
  const killR = Math.min(state.W, state.H) * 0.5;
  const cx = state.W / 2;
  const cy = state.H / 2;

  for (let step = 0; step < 4000; step++) {
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
      state.age[idx(x, y)] = state.count;
      state.count++;
      if (rr > state.maxR) state.maxR = rr;
      return true;
    }
  }
  return false;
}

function draw() {
  const { w, h } = resizeCanvas(canvas, 1);
  const img = ctx.createImageData(w, h);
  const data = img.data;
  const maxAge = Math.max(1, state.count);

  for (let py = 0; py < h; py++) {
    const gy = Math.min(state.H - 1, ((py / h) * state.H) | 0);
    for (let px = 0; px < w; px++) {
      const gx = Math.min(state.W - 1, ((px / w) * state.W) | 0);
      const o = (py * w + px) * 4;
      if (!state.stuck[idx(gx, gy)]) {
        data[o] = 5;
        data[o + 1] = 4;
        data[o + 2] = 3;
        data[o + 3] = 255;
        continue;
      }
      const t = state.age[idx(gx, gy)] / maxAge;
      // copper young → bone → verdigris old tips
      let r, g, b;
      if (t < 0.5) {
        const u = t / 0.5;
        r = 200 - u * 40;
        g = 70 + u * 100;
        b = 40 + u * 80;
      } else {
        const u = (t - 0.5) / 0.5;
        r = 160 - u * 90;
        g = 170 - u * 30;
        b = 120 + u * 20;
      }
      data[o] = r | 0;
      data[o + 1] = g | 0;
      data[o + 2] = b | 0;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function loop() {
  if (state.running) {
    for (let i = 0; i < state.rate; i++) walkOnce();
    // stop when structure fills
    if (state.count > state.W * state.H * 0.18) state.running = false;
  }
  draw();
  requestAnimationFrame(loop);
}

bindRange("stick", (v) => (state.stick = v));
bindRange("rate", (v) => (state.rate = v));
document.getElementById("seedMode").addEventListener("change", (e) => {
  state.seedMode = e.target.value;
  state.running = true;
  reset();
});
document.getElementById("reset").addEventListener("click", () => {
  state.running = true;
  reset();
});

window.addEventListener("resize", () => {
  state.running = true;
  reset();
});

reset();
requestAnimationFrame(loop);
