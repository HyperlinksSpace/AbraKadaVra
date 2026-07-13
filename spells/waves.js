import { resizeCanvas, bindRange, clamp } from "../js/shared.js";
import {
  createOrbit,
  tickOrbit,
  project3D,
  bindOrbit,
  mountHint,
  sortByDepth,
  hideHint,
  pointerLocal,
} from "../js/interact.js";

const canvas = document.getElementById("c");
const stage = canvas.closest(".stage");
const ctx = canvas.getContext("2d");

const orbit = createOrbit({ yaw: 0.15, pitch: 0.85, autoSpin: 0.08 });
mountHint(stage, ["Drag empty space to orbit", "Drag markers to move sources", "Scroll to zoom"]);

const state = {
  freq: 0.07,
  amp: 1,
  count: 3,
  sources: [],
  t0: performance.now(),
  last: performance.now(),
  dragSrc: -1,
};

function layoutSources() {
  state.sources = [];
  for (let i = 0; i < state.count; i++) {
    const a = (i / state.count) * Math.PI * 2 - Math.PI / 2;
    state.sources.push({
      x: Math.cos(a) * 0.55,
      y: Math.sin(a) * 0.4,
      phase: (i * Math.PI) / 3,
    });
  }
}

function nearestProjected(mx, my, w, h) {
  let best = -1,
    bestD = 1e9;
  state.sources.forEach((s, i) => {
    const p = project3D(s.x, s.y, 0.25, orbit, w, h, 1.1);
    const d = Math.hypot(p.x - mx, p.y - my);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return { i: best, d: bestD };
}

bindOrbit(canvas, orbit, {
  shouldStartDrag: (e) => {
    const { w, h } = resizeCanvas(canvas, 1.25);
    const p = pointerLocal(canvas, e);
    const mx = (p.x / p.rect.width) * w;
    const my = (p.y / p.rect.height) * h;
    const n = nearestProjected(mx, my, w, h);
    if (n.d < 36) {
      state.dragSrc = n.i;
      orbit.interacted = true;
      hideHint(stage);
      canvas.setPointerCapture?.(e.pointerId);
      return false;
    }
    return true;
  },
});

canvas.addEventListener("pointermove", (e) => {
  if (state.dragSrc < 0) return;
  const p = pointerLocal(canvas, e);
  state.sources[state.dragSrc].x = clamp(p.nx * 1.05, -1.15, 1.15);
  state.sources[state.dragSrc].y = clamp(-p.ny * 0.85, -0.85, 0.85);
});

canvas.addEventListener("pointerup", () => {
  state.dragSrc = -1;
});

function frame(now) {
  const dt = Math.min(0.05, (now - state.last) / 1000);
  state.last = now;
  if (state.dragSrc < 0) tickOrbit(orbit, dt);

  const { w, h } = resizeCanvas(canvas, 1.25);
  const t = (now - state.t0) * 0.001;
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);

  const step = Math.max(7, (Math.min(w, h) / 26) | 0);
  const pts = [];
  for (let py = 0; py < h; py += step) {
    for (let px = 0; px < w; px += step) {
      const u = (px / w - 0.5) * 2.1;
      const v = (0.5 - py / h) * 1.5;
      let s = 0;
      for (const src of state.sources) {
        const d = Math.hypot(u - src.x, v - src.y);
        s += Math.sin(d * (state.freq * 110) - t * 3.1 + src.phase) * state.amp;
      }
      s /= state.sources.length || 1;
      pts.push({
        x: u,
        y: v,
        z: s * 0.38,
        t: (s + 1) * 0.5,
        r: 1.3 + Math.abs(s) * 2.2,
      });
    }
  }

  const drawn = pts.map((p) => {
    const pr = project3D(p.x, p.y, p.z, orbit, w, h, 1.1);
    return { ...pr, t: p.t, r: p.r };
  });
  sortByDepth(drawn);
  for (const p of drawn) {
    const depth = Math.max(0.25, Math.min(1, 0.45 + p.z * 0.35));
    const r = (20 + p.t * 200) | 0;
    const g = (30 + p.t * 120) | 0;
    const b = (35 + p.t * 70) | 0;
    ctx.fillStyle = `rgba(${r},${g},${b},${0.45 + depth * 0.5})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.8, p.r * depth * 0.7), 0, Math.PI * 2);
    ctx.fill();
  }

  for (const src of state.sources) {
    const p = project3D(src.x, src.y, 0.25, orbit, w, h, 1.1);
    ctx.beginPath();
    ctx.strokeStyle = "rgba(232,220,200,0.75)";
    ctx.lineWidth = 1.6;
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = "rgba(196,92,38,0.95)";
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(frame);
}

bindRange("freq", (v) => (state.freq = v));
bindRange("amp", (v) => (state.amp = v));
bindRange("sources", (v) => {
  state.count = v;
  layoutSources();
});
document.getElementById("reset").addEventListener("click", layoutSources);

layoutSources();
requestAnimationFrame(frame);
