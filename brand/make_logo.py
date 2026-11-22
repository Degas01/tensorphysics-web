"""TensorPhysics master identity (candidate for approval): Hex Tensor + architectural wordmark. Monochrome.

Symbol: a bolt-head hexagon stamped with a T. The stem runs out through the base vertex and splits
the block; the right half has dropped one grid unit: the fracture. Every horizontal and vertical edge
sits on a 4-unit grid, so at 16 px (64 units -> 16 px) each lands on a whole pixel.

Wordmark: solid, bold, architectural. Two signature gaps only: the T's crossbar lifts off its stem,
and the P's bowl stands off its stem. TENSOR is drawn slightly heavier than PHYSICS.
"""
import json
import math
from pathlib import Path

from shapely.geometry import Point, Polygon, box
from shapely.affinity import translate
from shapely.ops import unary_union

OUT = Path(__file__).resolve().parent / "final"
OUT.mkdir(exist_ok=True)


def n(x):
    return f"{x:.2f}".rstrip("0").rstrip(".")


def to_d(geom):
    if geom.geom_type == "Polygon":
        polys = [geom]
    else:
        polys = [g for g in geom.geoms if g.geom_type == "Polygon" and g.area > 0.01]
        polys += [q for g in geom.geoms if g.geom_type == "MultiPolygon" for q in g.geoms]
    out = []
    for p in polys:
        for ring in [p.exterior, *p.interiors]:
            pts = list(ring.coords)[:-1]
            out.append("M" + "L".join(f"{n(x)} {n(y)}" for x, y in pts) + "Z")
    return "".join(out)


RES = 64


def rr(x0, y0, x1, y1, r, corners="tl tr br bl"):
    """Box with the named corners rounded (radius r). y grows downward."""
    g = box(x0, y0, x1, y1)
    if r <= 0:
        return g
    cs = corners.split()
    spec = {
        "tl": (x0, y0, x0 + r, y0 + r, (x0 + r, y0 + r)),
        "tr": (x1 - r, y0, x1, y0 + r, (x1 - r, y0 + r)),
        "br": (x1 - r, y1 - r, x1, y1, (x1 - r, y1 - r)),
        "bl": (x0, y1 - r, x0 + r, y1, (x0 + r, y1 - r)),
    }
    for c in cs:
        a, b, cx_, dy_, ctr = spec[c]
        sq = box(a, b, cx_, dy_)
        g = g.difference(sq).union(Point(ctr).buffer(r, resolution=RES).intersection(sq))
    return g


# ---------------- symbol ----------------
R_HEX = 28
hexp = Polygon([(32 + R_HEX * math.cos(math.radians(a)), 32 + R_HEX * math.sin(math.radians(a))) for a in (-90, -30, 30, 90, 150, 210)])
SLOT_BAR = box(12, 20, 52, 28)     # 8 units = 2 px at 16 px
SLOT_STEM = box(28, 28, 36, 64)    # 8 units = 2 px
SLOT = unary_union([SLOT_BAR, SLOT_STEM]).intersection(hexp.buffer(0.01))
body = hexp.difference(unary_union([SLOT_BAR, SLOT_STEM]))
cap = body.intersection(box(0, 0, 64, 20))
left = body.intersection(box(0, 20, 32, 64))
right = translate(body.intersection(box(32, 20, 64, 64)), 0, 4)  # dropped one grid unit (1 px at 16 px)
# keep the dropped half inside the hex silhouette's bottom so the outline stays a hexagon at rest
SYMBOL = {"cap": to_d(cap), "left": to_d(left), "right": to_d(right), "slot": to_d(SLOT)}

# ---------------- wordmark ----------------
H = 20.0
R = 6.2
GAP = 1.6


def glyphs(W):
    ri = R - W

    def T():
        w = 20
        return w, unary_union([box(0, 0, w, W), box(w / 2 - W / 2, W + GAP, w / 2 + W / 2, H)])  # signature gap

    def E():
        w = 17
        m = H / 2 - W / 2
        return w, unary_union([box(0, 0, W, H), box(0, 0, w, W), box(0, m, w - 2, m + W), box(0, H - W, w, H)])

    def N():
        w = 20
        d = Polygon([(0, 0), (W * 1.3, 0), (w, H), (w - W * 1.3, H)])
        return w, unary_union([box(0, 0, W, H), box(w - W, 0, w, H), d]).intersection(box(0, 0, w, H))

    def O():
        w = 21
        return w, rr(0, 0, w, H, R).difference(rr(W, W, w - W, H - W, ri))

    def S():
        w = 19
        m = H / 2 - W / 2
        up = rr(0, 0, w, m + W, R, "tl bl").difference(rr(W, W, w + 1, m, ri, "tl bl"))
        lo = rr(0, m, w, H, R, "tr br").difference(rr(-1, m + W, w - W, H - W, ri, "tr br"))
        return w, unary_union([up, lo])

    def C():
        w = 19
        ring = rr(0, 0, w, H, R).difference(rr(W, W, w - W, H - W, ri))
        return w, ring.difference(box(w / 2, W, w + 1, H - W))

    def P():
        w = 19
        bh = H * 0.6
        x0 = W + GAP  # signature gap: the bowl stands off the stem
        bowl = rr(x0, 0, w, bh, R, "tr br").difference(rr(x0 - 1, W, w - W, bh - W, ri, "tr br"))
        return w, unary_union([box(0, 0, W, H), bowl])

    def Rr():
        w = 20
        bh = H * 0.58
        bowl = rr(0, 0, w, bh, R, "tr br").difference(rr(W, W, w - W, bh - W, ri, "tr br"))
        lx = w - 8.6
        leg = Polygon([(lx, bh - 0.5), (lx + W * 1.3, bh - 0.5), (w, H), (w - W * 1.3, H)])
        return w, unary_union([box(0, 0, W, H), bowl, leg]).intersection(box(0, 0, w, H))

    def Hh():
        w = 20
        return w, unary_union([box(0, 0, W, H), box(w - W, 0, w, H), box(0, H / 2 - W / 2, w, H / 2 + W / 2)])

    def Y():
        w = 21
        c = w / 2
        j = H * 0.52
        la = Polygon([(0, 0), (W * 1.3, 0), (c + W * 0.5, j + 0.6), (c - W * 0.5, j + 0.6)])
        ra = Polygon([(w - W * 1.3, 0), (w, 0), (c + W * 0.5, j + 0.6), (c - W * 0.5, j + 0.6)])
        return w, unary_union([la, ra, box(c - W / 2, j - 1, c + W / 2, H)]).intersection(box(0, 0, w, H))

    def I():
        return W, box(0, 0, W, H)

    return {"T": T, "E": E, "N": N, "S": S, "O": O, "R": Rr, "P": P, "H": Hh, "Y": Y, "I": I, "C": C}


W_TENSOR, W_PHYSICS = 4.5, 4.0
TRACK = 4.4


def build_word():
    parts = []
    x = 0.0
    text = "TENSORPHYSICS"
    for i, ch in enumerate(text):
        g = glyphs(W_TENSOR if i < 6 else W_PHYSICS)[ch]
        w, geom = g()
        parts.append(translate(geom, x, 0))
        x += w + (TRACK if i < len(text) - 1 else 0)
    return unary_union(parts), x


WORD_GEOM, WORD_W = build_word()
WORD = to_d(WORD_GEOM)

json.dump({"symbol": SYMBOL, "word": WORD, "wordW": WORD_W, "H": H}, open(OUT / "master.json", "w"))
print("word width", round(WORD_W, 2), "path chars", len(WORD))
