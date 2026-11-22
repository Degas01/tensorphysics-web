# tensorphysics-web

The TensorPhysics website: **"Make reality predictable."**
Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · React Three Fiber · Lucide.

Live: https://tensorphysics-web.vercel.app

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also type-checks)
npm run lint
```

## Deploy to Vercel

1. Push this folder to a GitHub repo (e.g. `Degas01/tensorphysics-web`).
2. On vercel.com → **Add New… → Project** → import the repo. Framework is detected as Next.js; keep the defaults.
3. Optional environment variables (Project → Settings → Environment Variables):
   - `BETA_WEBHOOK_URL`: where beta sign-ups are POSTed as JSON (a form service, Slack incoming webhook, Zapier…). **Without it, sign-ups are not stored.**
   - `NEXT_PUBLIC_SITE_URL`: the final URL once you have a domain.
4. Deploy. Every push to `main` redeploys.

Or from the terminal: `npm i -g vercel && vercel` (first time), then `vercel --prod`.

## Pages

| Route | What |
|---|---|
| `/` | 3D hero arm, three product showcases (ActuatorFit, PhysicsFuzz, GapCheck), Gap Margin sandbox, pipeline inspector, evidence, CTA |
| `/actuatorfit` | Product page, real Panda joint table (expandable), beta form |
| `/engine`, `/engine/[module]` | Simulate · Break · Prove · Improve, each with its own page and demo |
| `/evidence` | Every study with its pass/fail lines, failures included |
| `/physicsfuzz` | In-testing product page + notify form |
| `/privacy` | What sign-ups collect and how to have it deleted |
| `/api/beta` | Sign-up endpoint (validation, honeypot, optional webhook) |

Press **Ctrl/Cmd + K** anywhere for the command palette (navigation, wireframe mode, stress-test the arm, motion off).

## Project structure

```
app/                      routes (App Router), favicon, OG image
brand/                    make_logo.py + export_kit.py + brand guide (logo source of truth)
public/brand/             official logo files (SVG + PNG)
components/
  hero/                   Hero, ArmScene (R3F 7-DOF arm), ScrambleText, MagneticButton
  showcase/               ActuatorFit / PhysicsFuzz / GapCheck sections + their 3D scenes
  sandbox/                Gap Margin sandbox + u(t) telemetry chart
  architecture/           pipeline graph with log / raw JSON inspector
  bento/                  small playground cards (used on engine pages)
  layout/ sections/ ui/   nav, footer, palette, CTA, Frame (CAD panel), Logo
lib/
  data/panda.ts           ActuatorFit v0 Panda results (generated)
  gapModel.ts             Gap Margin interpolation
  stackSim.ts             2D penalty-contact solver for the PhysicsFuzz demo
  gapTraj.ts              synthetic sim-vs-bench trajectories for the GapCheck demo
  three/                  thermal stress shader, studio lighting, dispose helper
  motion.ts               spring (stiffness 300, damping 30)
```

All WebGL is client-only (`next/dynamic`, `ssr: false`), pauses off screen, and disposes geometries, materials and environment maps on unmount.

## Data and honesty rules

- `lib/data/panda.ts` is generated from `Tensorphysics Software/actuatorfit/results/panda/results.json`. Re-export it when the study changes; don't hand-edit numbers.
- The sandbox and the ActuatorFit card **interpolate** the study (nominal and all-errors corner are exact; points between are estimates). This is said on the page.
- The hero arm's load is illustrative. The PhysicsFuzz scene is a labelled demo with real numerics (same seed tunnels/explodes with one explicit 1/30 s step, stays stable with 12 semi-implicit substeps + CCD). The GapCheck bench path is synthetic (no real bench data yet). The Break card uses a toy landscape with the real search method. Each says so on screen.
- Beta sign-ups go to a Google Sheet through `BETA_WEBHOOK_URL` (an Apps Script web app with a secret key). Privacy notice at `/privacy`. Contact email is set in `lib/site.ts`.

## Performance notes

- The 3D scene loads only on the client (`next/dynamic`, `ssr: false`), so there is no hydration mismatch, and three.js stays out of the first-load bundle.
- Per-frame work mutates refs only; the HUD is written to the DOM at ~15 Hz; the render loop stops when the hero leaves the screen.
- Canvas demos pause off-screen. `prefers-reduced-motion` and the palette's "Motion: off" calm everything down.
