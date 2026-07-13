import { resizeCanvas, bindRange, mulberry32, clamp, ritualColor } from "../js/shared.js";
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

const orbit = createOrbit({ yaw: 0.35, pitch: 0.7, autoSpin: 0.11 });
mountHint(stage, ["Drag to orbit", "Scroll to zoom", "Click stage to seed"]);
bindOrbit(canvas, orbit);

const PRESETS = {
  spots: { f: 0.035, k: 0.06, Da: 1.0, Db: 0.5 },
  stripes: { f: 0.035, k: 0.065, Da: 1.0, Db: 0.5 },
  maze: { f: 0.029, k: 0.057, Da: 1.0, Db: 0.5 },
  coral: { f: 0.0545, k: 0.062, Da: 1.0, Db: 0.5 },
};

let W = 96,
  H = 64;
let A, B, nA, nB;
let params = { ...PRESETS.spots };
let speed = 6;
let running = true;
let last = performance.now();

function alloc() {
  A = new Float32Array(W * H);
  B = new Float32Array(W * H);
  nA = new Float32Array(W * H);
  nB = new Float32Array(W * H);
}

function reseed() {
  const rng = mulberry32((Math.random() * 1e9) | 0);
  for (let i = 0; i < W * H; i++) {
    A[i] = 1;
    B[i] = 0;
  }
  const blobs = 8 + ((rng() * 12) | 0);
  for (let k = 0; k < blobs; k++) {
    const cx = (rng() * W) | 0;
    const cy = (rng() * H) | 0;
    const r = 2 + ((rng() * 4) | 0);
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r) continue;
        B[((cy + y + H) % H) * W + ((cx + x + W) % W)] = 1;
      }
  }
  hideHint(stage);
}

function lap(arr, x, y) {
  return (
    arr[((y - 1 + H) % H) * W + x] +
    arr[((y + 1) % H) * W + x] +
    arr[y * W + ((x - 1 + W) % W)] +
    arr[y * W + ((x + 1) % W)] -
    4 * arr[y * W + x]
  );
}

function step() {
  const { f, k, Da, Db } = params;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = A[i],
        b = B[i];
      const abb = a * b * b;
      nA[i] = a + 0.9 * (Da * lap(A, x, y) - abb + f * (1 - a));
      nB[i] = b + 0.9 * (Db * lap(B, x, y) + abb - (k + f) * b);
    }
  }
  let t = A;
  A = nA;
  nA = t;
  t = B;
  B = nB;
  nB = t;
}

function seedAt(nx, ny) {
  const x = ((nx * 0.5 + 0.5) * W) | 0;
  const y = ((0.5 - ny * 0.5) * H) | 0;
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dy * dy > 10) continue;
      const ix = (x + dx + W) % W;
      const iy = (y + dy + H) % H;
      B[iy * W + ix] = 1;
    }
}

canvas.addEventListener("pointerup", (e) => {
  if (orbit.moved) return;
  const rect = canvas.getBoundingClientRect();
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  seedAt(nx, -ny);
  hideHint(stage);
});

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickOrbit(orbit, dt);

  if (running) for (let i = 0; i < speed; i++) step();

  const { w, h } = resizeCanvas(canvas, 1.35);
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);

  const pts = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const v = clamp(B[y * W + x] * 2.2, 0, 1);
      if (v < 0.1) continue;
      pts.push({
        x: (x / W - 0.5) * 2.2,
        y: (0.5 - y / H) * 1.45,
        z: v * 0.55 - 0.08,
        t: v,
        r: 1.2 + v * 2.4,
      });
    }
  }

  const drawn = pts.map((p) => {
    const pr = project3D(p.x, p.y, p.z, orbit, w, h, 1.05);
    return { ...pr, t: p.t, r: p.r };
  });
  sortByDepth(drawn);
  for (const p of drawn) {
    const depth = Math.max(0.25, Math.min(1, 0.4 + p.z * 0.4));
    ctx.beginPath();
    ctx.fillStyle = ritualColor(p.t * 0.85 + 0.05, 0.55 + depth * 0.4);
    ctx.arc(p.x, p.y, Math.max(0.7, p.r * depth * 0.55), 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(frame);
}

document.getElementById("preset").addEventListener("change", (e) => {
  params = { ...PRESETS[e.target.value] };
  reseed();
});
bindRange("speed", (v) => (speed = v));
document.getElementById("seed").addEventListener("click", reseed);
document.getElementById("pause").addEventListener("click", (e) => {
  running = !running;
  e.target.textContent = running ? "Pause" : "Resume";
});

alloc();
reseed();
requestAnimationFrame(frame);
