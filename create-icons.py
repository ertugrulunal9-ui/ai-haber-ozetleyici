import os
import struct
import zlib


def clamp(value, low=0, high=255):
    return max(low, min(high, int(value)))


def lerp_color(c1, c2, t):
    return tuple(clamp(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def blend_pixel(canvas, size, x, y, color):
    if x < 0 or y < 0 or x >= size or y >= size:
        return

    i = (y * size + x) * 4
    sr, sg, sb, sa = color
    dr, dg, db, da = canvas[i : i + 4]

    sa_f = sa / 255.0
    da_f = da / 255.0
    out_a = sa_f + da_f * (1.0 - sa_f)

    if out_a <= 0:
        canvas[i : i + 4] = bytes((0, 0, 0, 0))
        return

    out_r = (sr * sa_f + dr * da_f * (1.0 - sa_f)) / out_a
    out_g = (sg * sa_f + dg * da_f * (1.0 - sa_f)) / out_a
    out_b = (sb * sa_f + db * da_f * (1.0 - sa_f)) / out_a

    canvas[i : i + 4] = bytes(
        (clamp(out_r), clamp(out_g), clamp(out_b), clamp(out_a * 255))
    )


def inside_rounded_rect(x, y, left, top, right, bottom, radius):
    if x < left or x > right or y < top or y > bottom:
        return False
    if x >= left + radius and x <= right - radius:
        return True
    if y >= top + radius and y <= bottom - radius:
        return True

    corners = (
        (left + radius, top + radius),
        (right - radius, top + radius),
        (left + radius, bottom - radius),
        (right - radius, bottom - radius),
    )
    for cx, cy in corners:
        dx = x - cx
        dy = y - cy
        if dx * dx + dy * dy <= radius * radius:
            return True
    return False


def fill_rounded_rect(canvas, size, left, top, right, bottom, radius, color):
    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            if inside_rounded_rect(x, y, left, top, right, bottom, radius):
                blend_pixel(canvas, size, x, y, color)


def fill_rect(canvas, size, left, top, right, bottom, color):
    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            blend_pixel(canvas, size, x, y, color)


def draw_line(canvas, size, left, top, width, height, color):
    fill_rect(canvas, size, left, top, left + width - 1, top + height - 1, color)


def draw_star(canvas, size, cx, cy, radius, color):
    if radius <= 0:
        return
    for d in range(-radius, radius + 1):
        alpha = color[3] * (1.0 - abs(d) / (radius + 1))
        a_color = (color[0], color[1], color[2], clamp(alpha))
        blend_pixel(canvas, size, cx + d, cy, a_color)
        blend_pixel(canvas, size, cx, cy + d, a_color)
        blend_pixel(canvas, size, cx + d, cy + d, a_color)
        blend_pixel(canvas, size, cx + d, cy - d, a_color)


def create_icon(size):
    canvas = bytearray(size * size * 4)

    c1 = (29, 78, 216)   # deep blue
    c2 = (14, 165, 233)  # cyan
    for y in range(size):
        for x in range(size):
            t = (x + y) / max(1, (2 * size - 2))
            r, g, b = lerp_color(c1, c2, t)

            # Subtle glow in the top-left area.
            gx = (x - size * 0.26) / (size * 0.72)
            gy = (y - size * 0.20) / (size * 0.72)
            glow = max(0.0, 1.0 - (gx * gx + gy * gy))
            glow = glow * 0.30
            r = clamp(r + (255 - r) * glow)
            g = clamp(g + (255 - g) * glow)
            b = clamp(b + (255 - b) * glow)

            # Subtle vignette for depth.
            vx = (x - size * 0.5) / (size * 0.54)
            vy = (y - size * 0.5) / (size * 0.54)
            vignette = max(0.0, (vx * vx + vy * vy) - 0.58)
            darken = min(0.18, vignette * 0.22)
            r = clamp(r * (1.0 - darken))
            g = clamp(g * (1.0 - darken))
            b = clamp(b * (1.0 - darken))

            blend_pixel(canvas, size, x, y, (r, g, b, 255))

    # Newspaper card.
    left = int(size * 0.19)
    top = int(size * 0.18)
    right = int(size * 0.82)
    bottom = int(size * 0.84)
    radius = max(1, int(size * 0.08))

    shadow_offset = max(1, int(size * 0.02))
    fill_rounded_rect(
        canvas,
        size,
        left + shadow_offset,
        top + shadow_offset,
        right + shadow_offset,
        bottom + shadow_offset,
        radius,
        (15, 23, 42, 70),
    )

    fill_rounded_rect(canvas, size, left, top, right, bottom, radius, (248, 250, 252, 255))

    border_alpha = 120 if size >= 32 else 90
    for x in range(left, right + 1):
        blend_pixel(canvas, size, x, top, (191, 219, 254, border_alpha))
        blend_pixel(canvas, size, x, bottom, (191, 219, 254, border_alpha))
    for y in range(top, bottom + 1):
        blend_pixel(canvas, size, left, y, (191, 219, 254, border_alpha))
        blend_pixel(canvas, size, right, y, (191, 219, 254, border_alpha))

    pad = max(1, int(size * 0.06))
    strip_h = max(2, int(size * 0.14))
    fill_rect(
        canvas,
        size,
        left + pad,
        top + pad,
        right - pad,
        top + pad + strip_h,
        (245, 158, 11, 255),
    )

    thumb = max(2, int(size * 0.16))
    thumb_x = left + pad
    thumb_y = top + pad + strip_h + max(1, int(size * 0.05))
    fill_rounded_rect(
        canvas,
        size,
        thumb_x,
        thumb_y,
        thumb_x + thumb,
        thumb_y + thumb,
        max(1, int(size * 0.03)),
        (191, 219, 254, 255),
    )

    line_h = max(1, int(size * 0.04))
    text_color = (71, 85, 105, 230)
    line_x = thumb_x + thumb + max(1, int(size * 0.05))
    line_w = max(2, right - pad - line_x)
    draw_line(canvas, size, line_x, thumb_y + 1, line_w, line_h, text_color)
    draw_line(
        canvas,
        size,
        line_x,
        thumb_y + line_h + max(1, int(size * 0.03)),
        max(2, int(line_w * 0.85)),
        line_h,
        text_color,
    )

    base_y = thumb_y + thumb + max(1, int(size * 0.07))
    full_w = right - left - pad * 2
    draw_line(canvas, size, left + pad, base_y, full_w, line_h, text_color)
    draw_line(
        canvas,
        size,
        left + pad,
        base_y + line_h + max(1, int(size * 0.03)),
        max(2, int(full_w * 0.78)),
        line_h,
        text_color,
    )

    # AI sparkle accent.
    star_radius = max(1, int(size * 0.09))
    star_x = int(size * 0.78)
    star_y = int(size * 0.20)
    draw_star(canvas, size, star_x, star_y, star_radius, (254, 240, 138, 235))

    # Tiny outer border for contrast on dark toolbars.
    edge_alpha = 70
    for i in range(size):
        blend_pixel(canvas, size, i, 0, (15, 23, 42, edge_alpha))
        blend_pixel(canvas, size, i, size - 1, (15, 23, 42, edge_alpha))
        blend_pixel(canvas, size, 0, i, (15, 23, 42, edge_alpha))
        blend_pixel(canvas, size, size - 1, i, (15, 23, 42, edge_alpha))

    return create_png_from_rgba(size, canvas)


def create_png_from_rgba(size, rgba):
    def chunk(name, data):
        content = name + data
        return (
            struct.pack(">I", len(data))
            + content
            + struct.pack(">I", zlib.crc32(content) & 0xFFFFFFFF)
        )

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))

    raw = bytearray()
    row_len = size * 4
    for y in range(size):
        raw.append(0)  # filter method: None
        start = y * row_len
        raw.extend(rgba[start : start + row_len])

    idat = chunk(b"IDAT", zlib.compress(bytes(raw), level=9))
    iend = chunk(b"IEND", b"")
    return signature + ihdr + idat + iend


def main():
    os.makedirs("extension/icons", exist_ok=True)
    for size in [16, 48, 128]:
        with open(f"extension/icons/icon{size}.png", "wb") as f:
            f.write(create_icon(size))
        print(f"icon{size}.png olusturuldu")


if __name__ == "__main__":
    main()
