/* AbraKadaVra💀 — shared utilities */

export function resizeCanvas(canvas, maxDpr = 2) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h, dpr, cssW: rect.width, cssH: rect.height };
}

export function bindRange(id, onChange) {
  const el = document.getElementById(id);
  const val = document.getElementById(id + "-val");
  if (!el) return;
  const fire = () => {
    if (val) val.textContent = el.value;
    onChange(+el.value, el);
  };
  el.addEventListener("input", fire);
  fire();
  return el;
}

export function hsl(h, s, l, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Soft copper → bone → verdigris palette from t in [0,1] */
export function ritualColor(t, a = 1) {
  const x = ((t % 1) + 1) % 1;
  if (x < 0.45) {
    const u = x / 0.45;
    return hsl(18 + u * 12, 70 - u * 20, 28 + u * 35, a);
  }
  if (x < 0.7) {
    const u = (x - 0.45) / 0.25;
    return hsl(40 - u * 20, 30 - u * 15, 65 + u * 15, a);
  }
  const u = (x - 0.7) / 0.3;
  return hsl(160 + u * 20, 35 + u * 15, 35 + u * 10, a);
}
