#!/usr/bin/env python3
"""Rasterize the Slip mark to PNGs — no third-party deps (stdlib zlib only).

Generates:
  src-tauri/icons/icon.png        1024  (source for `tauri icon`)
  public/icons/icon-192.png       192
  public/icons/icon-512.png       512
  public/icons/icon-maskable-512.png  512 (full-bleed)
  assets/icon.png                 512  (README asset)
"""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BLACK = (17, 17, 17)      # #111 — softer than pure black for the mark body
WHITE = (255, 255, 255)


def sign(ax, ay, bx, by, cx, cy):
    return (ax - cx) * (by - cy) - (bx - cx) * (ay - cy)


def in_triangle(px, py, a, b, c):
    d1 = sign(px, py, a[0], a[1], b[0], b[1])
    d2 = sign(px, py, b[0], b[1], c[0], c[1])
    d3 = sign(px, py, c[0], c[1], a[0], a[1])
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)


def in_rounded_rect(px, py, x, y, w, h, r):
    if px < x or py < y or px > x + w or py > y + h:
        return False
    cx = min(max(px, x + r), x + w - r)
    cy = min(max(py, y + r), y + h - r)
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r


def render(size, maskable=False, ss=3):
    """Return RGBA bytes of the mark at `size`px (supersampled by `ss`)."""
    S = size * ss
    # In maskable mode, shrink the mark into the safe zone and fill bg black.
    scale = S / 32.0
    if maskable:
        inset = S * 0.14
        span = S - 2 * inset
        scale = span / 32.0
        ox, oy = inset, inset
    else:
        ox = oy = 0.0

    def U(v):  # unit (viewBox) -> device
        return v * scale

    top_tri = [(U(13) + ox, U(6.2) + oy), (U(21) + ox, U(11.9) + oy), (U(13) + ox, U(13.2) + oy)]
    bot_tri = [(U(13) + ox, U(18.8) + oy), (U(21) + ox, U(20.2) + oy), (U(13) + ox, U(25.8) + oy)]

    px_bytes = bytearray()
    for j in range(S):
        for i in range(S):
            x, y = i + 0.5, j + 0.5
            # background
            if maskable:
                r, g, b, a = BLACK[0], BLACK[1], BLACK[2], 255
            else:
                r = g = b = a = 0
            body = in_rounded_rect(x, y, U(1) + ox, U(1) + oy, U(30), U(30), U(8))
            if body and not maskable:
                r, g, b, a = BLACK[0], BLACK[1], BLACK[2], 255
            if body or maskable:
                # slot
                if in_rounded_rect(x, y, U(7) + ox, U(14.6) + oy, U(18), U(2.8), U(1.4)):
                    r, g, b = WHITE
                # top play glyph
                if in_triangle(x, y, *top_tri):
                    r, g, b = WHITE
                # bottom glyph (faint)
                if in_triangle(x, y, *bot_tri):
                    r = int(r * 0.45 + WHITE[0] * 0.55)
                    g = int(g * 0.45 + WHITE[1] * 0.55)
                    b = int(b * 0.45 + WHITE[2] * 0.55)
            px_bytes += bytes((r, g, b, a))

    # Downsample by ss (box filter).
    out = bytearray()
    row = size * 4
    for j in range(size):
        for i in range(size):
            ar = ag = ab = aa = 0
            for dj in range(ss):
                for di in range(ss):
                    idx = ((j * ss + dj) * S + (i * ss + di)) * 4
                    ar += px_bytes[idx]
                    ag += px_bytes[idx + 1]
                    ab += px_bytes[idx + 2]
                    aa += px_bytes[idx + 3]
            n = ss * ss
            out += bytes((ar // n, ag // n, ab // n, aa // n))
    return bytes(out), row


def write_png(path, rgba, size, stride):
    raw = bytearray()
    for j in range(size):
        raw.append(0)  # filter: none
        raw += rgba[j * stride:(j + 1) * stride]
    comp = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", comp) + chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)
    print(f"  wrote {os.path.relpath(path, ROOT)} ({size}px, {len(png)} bytes)")


def main():
    jobs = [
        ("src-tauri/icons/icon.png", 512, False),
        ("public/icons/icon-192.png", 192, False),
        ("public/icons/icon-512.png", 512, False),
        ("public/icons/icon-maskable-512.png", 512, True),
        ("assets/icon.png", 512, False),
    ]
    cache = {}
    for rel, size, maskable in jobs:
        key = (size, maskable)
        if key not in cache:
            cache[key] = render(size, maskable=maskable)
        rgba, stride = cache[key]
        write_png(os.path.join(ROOT, rel), rgba, size, stride)


if __name__ == "__main__":
    print("Generating Slip icons…")
    main()
    print("Done.")
