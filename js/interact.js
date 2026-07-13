/* AbraKadaVra💀 — orbit / pointer / hint helpers */

import { clamp, lerp } from "./shared.js";

export function createOrbit(opts = {}) {
  return {
    yaw: opts.yaw ?? 0.55,
    pitch: opts.pitch ?? 0.32,
    zoom: opts.zoom ?? 1,
    targetYaw: opts.yaw ?? 0.55,
    targetPitch: opts.pitch ?? 0.32,
    hoverX: 0,
    hoverY: 0,
    dragging: false,
    moved: false,
    autoSpin: opts.autoSpin ?? 0.18,
    interacted: false,
  };
}

export function tickOrbit(orbit, dt = 0.016) {
  if (!orbit.dragging && !orbit.interacted) {
    orbit.targetYaw += orbit.autoSpin * dt;
  }
  if (!orbit.dragging) {
    orbit.yaw = lerp(orbit.yaw, orbit.targetYaw + orbit.hoverX * 0.35, 0.08);
    orbit.pitch = lerp(orbit.pitch, orbit.targetPitch + orbit.hoverY * 0.25, 0.08);
  } else {
    orbit.yaw = orbit.targetYaw;
    orbit.pitch = orbit.targetPitch;
  }
  orbit.pitch = clamp(orbit.pitch, -1.15, 1.15);
}

/** Project world point with yaw/pitch/zoom into canvas pixels + depth */
export function project3D(x, y, z, orbit, w, h, scale = 1) {
  const cy = Math.cos(orbit.yaw);
  const sy = Math.sin(orbit.yaw);
  const cp = Math.cos(orbit.pitch);
  const sp = Math.sin(orbit.pitch);
  let X = x * cy - z * sy;
  let Z = x * sy + z * cy;
  let Y = y * cp - Z * sp;
  Z = y * sp + Z * cp;
  const s = (Math.min(w, h) * 0.38 * scale * orbit.zoom) / (1.6 + Z * 0.55);
  return {
    x: w * 0.5 + X * s,
    y: h * 0.52 + Y * s,
    z: Z,
    s,
  };
}

export function pointerLocal(el, e) {
  const rect = el.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    nx: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    ny: ((e.clientY - rect.top) / rect.height) * 2 - 1,
    rect,
  };
}

/**
 * Bind drag-orbit + hover tilt. Returns { destroy }.
 * onTap fires only if pointer barely moved (for navigation).
 * shouldStartDrag(e) can return false to skip orbit (e.g. grabbing a handle).
 */
export function bindOrbit(el, orbit, opts = {}) {
  const onTap = opts.onTap || null;
  const onChange = opts.onChange || null;
  const shouldStartDrag = opts.shouldStartDrag || (() => true);
  let lastX = 0;
  let lastY = 0;
  let downX = 0;
  let downY = 0;

  const host = el.closest(".preview-stage, .stage") || el;

  const setDraggingClass = (on) => {
    el.classList.toggle("is-dragging", on);
    host.classList.toggle("is-dragging", on);
  };

  const onDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    if (!shouldStartDrag(e)) return;
    orbit.dragging = true;
    orbit.moved = false;
    orbit.interacted = true;
    lastX = e.clientX;
    lastY = e.clientY;
    downX = e.clientX;
    downY = e.clientY;
    setDraggingClass(true);
    el.setPointerCapture?.(e.pointerId);
    hideHint(el);
    onChange?.(orbit);
  };

  const onMove = (e) => {
    const p = pointerLocal(el, e);
    if (!orbit.dragging) {
      orbit.hoverX = p.nx;
      orbit.hoverY = p.ny;
      onChange?.(orbit);
      return;
    }
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) orbit.moved = true;
    orbit.targetYaw += dx * 0.01;
    orbit.targetPitch += dy * 0.01;
    orbit.yaw = orbit.targetYaw;
    orbit.pitch = clamp(orbit.targetPitch, -1.15, 1.15);
    orbit.targetPitch = orbit.pitch;
    onChange?.(orbit);
  };

  const onUp = (e) => {
    if (!orbit.dragging) return;
    orbit.dragging = false;
    setDraggingClass(false);
    const wasTap = !orbit.moved;
    orbit.hoverX = 0;
    orbit.hoverY = 0;
    if (wasTap && onTap) onTap(e);
    onChange?.(orbit);
  };

  const onLeave = () => {
    if (!orbit.dragging) {
      orbit.hoverX = 0;
      orbit.hoverY = 0;
    }
  };

  const onWheel = (e) => {
    if (opts.wheel === false) return;
    e.preventDefault();
    orbit.interacted = true;
    orbit.zoom *= e.deltaY > 0 ? 0.94 : 1.06;
    orbit.zoom = clamp(orbit.zoom, 0.45, 2.8);
    hideHint(el);
    onChange?.(orbit);
  };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("pointerleave", onLeave);
  if (opts.wheel !== false) {
    el.addEventListener("wheel", onWheel, { passive: false });
  }
  el.style.touchAction = opts.wheel === false ? "pan-y" : "none";
  el.classList.add("is-interactive");

  return {
    destroy() {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      if (opts.wheel !== false) el.removeEventListener("wheel", onWheel);
    },
  };
}

export function mountHint(host, lines) {
  let hint = host.querySelector(".interact-hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.className = "interact-hint";
    host.appendChild(hint);
  }
  hint.innerHTML = lines
    .map((t, i) => `<span class="hint-pill${i === lines.length - 1 ? " soft" : ""}">${t}</span>`)
    .join("");
  return hint;
}

export function hideHint(host) {
  const root = host.closest(".preview-stage, .stage") || host;
  const hint = root.querySelector(".interact-hint");
  if (hint) hint.classList.add("is-hidden");
}

export function sortByDepth(items) {
  items.sort((a, b) => a.z - b.z);
  return items;
}
