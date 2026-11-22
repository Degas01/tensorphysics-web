# tensorphysics-web

The TensorPhysics website: **"Know where your simulation breaks."**
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
| `/` | Hero (decoding headline, magnetic CTAs, 3D stress-tested arm), bento playgrounds, Gap Margin sandbox, architecture blueprint, evidence, CTA |
| `/actuatorfit` | Product page, real Panda joint table (expandable), beta form |
| `/engine`, `/engine/[module]` | Simulate · Break · Prove · Improve, each with its own page and demo |
| `/evidence` | Every study with its pass/fail lines, failures included |
| `/physicsfuzz` | In-testing product page + notify form |
| `/api/beta` | Sign-up endpoint (validation, honeypot, optional webhook) |

Press **Ctrl/Cmd + K** anywhere for the command palette (navigation, wireframe mode, stress-test the arm, motion off).

## Data and honesty rules

- `lib/data/panda.ts` is generated from `Tensorphysics Software/actuatorfit/results/panda/results.json`. Re-export it when the study changes; don't hand-edit numbers.
- The sandbox and the ActuatorFit card **interpolate** the study (nominal and all-errors corner are exact; points between are estimates). This is said on the page.
- The hero arm's load is illustrative, the PhysicsFuzz terminal is a labelled demo, and the Break card uses a toy landscape with the real search method. Each says so on screen.
- Placeholder still to fill: `[PRIVACY POLICY LINK]` in the beta form (privacy page drafted, awaiting review). Contact email is set in `lib/site.ts`.

## Performance notes

- The 3D scene loads only on the client (`next/dynamic`, `ssr: false`), so there is no hydration mismatch, and three.js stays out of the first-load bundle.
- Per-frame work mutates refs only; the HUD is written to the DOM at ~15 Hz; the render loop stops when the hero leaves the screen.
- Canvas demos pause off-screen. `prefers-reduced-motion` and the palette's "Motion: off" calm everything down.
