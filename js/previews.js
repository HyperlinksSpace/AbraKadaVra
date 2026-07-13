import { resizeCanvas, mulberry32, ritualColor, clamp } from "./shared.js";

function previewChaos(canvas) {
  const ctx = canvas.getContext("2d");
  const { w, h } = resizeCanvas(canvas, 1);
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);

  // Clifford attractor sample
  let x = 0.1,
    y = 0.1;
  const a = -1.4,
    b = 1.6,
    c = 1.0,
    d = 0.7;
  const img = ctx.createImageData(w, h);
  const data = img.data;
  const hits = new Float32Array(w * h);

  for (let i = 0; i < 80000; i++) {
    const nx = Math.sin(a * y) + c * Math.cos(a * x);
    const ny = Math.sin(b * x) + d * Math.cos(b * y);
    x = nx;
    y = ny;
    const px = ((x + 2.2) / 4.4) * w;
    const py = ((y + 2.2) / 4.4) * h;
    const ix = (px | 0);
    const iy = (py | 0);
    if (ix >= 0 && iy >= 0 && ix < w && iy < h) hits[iy * w + ix]++;
  }

  let max = 0;
  for (let i = 0; i < hits.length; i++) max = Math.max(max, hits[i]);
  for (let i = 0; i < hits.length; i++) {
    const v = hits[i] / max;
    if (v <= 0) continue;
    const t = Math.pow(v, 0.35);
    const r = (180 + t * 60) | 0;
    const g = (40 + t * 80) | 0;
    const b = (30 + t * 40) | 0;
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = (40 + t * 200) | 0;
  }
  ctx.putImageData(img, 0, 0);
}

function previewTuring(canvas) {
  const ctx = canvas.getContext("2d");
  const { w, h } = resizeCanvas(canvas, 1);
  const n = Math.min(80, w);
  const m = Math.min(50, h);
  const rng = mulberry32(77);
  let A = new Float32Array(n * m);
  let B = new Float32Array(n * m);
  for (let i = 0; i < A.length; i++) {
    A[i] = 1;
    B[i] = 0;
  }
  for (let k = 0; k < 40; k++) {
    const x = (rng() * n) | 0;
    const y = (rng() * m) | 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const i = ((y + dy + m) % m) * n + ((x + dx + n) % n);
        B[i] = 1;
      }
  }
  const Da = 1.0,
    Db = 0.5,
    f = 0.037,
    k = 0.06;
  const lap = (arr, x, y) => {
    const i = y * n + x;
    return (
      arr[((y - 1 + m) % m) * n + x] +
      arr[((y + 1) % m) * n + x] +
      arr[y * n + ((x - 1 + n) % n)] +
      arr[y * n + ((x + 1) % n)] -
      4 * arr[i]
    );
  };
  for (let step = 0; step < 120; step++) {
    const nA = new Float32Array(A.length);
    const nB = new Float32Array(B.length);
    for (let y = 0; y < m; y++)
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const a = A[i],
          b = B[i];
        const abb = a * b * b;
        nA[i] = a + Da * lap(A, x, y) - abb + f * (1 - a);
        nB[i] = b + Db * lap(B, x, y) + abb - (k + f) * b;
      }
    A = nA;
    B = nB;
  }
  const img = ctx.createImageData(w, h);
  for (let py = 0; py < h; py++)
    for (let px = 0; px < w; px++) {
      const x = ((px / w) * n) | 0;
      const y = ((py / h) * m) | 0;
      const v = clamp(B[y * n + x] * 2.2, 0, 1);
      const o = (py * w + px) * 4;
      img.data[o] = (20 + v * 180) | 0;
      img.data[o + 1] = (40 + v * 100) | 0;
      img.data[o + 2] = (35 + v * 60) | 0;
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
}

function previewPhyllo(canvas) {
  const ctx = canvas.getContext("2d");
  const { w, h } = resizeCanvas(canvas, 1);
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2,
    cy = h / 2;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const N = 400;
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt(i / N) * Math.min(w, h) * 0.42;
    const a = i * golden;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    ctx.beginPath();
    ctx.fillStyle = ritualColor(i / N, 0.85);
    ctx.arc(x, y, 1.2 + (i / N) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function previewGravity(canvas) {
  const ctx = canvas.getContext("2d");
  const { w, h } = resizeCanvas(canvas, 1);
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(99);
  const bodies = [];
  for (let i = 0; i < 5; i++) {
    bodies.push({
      x: w * (0.25 + rng() * 0.5),
      y: h * (0.25 + rng() * 0.5),
      vx: (rng() - 0.5) * 1.2,
      vy: (rng() - 0.5) * 1.2,
      m: 8 + rng() * 20,
      trail: [],
    });
  }
  for (let step = 0; step < 400; step++) {
    for (let i = 0; i < bodies.length; i++) {
      let ax = 0,
        ay = 0;
      for (let j = 0; j < bodies.length; j++) {
        if (i === j) continue;
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 12;
        const f = (0.4 * bodies[j].m) / (dist * dist);
        ax += (f * dx) / dist;
        ay += (f * dy) / dist;
      }
      bodies[i].vx += ax;
      bodies[i].vy += ay;
      bodies[i].x += bodies[i].vx;
      bodies[i].y += bodies[i].vy;
      bodies[i].trail.push([bodies[i].x, bodies[i].y]);
      if (bodies[i].trail.length > 80) bodies[i].trail.shift();
    }
  }
  bodies.forEach((b, i) => {
    ctx.beginPath();
    ctx.strokeStyle = ritualColor(i / bodies.length, 0.7);
    ctx.lineWidth = 1.2;
    b.trail.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = ritualColor(i / bodies.length, 1);
    ctx.arc(b.x, b.y, Math.sqrt(b.m), 0, Math.PI * 2);
    ctx.fill();
  });
}

function previewWaves(canvas) {
  const ctx = canvas.getContext("2d");
  const { w, h } = resizeCanvas(canvas, 1);
  const img = ctx.createImageData(w, h);
  const sources = [
    [w * 0.3, h * 0.4],
    [w * 0.7, h * 0.35],
    [w * 0.5, h * 0.7],
  ];
  const freq = 0.08;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (const [sx, sy] of sources) {
        const d = Math.hypot(x - sx, y - sy);
        s += Math.sin(d * freq);
      }
      const v = (s / sources.length + 1) * 0.5;
      const o = (y * w + x) * 4;
      img.data[o] = (30 + v * 160) | 0;
      img.data[o + 1] = (50 + v * 90) | 0;
      img.data[o + 2] = (45 + v * 70) | 0;
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
}

function previewDla(canvas) {
  const ctx = canvas.getContext("2d");
  const { w, h } = resizeCanvas(canvas, 1);
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(55);
  const stuck = new Set();
  const key = (x, y) => x + "," + y;
  const cx = (w / 2) | 0,
    cy = (h / 2) | 0;
  stuck.add(key(cx, cy));
  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ];
  const touches = (x, y) =>
    neighbors.some(([dx, dy]) => stuck.has(key(x + dx, y + dy)));

  for (let n = 0; n < 2500; n++) {
    let angle = rng() * Math.PI * 2;
    let rad = Math.min(w, h) * 0.45;
    let x = (cx + Math.cos(angle) * rad) | 0;
    let y = (cy + Math.sin(angle) * rad) | 0;
    for (let step = 0; step < 800; step++) {
      x += (rng() * 3 - 1.5) | 0;
      y += (rng() * 3 - 1.5) | 0;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) break;
      if (touches(x, y)) {
        stuck.add(key(x, y));
        const t = n / 2500;
        ctx.fillStyle = ritualColor(t * 0.8 + 0.1, 0.9);
        ctx.fillRect(x, y, 1, 1);
        break;
      }
    }
  }
}

const runners = {
  chaos: previewChaos,
  turing: previewTuring,
  phyllotaxis: previewPhyllo,
  gravity: previewGravity,
  waves: previewWaves,
  dla: previewDla,
};

document.querySelectorAll("[data-preview]").forEach((canvas) => {
  const kind = canvas.getAttribute("data-preview");
  const fn = runners[kind];
  if (fn) {
    try {
      fn(canvas);
    } catch (e) {
      console.warn("preview failed", kind, e);
    }
  }
});
