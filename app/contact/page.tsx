import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send TensorPhysics a message about the ActuatorFit beta, a partnership, press or a privacy request.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto grid max-w-[1240px] gap-10 px-6 pb-10 pt-14 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:pt-20">
      <div className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb" className="mb-4 font-mono text-xs text-mute">
          <Link href="/" className="hover:text-holds">home</Link> / <span className="text-holds">contact</span>
        </nav>
        <h1 className="font-display text-[clamp(36px,4.6vw,56px)] font-semibold leading-none tracking-[-0.03em]">Contact</h1>
        <p className="max-w-[460px] text-[16px] leading-relaxed text-soft">
          Questions about the ActuatorFit beta, a partnership, press, or your data. Send a message and we&apos;ll reply within 5 working days.
        </p>
        <p className="max-w-[460px] text-sm leading-relaxed text-mute">
          Want to run your own robot model?{" "}
          <Link href="/actuatorfit#beta" className="text-holds hover:underline">
            Join the beta
          </Link>{" "}
          instead.
        </p>
      </div>
      <ContactForm />
    </section>
  );
}
