"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

const input =
  "h-12 w-full rounded-[2px] border border-line bg-black/40 px-4 text-[15px] text-fg placeholder:text-dim transition-colors focus:border-holds focus:outline-none";

const TOPICS = ["ActuatorFit beta", "Partnership", "Press", "Privacy request", "Other"] as const;

export function ContactForm({ defaultTopic = "ActuatorFit beta" }: { defaultTopic?: (typeof TOPICS)[number] }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          org: fd.get("org"),
          topic: fd.get("topic"),
          message: fd.get("message"),
          website: fd.get("website"),
        }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!j.ok) throw new Error(j.error ?? "Something went wrong.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  return (
    <div className="glass rounded-[2px] p-6 sm:p-8">
      <AnimatePresence mode="wait">
        {state === "done" ? (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 py-6" role="status">
            <span className="flex size-11 items-center justify-center rounded-full bg-holds text-obsidian">
              <Check className="size-5" aria-hidden="true" />
            </span>
            <span className="font-mono text-xs tracking-[0.14em] text-holds">MESSAGE SENT</span>
            <span className="font-display text-2xl font-semibold">Thanks. We&apos;ll reply within 5 working days.</span>
            <button type="button" onClick={() => setState("idle")} className="mt-2 h-11 w-fit rounded-[2px] border border-line px-4 text-sm text-mute hover:text-fg">
              Send another
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm text-soft">
              Name
              <input className={input} name="name" autoComplete="name" required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-soft">
              Email
              <input className={input} name="email" type="email" autoComplete="email" required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-soft">
              Company or lab <span className="text-dim">(optional)</span>
              <input className={input} name="org" autoComplete="organization" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-soft">
              Topic
              <select className={input} name="topic" defaultValue={defaultTopic}>
                {TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-soft">
              Message
              <textarea
                name="message"
                required
                minLength={5}
                maxLength={4000}
                rows={6}
                className="w-full rounded-[2px] border border-line bg-black/40 px-4 py-3 text-[15px] text-fg placeholder:text-dim transition-colors focus:border-holds focus:outline-none"
              />
            </label>
            {/* honeypot */}
            <div className="hidden" aria-hidden="true">
              <label>
                Website <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <button
              type="submit"
              disabled={state === "sending"}
              className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-[2px] bg-holds font-semibold text-obsidian transition-colors hover:bg-[#5cf0ff] disabled:opacity-60"
            >
              {state === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Send message
            </button>
            {state === "error" && (
              <p role="alert" className="text-sm text-breaks">
                {error}
              </p>
            )}
            <p className="text-xs text-dim">
              We use your details only to reply to you.{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">
                Privacy
              </Link>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
