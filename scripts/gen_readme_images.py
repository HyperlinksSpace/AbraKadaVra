"""Generate README showcase PNGs for AbraKadaVra💀 (stdlib only)."""
from __future__ import annotations

import math
import os
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 960, 540


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


def ritual(t, a=1.0):
    x = t % 1.0
    if x < 0.45:
        u = x / 0.45
        r, g, b = 190 + u * 50, 55 + u * 50, 28 + u * 25
    elif x < 0.7:
        u = (x - 0.45) / 0.25
        r, g, b = 230 - u * 30, 190 + u * 35, 150 + u * 40
    else:
        u = (x - 0.7) / 0.3
        r, g, b = 70 + u * 50, 140 + u * 40, 110 + u * 35
    return int(r), int(g), int(b), int(a * 255)


def mulberry32(seed: int):
    a = seed & 0xFFFFFFFF

    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (1 | t)) & 0xFFFFFFFF
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) ^ t) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rnd


def png_write(path: Path, rgba: bytearray, w: int, h: int):
    def chunk(tag: bytes, data: bytes):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = bytearray()
    row = w * 4
    for y in range(h):
        raw.append(0)
        raw.extend(rgba[y * row : (y + 1) * row])
    data = b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
            chunk(b"IEND", b""),
        ]
    )
    path.write_bytes(data)
    print("wrote", path.name, path.stat().st_size)


def blank():
    px = bytearray(W * H * 4)
    for i in range(0, len(px), 4):
        px[i : i + 4] = b"\x05\x04\x03\xff"
    return px


def blend(px, x, y, r, g, b, a):
    if x < 0 or y < 0 or x >= W or y >= H or a <= 0:
        return
    i = (y * W + x) * 4
    aa = a / 255
    px[i] = int(px[i] * (1 - aa) + r * aa)
    px[i + 1] = int(px[i + 1] * (1 - aa) + g * aa)
    px[i + 2] = int(px[i + 2] * (1 - aa) + b * aa)


def plot(px, x, y, r, g, b, a, rad=1):
    xi, yi = int(x), int(y)
    for dy in range(-rad, rad + 1):
        for dx in range(-rad, rad + 1):
            if dx * dx + dy * dy <= rad * rad + 1:
                blend(px, xi + dx, yi + dy, r, g, b, a)


def project(x, y, z, yaw, pitch, zoom=1.15):
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    X = x * cy - z * sy
    Z = x * sy + z * cy
    Y = y * cp - Z * sp
    Z = y * sp + Z * cp
    s = (min(W, H) * 0.38 * zoom) / (1.6 + Z * 0.55)
    return W * 0.5 + X * s, H * 0.52 + Y * s, Z


def chaos():
    px = blank()
    x = y = 0.1
    a, b, c, d = -1.4, 1.6, 1.0, 0.7
    hits = [0.0] * (W * H)
    for i in range(220000):
        x, y = math.sin(a * y) + c * math.cos(a * x), math.sin(b * x) + d * math.cos(b * y)
        z = math.sin(x * 1.1 + y * 0.8) * 0.32
        sx, sy, _ = project(x * 0.48, y * 0.48, z, 0.55, 0.28, 1.2)
        ix, iy = int(sx), int(sy)
        if 0 <= ix < W and 0 <= iy < H:
            hits[iy * W + ix] += 1
    mx = max(hits) or 1
    logm = math.log1p(mx)
    for i, h in enumerate(hits):
        if not h:
            continue
        v = (math.log1p(h) / logm) ** 0.85
        r, g, b, a = ritual(v * 0.75 + 0.2, 0.25 + v * 0.95)
        o = i * 4
        aa = a / 255
        px[o] = int(px[o] * (1 - aa) + r * aa)
        px[o + 1] = int(px[o + 1] * (1 - aa) + g * aa)
        px[o + 2] = int(px[o + 2] * (1 - aa) + b * aa)
    png_write(OUT / "chaos.png", px, W, H)


def phyllotaxis():
    px = blank()
    golden = math.pi * (3 - math.sqrt(5))
    pts = []
    for i in range(900):
        frac = i / 900
        r = math.sqrt(frac)
        ang = i * golden
        x, y, z = math.cos(ang) * r, math.sin(ang) * r * 0.92, (0.5 - frac) * 0.65
        sx, sy, depth = project(x, y, z, 0.25, 0.55, 1.3)
        pts.append((depth, sx, sy, frac, 1.1 + frac * 3.2))
    pts.sort(key=lambda p: p[0])
    for depth, sx, sy, t, rad in pts:
        r, g, b, a = ritual(t * 0.9 + 0.05, 0.55 + clamp(0.4 + depth * 0.3, 0.25, 1) * 0.4)
        plot(px, sx, sy, r, g, b, a, max(1, int(rad * 0.45)))
    png_write(OUT / "phyllotaxis.png", px, W, H)


def waves():
    px = blank()
    sources = [(-0.45, 0.15, 0), (0.5, -0.2, 1.2), (0.05, 0.45, 2.4)]
    pts = []
    for j in range(0, H, 8):
        for i in range(0, W, 8):
            u = (i / W - 0.5) * 2.1
            v = (0.5 - j / H) * 1.5
            s = 0.0
            for sx, sy, ph in sources:
                d = math.hypot(u - sx, v - sy)
                s += math.sin(d * 7.7 + ph)
            s /= len(sources)
            x, y, z = u, v, s * 0.38
            sx, sy, depth = project(x, y, z, 0.2, 0.85, 1.1)
            pts.append((depth, sx, sy, (s + 1) * 0.5, 1.3 + abs(s) * 2))
    pts.sort(key=lambda p: p[0])
    for depth, sx, sy, t, rad in pts:
        r, g, b, a = ritual(t * 0.7 + 0.1, 0.5 + 0.4)
        plot(px, sx, sy, r, g, b, a, max(1, int(rad * 0.55)))
    png_write(OUT / "waves.png", px, W, H)


def turing():
    px = blank()
    rng = mulberry32(91)
    n, m = 72, 48
    A = [1.0] * (n * m)
    B = [0.0] * (n * m)
    for _ in range(80):
        cx, cy = int(rng() * n), int(rng() * m)
        rad = 2 + int(rng() * 3)
        for dy in range(-rad, rad + 1):
            for dx in range(-rad, rad + 1):
                if dx * dx + dy * dy > rad * rad:
                    continue
                i = ((cy + dy) % m) * n + ((cx + dx) % n)
                B[i] = 0.9
                A[i] = 0.4
    Da, Db, f, k = 1.0, 0.5, 0.035, 0.06

    def lap(arr, x, y):
        return (
            arr[((y - 1) % m) * n + x]
            + arr[((y + 1) % m) * n + x]
            + arr[y * n + ((x - 1) % n)]
            + arr[y * n + ((x + 1) % n)]
            - 4 * arr[y * n + x]
        )

    for _ in range(380):
        nA = A[:]
        nB = B[:]
        for y in range(m):
            for x in range(n):
                i = y * n + x
                a, b = A[i], B[i]
                abb = a * b * b
                nA[i] = clamp(a + (Da * lap(A, x, y) - abb + f * (1 - a)) * 0.9, 0, 1.5)
                nB[i] = clamp(b + (Db * lap(B, x, y) + abb - (k + f) * b) * 0.9, 0, 1.5)
        A, B = nA, nB
    pts = []
    for y in range(m):
        for x in range(n):
            v = clamp(B[y * n + x] * 2.4, 0, 1)
            if math.isnan(v):
                v = 0.0
            wx = (x / (n - 1) - 0.5) * 2.15
            wy = (0.5 - y / (m - 1)) * 1.45
            sx, sy, depth = project(wx, wy, 0.08 + v * 0.62, 0.4, 0.7, 1.05)
            pts.append((depth, sx, sy, 0.12 + v * 0.75, 1.3 + v * 2.4))
    pts.sort(key=lambda p: p[0])
    for depth, sx, sy, t, rad in pts:
        if math.isnan(sx) or math.isnan(sy) or math.isnan(t):
            continue
        r, g, b, a = ritual(t, 0.95)
        plot(px, sx, sy, r, g, b, a, max(1, int(rad * 0.5)))
    png_write(OUT / "turing.png", px, W, H)


def gravity():
    px = blank()
    rng = mulberry32(7)
    bodies = []
    for i in range(8):
        a = i / 8 * math.tau
        r = 0.7 + (i % 3) * 0.18 + rng() * 0.05
        speed = 0.018 / math.sqrt(r)
        bodies.append(
            {
                "x": math.cos(a) * r,
                "y": math.sin(a) * r * 0.55,
                "z": math.sin(a * 1.7) * 0.4,
                "vx": -math.sin(a) * speed,
                "vy": math.cos(a) * speed * 0.55,
                "vz": math.cos(a) * speed * 0.35,
                "m": 1.2 + (i % 4) * 0.4,
                "t": i / 8,
                "trail": [],
            }
        )
    # central mass for nicer orbits
    for _ in range(900):
        for b in bodies:
            # soft central pull
            dist2 = b["x"] ** 2 + b["y"] ** 2 + b["z"] ** 2 + 0.08
            dist = math.sqrt(dist2)
            pull = 0.00035 / dist2
            b["vx"] -= pull * b["x"] / dist
            b["vy"] -= pull * b["y"] / dist
            b["vz"] -= pull * b["z"] / dist
            # mutual soft forces
            for o in bodies:
                if o is b:
                    continue
                dx, dy, dz = o["x"] - b["x"], o["y"] - b["y"], o["z"] - b["z"]
                d2 = dx * dx + dy * dy + dz * dz + 0.2
                d = math.sqrt(d2)
                f = 0.00008 * o["m"] / d2
                b["vx"] += f * dx / d
                b["vy"] += f * dy / d
                b["vz"] += f * dz / d
            b["x"] += b["vx"]
            b["y"] += b["vy"]
            b["z"] += b["vz"]
            b["trail"].append((b["x"], b["y"], b["z"]))
            if len(b["trail"]) > 220:
                b["trail"].pop(0)
    for b in bodies:
        prev = None
        for x, y, z in b["trail"]:
            sx, sy, _ = project(x, y, z, 0.65, 0.45, 1.05)
            if prev:
                for k in range(5):
                    u = k / 5
                    plot(
                        px,
                        prev[0] * (1 - u) + sx * u,
                        prev[1] * (1 - u) + sy * u,
                        *ritual(b["t"], 0.7)[:3],
                        180,
                        1,
                    )
            prev = (sx, sy)
        sx, sy, _ = project(b["x"], b["y"], b["z"], 0.65, 0.45, 1.05)
        r, g, bl, a = ritual(b["t"], 1)
        plot(px, sx, sy, r, g, bl, a, 5)
    png_write(OUT / "gravity.png", px, W, H)


def dla():
    px = blank()
    rng = mulberry32(55)
    gw = gh = 160
    stuck = set([(gw // 2, gh // 2)])
    age = {(gw // 2, gh // 2): 0}
    nstuck = 1
    maxr = 2
    cx = cy = gw // 2
    n8 = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)]

    def touches(x, y):
        return any((x + dx, y + dy) in stuck for dx, dy in n8)

    for n in range(4500):
        a = rng() * math.tau
        launch = min(70, maxr + 10)
        x = int(cx + math.cos(a) * launch)
        y = int(cy + math.sin(a) * launch)
        for _ in range(3000):
            d = int(rng() * 4)
            x += 1 if d == 0 else -1 if d == 1 else 0
            y += 1 if d == 2 else -1 if d == 3 else 0
            if not (1 <= x < gw - 1 and 1 <= y < gh - 1):
                break
            rr = math.hypot(x - cx, y - cy)
            if rr > 75:
                break
            if touches(x, y) and rng() < 0.95:
                stuck.add((x, y))
                age[(x, y)] = nstuck
                nstuck += 1
                maxr = max(maxr, rr)
                break
    pts = []
    scale = 1 / (min(gw, gh) * 0.28)
    for (x, y), t in age.items():
        wx = (x - cx) * scale
        wy = (cy - y) * scale
        tt = t / max(1, nstuck)
        sx, sy, depth = project(wx, wy, (tt - 0.5) * 0.55, 0.5, 0.4, 1.15)
        pts.append((depth, sx, sy, tt))
    pts.sort(key=lambda p: p[0])
    for depth, sx, sy, t in pts:
        r, g, b, a = ritual(t * 0.85 + 0.08, 0.7)
        plot(px, sx, sy, r, g, b, a, 1)
    png_write(OUT / "dla.png", px, W, H)


def hero():
    px = blank()
    golden = math.pi * (3 - math.sqrt(5))
    pts = []
    for i in range(700):
        frac = i / 700
        r = math.sqrt(frac)
        a = i * golden
        x, y, z = math.cos(a) * r, math.sin(a) * r * 0.9, (0.5 - frac) * 0.7
        sx, sy, depth = project(x, y, z, 0.4, 0.42, 1.35)
        pts.append((depth, sx, sy, frac, 1.1 + frac * 2.2))
    x = y = 0.1
    a, b, c, d = -1.4, 1.6, 1.0, 0.7
    for i in range(5000):
        x, y = math.sin(a * y) + c * math.cos(a * x), math.sin(b * x) + d * math.cos(b * y)
        if i < 80:
            continue
        sx, sy, depth = project(x * 0.28, y * 0.28, math.sin(x + y) * 0.22, 0.4, 0.42, 1.35)
        pts.append((depth, sx, sy, (i * 0.0017) % 1, 1.0))
    pts.sort(key=lambda p: p[0])
    for depth, sx, sy, t, rad in pts:
        r, g, b, a = ritual((t + 0.05) % 1, 0.45 + 0.4)
        plot(px, sx, sy, r, g, b, a, max(1, int(rad * 0.5)))
    png_write(OUT / "hero.png", px, W, H)


if __name__ == "__main__":
    hero()
    chaos()
    turing()
    phyllotaxis()
    gravity()
    waves()
    dla()
    print("done", OUT)
