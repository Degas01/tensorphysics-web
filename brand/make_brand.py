"""Generate the official TensorPhysics brand assets.

The mark: a heavy 'T' whose crossbar is separated from its stem by a measured gap.
Crossbar = the model (simulation), stem = the machine (reality), gap = what TensorPhysics measures.
The stem's lower-right corner carries a 45-degree machined chamfer.

All text is converted to outlines so assets render identically without fonts installed.
Run: python3 make_brand.py <space-grotesk-variable.woff2> <out_dir>
"""
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

CYAN = "#00E5FF"
WHITE = "#F4F6F8"
VOID = "#040507"
PANEL = "#0A0C10"
AMBER = "#FF4D00"

# Mark geometry on a 64-unit grid.
CROSSBAR = "M6 8H58V22H6Z"
STEM = "M22 26H42V50L36 56H22Z"
# Small-size variant (favicon, 32-unit grid): wider gap ratio so it survives at 16 px.
CROSSBAR_S = "M4 4H28V10H4Z"
STEM_S = "M12 14H20V26L18 28H12Z"


def mark_svg(top=CYAN, stem=WHITE, bg=None, size=64, pad=0):
    vb = 64 + 2 * pad
    bg_el = f'<rect x="{-pad}" y="{-pad}" width="{vb}" height="{vb}" fill="{bg}"/>' if bg else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {vb} {vb}" width="{size}" height="{size}">'
        f"<title>TensorPhysics</title>{bg_el}"
        f'<path d="{CROSSBAR}" fill="{top}"/><path d="{STEM}" fill="{stem}"/></svg>'
    )


def favicon_svg():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        f'<rect width="32" height="32" rx="6" fill="{VOID}"/>'
        f'<path d="{CROSSBAR_S}" fill="{CYAN}"/><path d="{STEM_S}" fill="{WHITE}"/></svg>'
    )


def load_font(path, wght=600):
    f = TTFont(path)
    if "fvar" in f:
        f = instantiateVariableFont(f, {"wght": wght})
    return f


def text_path(font, text, tracking=0.06):
    """Outline `text`; returns (svg path d, advance width) in font units, y flipped, baseline at 0."""
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm
    x = 0.0
    parts = []
    for i, ch in enumerate(text):
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        parts.append(pen.getCommands())
        x += hmtx[name][0]
        if i < len(text) - 1:
            x += tracking * upm
    return " ".join(parts), x, upm


def lockup_svg(font, top=CYAN, stem=WHITE, word=WHITE, bg=None):
    # Mark is 64 units tall; cap height of the wordmark is matched to the crossbar-to-stem span (44 units).
    d, adv, upm = text_path(font, "TENSORPHYSICS", tracking=0.08)
    cap = font["OS/2"].sCapHeight or 0.7 * upm
    s = 26.0 / cap  # cap height = 30 units, sits between crossbar top (10) and stem foot (54) centred
    gap = 22
    tx = 64 + gap
    baseline = 32 + 13  # centre caps on y = 32
    width = tx + adv * s + 8
    bg_el = f'<rect width="{width:.1f}" height="64" fill="{bg}"/>' if bg else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.1f} 64">'
        f"<title>TensorPhysics</title>{bg_el}"
        f'<path d="{CROSSBAR}" fill="{top}"/><path d="{STEM}" fill="{stem}"/>'
        f'<path transform="translate({tx} {baseline}) scale({s:.5f})" d="{d}" fill="{word}"/></svg>'
    ), width


def og_svg(font):
    d_word, adv_w, upm = text_path(font, "TENSORPHYSICS", tracking=0.08)
    cap = font["OS/2"].sCapHeight or 0.7 * upm
    reg = load_font(sys.argv[1], 500)
    d_tag, adv_t, _ = text_path(reg, "Know where your simulation breaks", tracking=0.0)
    d_tag2, adv_t2, _ = text_path(reg, "before you cut metal.", tracking=0.0)
    mono = load_font(sys.argv[1], 400)
    d_foot, adv_f, _ = text_path(mono, "GAP MARGIN  /  MUJOCO 3.10  /  PRE-REGISTERED TESTS", tracking=0.12)
    s_word = 34.0 / cap
    s_tag = 60.0 / upm
    s_foot = 18.0 / upm
    grid = "".join(
        f'<path d="M{x} 0V630" stroke="#FFFFFF" stroke-opacity="0.05"/>' for x in range(0, 1201, 60)
    ) + "".join(f'<path d="M0 {y}H1200" stroke="#FFFFFF" stroke-opacity="0.05"/>' for y in range(0, 631, 60))
    ticks = (
        '<g stroke="#F4F6F8" stroke-opacity="0.5" stroke-width="1.5" fill="none">'
        '<path d="M60 60h24M60 60v24M1140 60h-24M1140 60v24M60 570h24M60 570v-24M1140 570h-24M1140 570v-24"/></g>'
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">'
        f'<rect width="1200" height="630" fill="{VOID}"/>{grid}{ticks}'
        f'<g transform="translate(108 112) scale(1.25)"><path d="{CROSSBAR}" fill="{CYAN}"/><path d="{STEM}" fill="{WHITE}"/></g>'
        f'<path transform="translate(212 170) scale({s_word:.5f})" d="{d_word}" fill="{WHITE}"/>'
        f'<path transform="translate(108 360) scale({s_tag:.5f})" d="{d_tag}" fill="{WHITE}"/>'
        f'<path transform="translate(108 448) scale({s_tag:.5f})" d="{d_tag2}" fill="{AMBER}"/>'
        f'<path transform="translate(108 540) scale({s_foot:.5f})" d="{d_foot}" fill="#9AA3B5"/>'
        "</svg>"
    )


def main():
    font = load_font(sys.argv[1], 600)
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    files = {
        "tensorphysics-mark.svg": mark_svg(),
        "tensorphysics-mark-white.svg": mark_svg(WHITE, WHITE),
        "tensorphysics-mark-black.svg": mark_svg("#000000", "#000000"),
        "tensorphysics-mark-on-void.svg": mark_svg(bg=VOID, pad=16, size=512),
        "tensorphysics-favicon.svg": favicon_svg(),
        "tensorphysics-og.svg": og_svg(font),
    }
    lock, _ = lockup_svg(font)
    files["tensorphysics-lockup.svg"] = lock
    files["tensorphysics-lockup-white.svg"] = lockup_svg(font, WHITE, WHITE, WHITE)[0]
    files["tensorphysics-lockup-black.svg"] = lockup_svg(font, "#000000", "#000000", "#000000")[0]
    for name, svg in files.items():
        (out / name).write_text(svg)
    # Wordmark path alone, for the React component (font units, baseline 0) + scale info.
    d, adv, upm = text_path(font, "TENSORPHYSICS", tracking=0.08)
    cap = font["OS/2"].sCapHeight or 0.7 * upm
    (out / "_wordmark.json").write_text(
        __import__("json").dumps({"d": d, "advance": adv, "cap": cap, "upm": upm})
    )
    print("written:", ", ".join(files))


if __name__ == "__main__":
    main()
