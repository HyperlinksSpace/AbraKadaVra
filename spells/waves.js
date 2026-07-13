import { resizeCanvas, bindRange } from "../js/shared.js";

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: false });

const state = {
  freq: 0.07,
  amp: 1,
  count: 3,
  sources: [],
  t0: performance.now(),
  drag: -1,
};

function layoutSources() {
  const { w, h } = resizeCanvas(canvas, 1);
  const pts = [];
  for (let i = 0; i < state.count; i++) {
    const a = (i / state.count) * Math.PI * 2 - Math.PI / 2;
    const r = Math.min(w, h) * 0.28;
    pts.push({
      x: w * 0.5 + Math.cos(a) * r,
      y: h * 0.5 + Math.sin(a) * r * 0.85,
      phase: (i * Math.PI) / 3,
    });
  }
  state.sources = pts;
}

function nearest(mx, my) {
  let best = -1,
    bestD = 1e9;
  state.sources.forEach((s, i) => {
    const d = (s.x - mx) ** 2 + (s.y - my) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function paint(now) {
  const { w, h, dpr } = resizeCanvas(canvas, 1);
  const t = (now - state.t0) * 0.001;
  // render at half res for speed then scale up
  const rw = Math.max(1, (w / 2) | 0);
  const rh = Math.max(1, (h / 2) | 0);
  const img = ctx.createImageData(rw, rh);
  const data = img.data;
  const sx = w / rw;
  const sy = h / rh;
  const sources = state.sources;
  const n = sources.length || 1;
  const freq = state.freq * 2; // compensate half-res

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const px = x * sx;
      const py = y * sy;
      let s = 0;
      for (const src of sources) {
        const d = Math.hypot(px - src.x, py - src.y);
        s += Math.sin(d * freq - t * 3.2 + src.phase) * state.amp;
      }
      const v = (s / n + 1) * 0.5;
      const o = (y * rw + x) * 4;
      // ritual map without purple
      const r = (12 + v * 210) | 0;
      const g = (18 + v * 120) | 0;
      const b = (22 + v * 70 + (1 - v) * 40) | 0;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
  }

  // draw to temp then scale
  const tmp = document.createElement("canvas");
  tmp.width = rw;
  tmp.height = rh;
  tmp.getContext("2d").putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tmp, 0, 0, w, h);

  // source markers
  for (const src of sources) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(232, 220, 200, 0.65)";
    ctx.lineWidth = 1.5 * (dpr || 1);
    ctx.arc(src.x, src.y, 8 * (dpr || 1), 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = "rgba(196, 92, 38, 0.9)";
    ctx.arc(src.x, src.y, 3 * (dpr || 1), 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(paint);
}

function toLocal(e) {
  const rect = canvas.getBoundingClientRect();
  const { dpr } = resizeCanvas(canvas, 1);
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = toLocal(e);
  state.drag = nearest(p.x, p.y);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", () => (state.drag = -1));
canvas.addEventListener("pointermove", (e) => {
  if (state.drag < 0) return;
  const p = toLocal(e);
  state.sources[state.drag].x = p.x;
  state.sources[state.drag].y = p.y;
});

bindRange("freq", (v) => (state.freq = v));
bindRange("amp", (v) => (state.amp = v));
bindRange("sources", (v) => {
  state.count = v;
  layoutSources();
});
document.getElementById("reset").addEventListener("click", layoutSources);

window.addEventListener("resize", layoutSources);
layoutSources();
requestAnimationFrame(paint);
