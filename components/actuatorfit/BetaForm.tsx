"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

const input =
  "h-12 w-full rounded-xl border border-line bg-black/40 px-4 text-[15px] text-fg placeholder:text-dim transition-colors focus:border-holds focus:outline-none";

export function BetaForm({ product = "actuatorfit" }: { product?: "actuatorfit" | "physicsfuzz" }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    try {
      const r = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          name: fd.get("name"),
          email: fd.get("email"),
          org: fd.get("org"),
          robot: fd.get("robot"),
          hasModel: fd.get("hasModel") === "on",
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
    <div className="glass rounded-3xl p-6 sm:p-8">
      <AnimatePresence mode="wait">
        {state === "done" ? (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 py-6" role="status">
            <span className="flex size-11 items-center justify-center rounded-full bg-holds text-obsidian">
              <Check className="size-5" aria-hidden="true" />
            </span>
            <span className="font-mono text-xs tracking-[0.14em] text-holds">REQUEST RECEIVED</span>
            <span className="font-display text-2xl font-semibold">Thanks. We&apos;ll be in touch within 5 working days.</span>
            <button type="button" onClick={() => setState("idle")} className="mt-2 h-11 w-fit rounded-xl border border-line px-4 text-sm text-mute hover:text-fg">
              Send another
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
            <label className="flex flex-col gap-1.5 text-sm text-soft">
              Name
              <input className={input} name="name" autoComplete="name" required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-soft">
              Work email
              <input className={input} name="email" type="email" autoComplete="email" required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-soft">
              Company or lab <span className="text-dim">(optional)</span>
              <input className={input} name="org" autoComplete="organization" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-soft">
              {product === "physicsfuzz" ? "What are you building?" : "What are you sizing?"}
              <select className={input} name="robot" defaultValue={product === "physicsfuzz" ? "Game physics" : "Humanoid"}>
                {(product === "physicsfuzz"
                  ? ["Game physics", "Other"]
                  : ["Humanoid", "Quadruped / legged", "Robot arm", "Exoskeleton", "Other"]
                ).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
            {product === "actuatorfit" && (
              <label className="flex min-h-11 items-center gap-3 text-sm text-soft">
                <input type="checkbox" name="hasModel" className="size-[18px] accent-holds" /> I have an MJCF or URDF model ready
              </label>
            )}
            {/* honeypot */}
            <div className="hidden" aria-hidden="true">
              <label>
                Website <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <button
              type="submit"
              disabled={state === "sending"}
              className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-holds font-semibold text-obsidian transition-colors hover:bg-[#7ff7d2] disabled:opacity-60"
            >
              {state === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {product === "physicsfuzz" ? "Tell me when it's ready" : "Request beta access"}
            </button>
            {state === "error" && (
              <p role="alert" className="text-sm text-breaks">
                {error}
              </p>
            )}
            <p className="text-xs text-dim">We use your email only to contact you about this. [PRIVACY POLICY LINK]</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
