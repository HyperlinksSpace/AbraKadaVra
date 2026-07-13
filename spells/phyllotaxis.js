import { resizeCanvas, bindRange, ritualColor } from "../js/shared.js";
import {
  createOrbit,
  tickOrbit,
  project3D,
  bindOrbit,
  mountHint,
  sortByDepth,
} from "../js/interact.js";

const canvas = document.getElementById("c");
const stage = canvas.closest(".stage");
const ctx = canvas.getContext("2d");

const orbit = createOrbit({ yaw: 0.2, pitch: 0.55, autoSpin: 0.16 });
mountHint(stage, ["Drag to orbit", "Scroll to zoom", "Hover to tilt"]);
bindOrbit(canvas, orbit);

const state = {
  count: 800,
  angleDeg: 137.5,
  spin: 0.25,
  mode: "disk",
  t0: performance.now(),
  last: performance.now(),
};

function frame(now) {
  const dt = Math.min(0.05, (now - state.last) / 1000);
  state.last = now;
  tickOrbit(orbit, dt);

  const { w, h } = resizeCanvas(canvas, 1.6);
  const t = (now - state.t0) * 0.001;
  const ang = (state.angleDeg * Math.PI) / 180;
  const rot = t * state.spin;

  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);

  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.4);
  g.addColorStop(0, "rgba(196, 92, 38, 0.1)");
  g.addColorStop(1, "rgba(5,4,3,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const pts = [];
  for (let i = 0; i < state.count; i++) {
    const frac = i / state.count;
    let r = Math.sqrt(frac);
    let a = i * ang + rot;
    let z = (0.5 - frac) * 0.65;

    if (state.mode === "flare") {
      r *= 0.7 + 0.35 * Math.sin(a * 3 + t);
      z += Math.sin(a * 2 + t) * 0.08;
    } else if (state.mode === "bones") {
      const lobe = Math.abs(Math.sin(a * 2.5));
      r *= 0.55 + 0.5 * lobe;
      a += Math.sin(frac * Math.PI * 4 + t) * 0.08;
      z = (lobe - 0.5) * 0.7;
    }

    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const p = project3D(x, y, z, orbit, w, h, 1.25);
    pts.push({
      ...p,
      t: frac,
      r:
        state.mode === "bones"
          ? 1.2 + frac * 4.5 * (0.4 + Math.abs(Math.sin(a * 2)))
          : 1.1 + frac * 3.2,
    });
  }
  sortByDepth(pts);
  for (const p of pts) {
    const depth = Math.max(0.25, Math.min(1, 0.45 + p.z * 0.3));
    ctx.beginPath();
    ctx.fillStyle = ritualColor((p.t * 0.9 + t * 0.04) % 1, 0.5 + depth * 0.45);
    ctx.arc(p.x, p.y, Math.max(0.7, p.r * depth * 0.55), 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(frame);
}

bindRange("count", (v) => (state.count = v));
bindRange("angle", (v) => (state.angleDeg = v));
bindRange("spin", (v) => (state.spin = v));
document.getElementById("mode").addEventListener("change", (e) => {
  state.mode = e.target.value;
});

requestAnimationFrame(frame);
