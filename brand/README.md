# TensorPhysics brand

Official identity, approved 22 November 2026. Slogan: **Make reality predictable.**

## The symbol: Hex Tensor

A bolt-head hexagon stamped with a **T**. The T's stem runs out through the base vertex and splits the block; the right half has dropped one grid unit. That's the fracture, the point where a design breaks. Hardware, a tensor and a failure point in one solid shape.

- Every horizontal and vertical edge sits on a 4-unit grid. At 16 px (64 units → 16 px) each one lands on a whole pixel: the T slot is exactly 2 px, the fracture exactly 1 px.
- Hover (website only): the dropped half lifts back into line. The fracture closes.

## The wordmark

Custom-drawn, not typeset: solid, bold, architectural, extended. Two signature gaps only:

- **T**: the crossbar lifts off its stem.
- **P**: the bowl stands off its stem.

Those two gaps echo the gap TensorPhysics measures between model and machine. **TENSOR** is drawn slightly heavier than **PHYSICS** (stroke 4.5 vs 4.0 on a 20-unit cap height).

## Colour

The master logo is **monochrome only**:

| Use | Colour |
|---|---|
| On dark | Signal white `#F4F6F8` on void `#040507` |
| On light | Black `#050507` on white `#FFFFFF` |

Status colours belong to the product UI, never to the logo: safety cyan `#00E5FF` (nominal / holds) and thermal orange `#FF4D00` (break). The React component can pulse one of them inside the stamped T with `state="nominal" | "break"`.

## Files (`public/brand/`)

| File | Use |
|---|---|
| `tensorphysics-lockup-white.svg` / `-black.svg` | Default lockup, transparent background |
| `tensorphysics-lockup-on-void.svg` / `-2400.png` | Lockup on dark, with clear space |
| `tensorphysics-lockup-on-white.svg` / `-2400.png` | Lockup on white (documents, slides, invoices) |
| `tensorphysics-symbol-white.svg` / `-black.svg` | Symbol alone |
| `tensorphysics-wordmark-white.svg` / `-black.svg` | Wordmark alone |
| `tensorphysics-favicon.svg` | Browser tab (also `app/icon.svg`) |
| `tensorphysics-app-icon.svg` / `-1024.png` | App icon |
| `tensorphysics-avatar.svg` / `-1024.png` | Profile picture (LinkedIn, X, GitHub) |

In code use `components/ui/TensorPhysicsLogo.tsx`:

```tsx
<TensorPhysicsLogo variant="full" theme="dark" height={28} />          // nav
<TensorPhysicsLogo variant="mark" theme="light" height={24} />         // docs
<TensorPhysicsLogo variant="mark" state="break" height={32} />         // UI status only
```

## Rules

- Clear space: at least half the symbol's height on every side.
- Minimum size: symbol 16 px; lockup 20 px tall.
- Never recolour the master logo, add effects or gradients, outline it, rotate it, or close the fracture or the two wordmark gaps.

## Regenerate

```bash
pip install shapely fonttools brotli
python3 brand/make_logo.py      # geometry -> brand/final/master.json
python3 brand/export_kit.py     # SVG + PNG kit
```

Registering the mark as a UK trademark is a separate step; search for similar marks first.
