import { NextResponse } from "next/server";

/**
 * Beta / waitlist sign-up.
 * Nothing is stored by this route on its own. To receive sign-ups, set BETA_WEBHOOK_URL
 * in Vercel (Project → Settings → Environment Variables) to any endpoint that accepts a
 * JSON POST (e.g. a form service, Slack incoming webhook, Zapier, or your own API).
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROBOTS = new Set(["Humanoid", "Quadruped / legged", "Robot arm", "Exoskeleton", "Game physics", "Other"]);
const PRODUCTS = new Set(["actuatorfit", "physicsfuzz"]);

function clean(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real people never fill this hidden field
  if (clean(body.website, 200)) return NextResponse.json({ ok: true });

  const entry = {
    product: PRODUCTS.has(clean(body.product, 40)) ? clean(body.product, 40) : "actuatorfit",
    name: clean(body.name, 120),
    email: clean(body.email, 200).toLowerCase(),
    org: clean(body.org, 160),
    robot: ROBOTS.has(clean(body.robot, 40)) ? clean(body.robot, 40) : "Other",
    hasModel: body.hasModel === true,
    at: new Date().toISOString(),
  };

  if (!entry.name || !EMAIL.test(entry.email)) {
    return NextResponse.json({ ok: false, error: "Please add your name and a valid email." }, { status: 422 });
  }

  const hook = process.env.BETA_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) throw new Error(`webhook ${r.status}`);
    } catch (e) {
      console.error("[beta] webhook failed", e);
      return NextResponse.json({ ok: false, error: "Could not save your request. Please try again." }, { status: 502 });
    }
  } else {
    console.warn("[beta] BETA_WEBHOOK_URL not set; sign-up not stored:", entry.product, entry.robot);
  }

  return NextResponse.json({ ok: true });
}
