"""Export the official logo kit (SVG + PNG) from brand/final/master.json. Needs rsvg-convert."""
import json, shutil, subprocess
from pathlib import Path

HERE=Path(__file__).resolve().parent
M=json.load(open(HERE/"final"/"master.json")); S=M["symbol"]; H=M["H"]
OUT=HERE/"kit"; 
if OUT.exists(): shutil.rmtree(OUT)
(OUT/"svg").mkdir(parents=True); (OUT/"png").mkdir()
WHITE,BLACK,VOID="#F4F6F8","#050507","#040507"
SYM_D = S["cap"]+S["left"]+S["right"]
CAPH=22.0; GAP=18.0; sc=CAPH/H; WW=M["wordW"]*sc
def symbol(fill): return f'<path d="{SYM_D}" fill="{fill}"/>'
def wordg(x,fill): return f'<path transform="translate({x:.2f} {32-CAPH/2:.2f}) scale({sc:.5f})" d="{M["word"]}" fill="{fill}" fill-rule="evenodd"/>'
def doc(vb, body, w=None, h=None, title="TensorPhysics"):
    wh = f' width="{w}" height="{h}"' if w else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{wh} role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'
LW = 64+GAP+WW
files = {
 "tensorphysics-symbol-white.svg": doc("0 0 64 64", symbol(WHITE)),
 "tensorphysics-symbol-black.svg": doc("0 0 64 64", symbol(BLACK)),
 "tensorphysics-lockup-white.svg": doc(f"0 0 {LW:.2f} 64", symbol(WHITE)+wordg(64+GAP,WHITE)),
 "tensorphysics-lockup-black.svg": doc(f"0 0 {LW:.2f} 64", symbol(BLACK)+wordg(64+GAP,BLACK)),
 "tensorphysics-lockup-on-void.svg": doc(f"-16 -16 {LW+32:.2f} 96", f'<rect x="-16" y="-16" width="{LW+32:.2f}" height="96" fill="{VOID}"/>'+symbol(WHITE)+wordg(64+GAP,WHITE)),
 "tensorphysics-lockup-on-white.svg": doc(f"-16 -16 {LW+32:.2f} 96", f'<rect x="-16" y="-16" width="{LW+32:.2f}" height="96" fill="#FFFFFF"/>'+symbol(BLACK)+wordg(64+GAP,BLACK)),
 "tensorphysics-wordmark-white.svg": doc(f"0 {32-CAPH/2-1:.2f} {WW:.2f} {CAPH+2}", wordg(0,WHITE)),
 "tensorphysics-wordmark-black.svg": doc(f"0 {32-CAPH/2-1:.2f} {WW:.2f} {CAPH+2}", wordg(0,BLACK)),
 "tensorphysics-favicon.svg": doc("0 0 64 64", f'<rect width="64" height="64" rx="12" fill="{VOID}"/><g transform="translate(6.4 6.4) scale(.8)">{symbol(WHITE)}</g>'),
 "tensorphysics-app-icon.svg": doc("0 0 1024 1024", f'<rect width="1024" height="1024" rx="224" fill="#0A0C10"/><g transform="translate(192 192) scale(10)">{symbol(WHITE)}</g>'),
 "tensorphysics-avatar.svg": doc("0 0 1024 1024", f'<rect width="1024" height="1024" fill="{VOID}"/><g transform="translate(192 192) scale(10)">{symbol(WHITE)}</g>'),
}
for k,v in files.items(): (OUT/"svg"/k).write_text(v)
def png(src, out, **kw):
    args=["rsvg-convert", str(OUT/"svg"/src), "-o", str(OUT/"png"/out)]
    for a,b in kw.items(): args += [f"--{a}", str(b)]
    subprocess.run(args, check=True)
png("tensorphysics-app-icon.svg","tensorphysics-app-icon-1024.png", width=1024)
png("tensorphysics-avatar.svg","tensorphysics-avatar-1024.png", width=1024)
for s in (16,32,48,180,512): png("tensorphysics-favicon.svg", f"tensorphysics-favicon-{s}.png", width=s, height=s)
png("tensorphysics-lockup-on-void.svg","tensorphysics-lockup-on-void-2400.png", width=2400)
png("tensorphysics-lockup-on-white.svg","tensorphysics-lockup-on-white-2400.png", width=2400)
png("tensorphysics-lockup-white.svg","tensorphysics-lockup-white-1200.png", width=1200)
png("tensorphysics-lockup-black.svg","tensorphysics-lockup-black-1200.png", width=1200)
json.dump({"symbol":SYM_D,"cap":S["cap"],"left":S["left"],"right":S["right"],"slot":S["slot"],"word":M["word"],"wordW":M["wordW"],"H":H}, open(HERE/"final"/"component_data.json","w"))
print(sorted(p.name for p in (OUT/"svg").iterdir())); print(len(list((OUT/"png").iterdir())), "png")
