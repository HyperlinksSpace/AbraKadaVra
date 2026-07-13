import { resizeCanvas, mulberry32, ritualColor, clamp } from "./shared.js";
import {
  createOrbit,
  tickOrbit,
  project3D,
  bindOrbit,
  mountHint,
  sortByDepth,
} from "./interact.js";

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function sampleClifford(n, seed = 1) {
  const rng = mulberry32(seed);
  let x = rng() * 0.2;
  let y = rng() * 0.2;
  const a = -1.4,
    b = 1.6,
    c = 1.0,
    d = 0.7;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const nx = Math.sin(a * y) + c * Math.cos(a * x);
    const ny = Math.sin(b * x) + d * Math.cos(b * y);
    x = nx;
    y = ny;
    if (i > 40) {
      pts.push({
        x: x * 0.55,
        y: y * 0.55,
        z: Math.sin(x * 1.2 + y) * 0.35,
        t: (i / n) % 1,
      });
    }
  }
  return pts;
}

function makePhyllo(n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const frac = i / n;
    const r = Math.sqrt(frac);
    const a = i * GOLDEN;
    pts.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r * 0.92,
      z: (0.5 - frac) * 0.55,
      t: frac,
      r: 1.2 + frac * 2.4,
    });
  }
  return pts;
}

function makeTuringField(n = 56, m = 40, seed = 77) {
  const rng = mulberry32(seed);
  let A = new Float32Array(n * m);
  let B = new Float32Array(n * m);
  for (let i = 0; i < A.length; i++) {
    A[i] = 1;
    B[i] = 0;
  }
  // denser seeds so the pattern always ignites
  for (let k = 0; k < 70; k++) {
    const cx = (rng() * n) | 0;
    const cy = (rng() * m) | 0;
    const rad = 2 + ((rng() * 3) | 0);
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue;
        const i = ((cy + dy + m) % m) * n + ((cx + dx + n) % n);
        B[i] = 0.8 + rng() * 0.2;
        A[i] = 0.4;
      }
  }

  // Gray–Scott spots (stable, pretty)
  const Da = 1.0,
    Db = 0.5,
    f = 0.035,
    k = 0.06,
    dt = 1.0;

  const lap = (arr, x, y) =>
    arr[((y - 1 + m) % m) * n + x] +
    arr[((y + 1) % m) * n + x] +
    arr[y * n + ((x - 1 + n) % n)] +
    arr[y * n + ((x + 1) % n)] -
    4 * arr[y * n + x];

  for (let s = 0; s < 420; s++) {
    const nA = new Float32Array(A.length);
    const nB = new Float32Array(B.length);
    for (let y = 0; y < m; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const a = A[i];
        const b = B[i];
        const abb = a * b * b;
        nA[i] = a + (Da * lap(A, x, y) - abb + f * (1 - a)) * dt;
        nB[i] = b + (Db * lap(B, x, y) + abb - (k + f) * b) * dt;
      }
    }
    A = nA;
    B = nB;
  }

  // Build a full 3D skin: base grid + raised pattern from B
  const pts = [];
  for (let y = 0; y < m; y++) {
    for (let x = 0; x < n; x++) {
      const v = clamp(B[y * n + x] * 2.4, 0, 1);
      const wx = (x / (n - 1) - 0.5) * 2.15;
      const wy = (0.5 - y / (m - 1)) * 1.45;
      // always place a surface point so the preview is never empty
      pts.push({
        x: wx,
        y: wy,
        z: 0.08 + v * 0.62,
        t: 0.12 + v * 0.75,
        r: 1.35 + v * 2.6,
      });
      // denser accents on peaks
      if (v > 0.35) {
        pts.push({
          x: wx + (rng() - 0.5) * 0.03,
          y: wy + (rng() - 0.5) * 0.03,
          z: 0.2 + v * 0.7,
          t: 0.35 + v * 0.55,
          r: 1.6 + v * 2.2,
        });
      }
    }
  }

  // safety net: synthetic hills if RD somehow collapsed
  if (pts.filter((p) => p.t > 0.3).length < 40) {
    for (let i = 0; i < 500; i++) {
      const u = rng();
      const v = rng();
      const wx = (u - 0.5) * 2.1;
      const wy = (0.5 - v) * 1.4;
      const hills =
        0.5 +
        0.5 *
          Math.sin(u * 18 + 0.3) *
          Math.sin(v * 14 + 1.1) *
          Math.sin((u + v) * 9);
      pts.push({
        x: wx,
        y: wy,
        z: hills * 0.55,
        t: hills,
        r: 1.4 + hills * 2,
      });
    }
  }

  return { pts, B, n, m, A };
}

function makeDla(count, seed = 55) {
  const rng = mulberry32(seed);
  const W = 90,
    H = 90;
  const stuck = new Uint8Array(W * H);
  const age = new Float32Array(W * H);
  const cx = (W / 2) | 0,
    cy = (H / 2) | 0;
  stuck[cy * W + cx] = 1;
  let nStuck = 1;
  let maxR = 2;
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
  const touches = (x, y) =>
    N8.some(([dx, dy]) => {
      const nx = x + dx,
        ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < W && ny < H && stuck[ny * W + nx];
    });

  for (let n = 0; n < count && nStuck < 1800; n++) {
    const a = rng() * Math.PI * 2;
    const launch = Math.min(40, maxR + 8);
    let x = (cx + Math.cos(a) * launch) | 0;
    let y = (cy + Math.sin(a) * launch) | 0;
    for (let step = 0; step < 500; step++) {
      const dir = (rng() * 4) | 0;
      if (dir === 0) x++;
      else if (dir === 1) x--;
      else if (dir === 2) y++;
      else y--;
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) break;
      if (touches(x, y) && rng() < 0.95) {
        stuck[y * W + x] = 1;
        age[y * W + x] = nStuck;
        nStuck++;
        const rr = Math.hypot(x - cx, y - cy);
        if (rr > maxR) maxR = rr;
        break;
      }
    }
  }
  const pts = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!stuck[y * W + x]) continue;
      const t = age[y * W + x] / Math.max(1, nStuck);
      pts.push({
        x: (x - cx) / 28,
        y: (cy - y) / 28,
        z: (t - 0.5) * 0.5,
        t,
        r: 1.3 + t * 1.6,
      });
    }
  return pts;
}

function drawPoints(ctx, pts, orbit, w, h, scale, tSec) {
  const drawn = [];
  for (const p of pts) {
    const bob = Math.sin(tSec * 1.4 + p.t * 6.2) * 0.03;
    const pr = project3D(p.x, p.y + bob, p.z, orbit, w, h, scale);
    drawn.push({ ...pr, t: p.t, r: (p.r || 1.6) * (0.7 + pr.s * 0.012) });
  }
  sortByDepth(drawn);
  for (const p of drawn) {
    const depth = clamp(0.35 + (p.z + 1.2) * 0.35, 0.25, 1);
    ctx.beginPath();
    ctx.fillStyle = ritualColor((p.t + tSec * 0.03) % 1, 0.45 + depth * 0.5);
    ctx.arc(p.x, p.y, Math.max(0.6, p.r * depth), 0, Math.PI * 2);
    ctx.fill();
  }
}

function createLiveGravity(seed = 99) {
  const rng = mulberry32(seed);
  const bodies = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    bodies.push({
      x: Math.cos(a) * 0.55,
      y: Math.sin(a) * 0.35,
      z: Math.sin(a * 2) * 0.25,
      vx: -Math.sin(a) * 0.01,
      vy: Math.cos(a) * 0.01,
      vz: (rng() - 0.5) * 0.008,
      m: 0.8 + rng() * 1.4,
      t: i / 6,
      trail: [],
    });
  }
  return bodies;
}

function stepGravity(bodies) {
  const soft = 0.12;
  const n = bodies.length;
  const ax = new Float32Array(n);
  const ay = new Float32Array(n);
  const az = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = bodies[i],
        b = bodies[j];
      const dx = b.x - a.x,
        dy = b.y - a.y,
        dz = b.z - a.z;
      const dist2 = dx * dx + dy * dy + dz * dz + soft * soft;
      const dist = Math.sqrt(dist2);
      const f = (0.00035 * a.m * b.m) / dist2;
      const fx = (f * dx) / dist,
        fy = (f * dy) / dist,
        fz = (f * dz) / dist;
      ax[i] += fx / a.m;
      ay[i] += fy / a.m;
      az[i] += fz / a.m;
      ax[j] -= fx / b.m;
      ay[j] -= fy / b.m;
      az[j] -= fz / b.m;
    }
  }
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    b.vx = (b.vx + ax[i]) * 0.995;
    b.vy = (b.vy + ay[i]) * 0.995;
    b.vz = (b.vz + az[i]) * 0.995;
    b.x += b.vx;
    b.y += b.vy;
    b.z += b.vz;
    b.trail.push([b.x, b.y, b.z]);
    if (b.trail.length > 40) b.trail.shift();
  }
}

function drawGravity(ctx, bodies, orbit, w, h, tSec) {
  for (const b of bodies) {
    if (b.trail.length < 2) continue;
    ctx.beginPath();
    for (let i = 0; i < b.trail.length; i++) {
      const [x, y, z] = b.trail[i];
      const p = project3D(x, y, z, orbit, w, h, 1.15);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = ritualColor(b.t, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const dots = bodies.map((b) => {
    const p = project3D(b.x, b.y, b.z, orbit, w, h, 1.15);
    return { ...p, t: b.t, r: 3 + Math.sqrt(b.m) * 3 };
  });
  sortByDepth(dots);
  for (const p of dots) {
    ctx.beginPath();
    ctx.fillStyle = ritualColor((p.t + tSec * 0.05) % 1, 0.95);
    ctx.arc(p.x, p.y, p.r * (0.8 + p.z * 0.1), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWaves(ctx, orbit, w, h, tSec, sources) {
  const step = Math.max(6, (Math.min(w, h) / 28) | 0);
  const pts = [];
  for (let py = 0; py < h; py += step) {
    for (let px = 0; px < w; px += step) {
      const u = (px / w - 0.5) * 2;
      const v = (0.5 - py / h) * 1.4;
      let s = 0;
      for (const src of sources) {
        const d = Math.hypot(u - src.x, v - src.y);
        s += Math.sin(d * 7.5 - tSec * 2.8 + src.phase);
      }
      s /= sources.length;
      pts.push({
        x: u,
        y: v,
        z: s * 0.35,
        t: (s + 1) * 0.5,
        r: 1.4 + Math.abs(s) * 2,
      });
    }
  }
  drawPoints(ctx, pts, orbit, w, h, 1.05, tSec);
  for (const src of sources) {
    const p = project3D(src.x, src.y, 0.2, orbit, w, h, 1.05);
    ctx.beginPath();
    ctx.strokeStyle = "rgba(232,220,200,0.55)";
    ctx.lineWidth = 1.2;
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function bootPreview(stage) {
  const kind = stage.getAttribute("data-preview");
  const canvas = stage.querySelector("canvas");
  const href = stage.getAttribute("data-href");
  if (!canvas || !kind) return;

  const ctx = canvas.getContext("2d");
  const orbit = createOrbit({ autoSpin: 0.22 + Math.random() * 0.08 });
  mountHint(stage, ["Drag to orbit", "Scroll to zoom", "Click to enter"]);

  bindOrbit(canvas, orbit, {
    onTap: () => {
      if (href) window.location.href = href;
    },
  });

  let chaosPts = null;
  let phylloPts = null;
  let turing = null;
  let dlaPts = null;
  let bodies = null;
  let waveSources = [
    { x: -0.45, y: 0.15, phase: 0 },
    { x: 0.5, y: -0.2, phase: 1.2 },
    { x: 0.05, y: 0.45, phase: 2.4 },
  ];
  let dragSource = -1;

  if (kind === "chaos") chaosPts = sampleClifford(5000, 3);
  if (kind === "phyllotaxis") phylloPts = makePhyllo(420);
  if (kind === "turing") turing = makeTuringField(56, 40, 91);
  if (kind === "dla") dlaPts = makeDla(2200);
  if (kind === "gravity") bodies = createLiveGravity(42);

  // Extra: waves allow dragging sources on the card
  if (kind === "waves") {
    canvas.addEventListener("pointerdown", (e) => {
      const { w, h } = resizeCanvas(canvas, 1);
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * w;
      const my = ((e.clientY - rect.top) / rect.height) * h;
      let best = -1,
        bestD = 1e9;
      waveSources.forEach((src, i) => {
        const p = project3D(src.x, src.y, 0.2, orbit, w, h, 1.05);
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (bestD < 28) {
        dragSource = best;
        orbit.interacted = true;
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (dragSource < 0) return;
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = (0.5 - (e.clientY - rect.top) / rect.height) * 1.4;
      waveSources[dragSource].x = clamp(nx * 1.05, -1.1, 1.1);
      waveSources[dragSource].y = clamp(ny, -0.9, 0.9);
      orbit.moved = true;
    });
    canvas.addEventListener("pointerup", () => {
      dragSource = -1;
    });
  }

  let t0 = performance.now();
  let last = t0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const tSec = (now - t0) / 1000;
    tickOrbit(orbit, dt);
    const { w, h } = resizeCanvas(canvas, 1.25);

    ctx.fillStyle = "#050403";
    ctx.fillRect(0, 0, w, h);

    // soft floor plane
    ctx.strokeStyle = "rgba(232,220,200,0.06)";
    ctx.beginPath();
    const corners = [
      [-1.1, 0.7, -1.1],
      [1.1, 0.7, -1.1],
      [1.1, 0.7, 1.1],
      [-1.1, 0.7, 1.1],
    ].map(([x, y, z]) => project3D(x, y, z, orbit, w, h, 1));
    corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();

    if (kind === "chaos") drawPoints(ctx, chaosPts, orbit, w, h, 1.1, tSec);
    else if (kind === "phyllotaxis") drawPoints(ctx, phylloPts, orbit, w, h, 1.2, tSec);
    else if (kind === "turing") {
      // gentle live morph: nudge z with time
      const pts = turing.pts.map((p) => ({
        ...p,
        z: p.z + Math.sin(tSec * 1.2 + p.t * 8) * 0.04,
      }));
      drawPoints(ctx, pts, orbit, w, h, 1.05, tSec);
    } else if (kind === "dla") drawPoints(ctx, dlaPts, orbit, w, h, 1.15, tSec);
    else if (kind === "gravity") {
      stepGravity(bodies);
      drawGravity(ctx, bodies, orbit, w, h, tSec);
    } else if (kind === "waves") drawWaves(ctx, orbit, w, h, tSec, waveSources);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

document.querySelectorAll(".preview-stage[data-preview]").forEach(bootPreview);
