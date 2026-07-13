import { resizeCanvas, bindRange, mulberry32 } from "../js/shared.js";

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: false });

const PRESETS = {
  spots: { f: 0.035, k: 0.06, Da: 1.0, Db: 0.5 },
  stripes: { f: 0.035, k: 0.065, Da: 1.0, Db: 0.5 },
  maze: { f: 0.029, k: 0.057, Da: 1.0, Db: 0.5 },
  coral: { f: 0.0545, k: 0.062, Da: 1.0, Db: 0.5 },
};

let W = 160,
  H = 100;
let A, B, nA, nB;
let params = { ...PRESETS.spots };
let speed = 6;
let running = true;
let seed = 1;

function alloc() {
  A = new Float32Array(W * H);
  B = new Float32Array(W * H);
  nA = new Float32Array(W * H);
  nB = new Float32Array(W * H);
}

function reseed() {
  seed = (Math.random() * 1e9) | 0;
  const rng = mulberry32(seed);
  for (let i = 0; i < W * H; i++) {
    A[i] = 1;
    B[i] = 0;
  }
  const blobs = 8 + ((rng() * 12) | 0);
  for (let k = 0; k < blobs; k++) {
    const cx = (rng() * W) | 0;
    const cy = (rng() * H) | 0;
    const r = 2 + ((rng() * 5) | 0);
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r) continue;
        const ix = (cx + x + W) % W;
        const iy = (cy + y + H) % H;
        B[iy * W + ix] = 1;
      }
  }
}

function lap(arr, x, y) {
  const i = y * W + x;
  return (
    arr[((y - 1 + H) % H) * W + x] +
    arr[((y + 1) % H) * W + x] +
    arr[y * W + ((x - 1 + W) % W)] +
    arr[y * W + ((x + 1) % W)] +
    0.5 *
      (arr[((y - 1 + H) % H) * W + ((x - 1 + W) % W)] +
        arr[((y - 1 + H) % H) * W + ((x + 1) % W)] +
        arr[((y + 1) % H) * W + ((x - 1 + W) % W)] +
        arr[((y + 1) % H) * W + ((x + 1) % W)]) -
    6 * arr[i]
  );
}

function step() {
  const { f, k, Da, Db } = params;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = A[i];
      const b = B[i];
      const abb = a * b * b;
      nA[i] = a + 0.9 * (Da * lap(A, x, y) - abb + f * (1 - a));
      nB[i] = b + 0.9 * (Db * lap(B, x, y) + abb - (k + f) * b);
    }
  }
  const t = A;
  A = nA;
  nA = t;
  const u = B;
  B = nB;
  nB = u;
}

function draw() {
  const { w, h } = resizeCanvas(canvas, 1);
  // remap grid if canvas aspect changes a lot
  const targetW = Math.max(120, Math.min(220, (w / 4) | 0));
  const targetH = Math.max(75, Math.min(140, (h / 4) | 0));
  if (targetW !== W || targetH !== H) {
    W = targetW;
    H = targetH;
    alloc();
    reseed();
  }

  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let py = 0; py < h; py++) {
    const by = ((py / h) * H) | 0;
    for (let px = 0; px < w; px++) {
      const bx = ((px / w) * W) | 0;
      const v = Math.min(1, B[by * W + bx] * 2.4);
      const o = (py * w + px) * 4;
      // copper / bone / verdigris map
      const r = (18 + v * 200) | 0;
      const g = (22 + v * 110 + (1 - v) * 20) | 0;
      const b = (20 + v * 55 + (1 - v) * 35) | 0;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function loop() {
  if (running) {
    for (let i = 0; i < speed; i++) step();
  }
  draw();
  requestAnimationFrame(loop);
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
requestAnimationFrame(loop);
