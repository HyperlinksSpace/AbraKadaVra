import { resizeCanvas, bindRange, ritualColor } from "../js/shared.js";

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const state = {
  count: 800,
  angleDeg: 137.5,
  spin: 0.25,
  mode: "disk",
  t0: performance.now(),
};

function frame(now) {
  const { w, h } = resizeCanvas(canvas, 1.75);
  const t = (now - state.t0) * 0.001;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const maxR = Math.min(w, h) * 0.42;
  const ang = (state.angleDeg * Math.PI) / 180;
  const rot = t * state.spin;

  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, w, h);

  // soft center glow
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  g.addColorStop(0, "rgba(196, 92, 38, 0.12)");
  g.addColorStop(1, "rgba(5, 4, 3, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < state.count; i++) {
    const frac = i / state.count;
    let r = Math.sqrt(frac) * maxR;
    let a = i * ang + rot;

    if (state.mode === "flare") {
      r *= 0.7 + 0.35 * Math.sin(a * 3 + t);
    } else if (state.mode === "bones") {
      const lobe = Math.abs(Math.sin(a * 2.5));
      r *= 0.55 + 0.5 * lobe;
      a += Math.sin(frac * Math.PI * 4 + t) * 0.08;
    }

    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const size =
      state.mode === "bones"
        ? 1.2 + frac * 4.5 * (0.4 + Math.abs(Math.sin(a * 2)))
        : 1.1 + frac * 3.2;

    ctx.beginPath();
    ctx.fillStyle = ritualColor((frac * 0.9 + t * 0.04) % 1, 0.55 + frac * 0.4);
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // golden-angle readout ring
  ctx.strokeStyle = "rgba(232, 220, 200, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR * 1.05, 0, Math.PI * 2);
  ctx.stroke();

  requestAnimationFrame(frame);
}

bindRange("count", (v) => (state.count = v));
bindRange("angle", (v) => (state.angleDeg = v));
bindRange("spin", (v) => (state.spin = v));
document.getElementById("mode").addEventListener("change", (e) => {
  state.mode = e.target.value;
});

requestAnimationFrame(frame);
