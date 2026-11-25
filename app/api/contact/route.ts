import { NextResponse } from "next/server";

/**
 * Contact form.
 * Forwards each message as JSON (type: "contact") to CONTACT_WEBHOOK_URL, or to BETA_WEBHOOK_URL when that
 * is not set. The receiving Apps Script logs it and emails it on to the company inbox. The inbox address
 * lives only in that private script, never in this public code.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOPICS = new Set(["ActuatorFit beta", "Partnership", "Press", "Privacy request", "Other"]);

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

  const topic = clean(body.topic, 40);
  const entry = {
    type: "contact",
    name: clean(body.name, 120),
    email: clean(body.email, 200).toLowerCase(),
    org: clean(body.org, 160),
    topic: TOPICS.has(topic) ? topic : "Other",
    message: clean(body.message, 4000),
    at: new Date().toISOString(),
  };

  if (!entry.name || !EMAIL.test(entry.email)) {
    return NextResponse.json({ ok: false, error: "Please add your name and a valid email." }, { status: 422 });
  }
  if (entry.message.length < 5) {
    return NextResponse.json({ ok: false, error: "Please write a short message." }, { status: 422 });
  }

  const hook = process.env.CONTACT_WEBHOOK_URL ?? process.env.BETA_WEBHOOK_URL;
  if (!hook) {
    console.warn("[contact] no webhook set; message not delivered");
    return NextResponse.json({ ok: false, error: "Messages can't be sent right now. Please try again later." }, { status: 503 });
  }
  try {
    const r = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`webhook ${r.status}`);
  } catch (e) {
    console.error("[contact] webhook failed", e);
    return NextResponse.json({ ok: false, error: "Could not send your message. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
