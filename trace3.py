#!/usr/bin/env python3
"""Трассировка логотипа: растр -> SVG. Без внешних зависимостей.

Ключевое отличие от прошлых попыток. Раньше контуры искались обходом по
пикселям отдельно для фигуры и для её дополнения, а заливка угадывалась
через evenodd или nonzero. Одну и ту же границу при этом было легко
посчитать дважды, и чётность съезжала — линзы маски получались залитыми.

Здесь строятся точные границы между пикселями ("трещины"): для каждого
залитого пикселя берутся те его стороны, за которыми лежит фон. Такие
рёбра однозначно сцепляются в замкнутые петли, внешние идут по часовой,
петли отверстий — против. Заливка nonzero после этого воспроизводит
растр точно, без допущений.
"""
import zlib, struct, sys, math, json

def read_png(path):
    d = open(path, 'rb').read(); i = 8; idat = b''; w = h = bd = ct = 0; plte = None
    while i < len(d):
        ln, typ = struct.unpack('>I4s', d[i:i+8]); typ = typ.decode(); c = d[i+8:i+8+ln]
        if typ == 'IHDR': w, h, bd, ct, _, _, il = struct.unpack('>IIBBBBB', c[:13])
        elif typ == 'PLTE': plte = c
        elif typ == 'IDAT': idat += c
        elif typ == 'IEND': break
        i += 12 + ln
    raw = zlib.decompress(idat); ch = {0:1,2:3,3:1,4:2,6:4}[ct]
    bpp = ch; stride = w*bpp; px = bytearray(w*h*ch); prev = bytearray(stride); k = 0
    for y in range(h):
        f = raw[k]; k += 1; line = bytearray(raw[k:k+stride]); k += stride
        if f:
            for x in range(stride):
                a = line[x-bpp] if x >= bpp else 0; b = prev[x]; c2 = prev[x-bpp] if x >= bpp else 0
                if f == 1: v = a
                elif f == 2: v = b
                elif f == 3: v = (a+b) >> 1
                else:
                    p = a+b-c2; pa, pb, pc = abs(p-a), abs(p-b), abs(p-c2)
                    v = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c2)
                line[x] = (line[x]+v) & 255
        px[y*stride:(y+1)*stride] = line; prev = line
    return w, h, ch, px, plte, ct

def mask(path, thresh, pad=2):
    """Знак светлый на тёмном: ink = яркость >= thresh."""
    w, h, ch, px, plte, ct = read_png(path)
    W, H = w+2*pad, h+2*pad
    m = [bytearray(W) for _ in range(H)]
    for y in range(h):
        row = y*w*ch; mr = m[y+pad]
        for x in range(w):
            o = row+x*ch
            if ct == 3: idx = px[o]*3; r, g, b = plte[idx], plte[idx+1], plte[idx+2]
            elif ch >= 3: r, g, b = px[o], px[o+1], px[o+2]
            else: r = g = b = px[o]
            if (r*299+g*587+b*114)//1000 >= thresh: mr[x+pad] = 1
    return m, W, H

def loops(m, W, H):
    """Точные замкнутые границы залитых областей.

    Для залитого пикселя (x,y) его четыре стороны обходятся по часовой
    стрелке в системе, где y растёт вниз. Ребро добавляется только если
    сосед за этой стороной — фон. Итог: внешние петли по часовой,
    петли отверстий против неё.
    """
    nxt = {}
    for y in range(H):
        row = m[y]
        up = m[y-1] if y > 0 else None
        dn = m[y+1] if y < H-1 else None
        for x in range(W):
            if not row[x]: continue
            if up is None or not up[x]:            nxt.setdefault((x, y), []).append((x+1, y))
            if x == W-1 or not row[x+1]:           nxt.setdefault((x+1, y), []).append((x+1, y+1))
            if dn is None or not dn[x]:            nxt.setdefault((x+1, y+1), []).append((x, y+1))
            if x == 0 or not row[x-1]:             nxt.setdefault((x, y+1), []).append((x, y))
    out = []
    for start in list(nxt):
        while nxt.get(start):
            loop = [start]; cur = start
            while True:
                succ = nxt.get(cur)
                if not succ: break
                nx = succ.pop(0)
                if not succ: nxt.pop(cur, None)
                if nx == start:
                    break
                loop.append(nx); cur = nx
            if len(loop) >= 4: out.append(loop)
    return out

def rdp(p, e):
    if len(p) < 3: return p
    dm = 0.0; idx = 0; x1, y1 = p[0]; x2, y2 = p[-1]; dx, dy = x2-x1, y2-y1
    nrm = math.hypot(dx, dy)
    for i in range(1, len(p)-1):
        x0, y0 = p[i]
        dd = abs(dy*x0-dx*y0+x2*y1-y2*x1)/nrm if nrm else math.hypot(x0-x1, y0-y1)
        if dd > dm: dm, idx = dd, i
    if dm > e: return rdp(p[:idx+1], e)[:-1]+rdp(p[idx:], e)
    return [p[0], p[-1]]

def rdp_closed(p, e):
    if len(p) < 4: return p
    b = len(p)//2
    return rdp(p[:b+1], e)[:-1] + rdp(p[b:]+[p[0]], e)[:-1]

def chaikin(p, it=1):
    for _ in range(it):
        o = []; n = len(p)
        for i in range(n):
            x0, y0 = p[i]; x1, y1 = p[(i+1) % n]
            o.append((x0*.75+x1*.25, y0*.75+y1*.25)); o.append((x0*.25+x1*.75, y0*.25+y1*.75))
        p = o
    return p

def emit(p, sc, ox, oy, off, prec=1):
    """Замкнутый Catmull-Rom -> безье; почти прямые звенья -> L."""
    n = len(p); f = lambda v: f"{round(v, prec):g}"
    P = [((x-ox)*sc+off, (y-oy)*sc+off) for x, y in p]
    d = [f"M{f(P[0][0])} {f(P[0][1])}"]
    for i in range(n):
        p0 = P[(i-1) % n]; p1 = P[i]; p2 = P[(i+1) % n]; p3 = P[(i+2) % n]
        c1 = (p1[0]+(p2[0]-p0[0])/6.0, p1[1]+(p2[1]-p0[1])/6.0)
        c2 = (p2[0]-(p3[0]-p1[0])/6.0, p2[1]-(p3[1]-p1[1])/6.0)
        vx, vy = p2[0]-p1[0], p2[1]-p1[1]; L = math.hypot(vx, vy)
        flat = False
        if L > 1e-9:
            dev = max(abs((c[0]-p1[0])*vy-(c[1]-p1[1])*vx)/L for c in (c1, c2))
            flat = dev < 0.12
        d.append(f"L{f(p2[0])} {f(p2[1])}" if flat else
                 f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}")
    return "".join(d)+"Z"

def signed_area(p):
    n = len(p)
    return sum(p[i][0]*p[(i+1) % n][1]-p[(i+1) % n][0]*p[i][1] for i in range(n))/2.0

# ------------------------------------------------------------------ параметры
SRC, OUT = sys.argv[1], sys.argv[2]
THR    = int(sys.argv[3])   if len(sys.argv) > 3 else 128
EPS    = float(sys.argv[4]) if len(sys.argv) > 4 else 1.2
SMOOTH = int(sys.argv[5])   if len(sys.argv) > 5 else 1
MINA, BOX, PAD = 8.0, 100.0, 3.0

m, W, H = mask(SRC, THR)
ls = loops(m, W, H)

xs = [x for y in range(H) for x in range(W) if m[y][x]]
ys = [y for y in range(H) for x in range(W) if m[y][x]]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
bw, bh = maxx-minx+1, maxy-miny+1
side = max(bw, bh); inner = BOX-2*PAD; sc = inner/side
ox = minx-(side-bw)/2.0; oy = miny-(side-bh)/2.0

parts = []
for pts in ls:
    a0 = signed_area(pts)
    if abs(a0) < MINA: continue
    sp = rdp_closed(pts, EPS)
    if len(sp) < 3: continue
    if SMOOTH:
        sp = chaikin(sp, SMOOTH)
        sp = rdp_closed(sp, EPS*0.45)
    if len(sp) < 3: continue
    # сглаживание могло перевернуть знак — вернуть исходную ориентацию
    if (signed_area(sp) > 0) != (a0 > 0): sp = sp[::-1]
    parts.append((abs(a0), emit(sp, sc, ox, oy, PAD)))

parts.sort(key=lambda r: -r[0])
d = "".join(p[1] for p in parts)
json.dump({'d': d}, open(OUT, 'w'))
outer = sum(1 for p in ls if signed_area(p) > 0)
print(f"loops={len(ls)} (внешних {outer}, отверстий {len(ls)-outer}) "
      f"kept={len(parts)} chars={len(d)} box={bw}x{bh} thr={THR} eps={EPS} sm={SMOOTH}")
