import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What TensorPhysics collects when you sign up for a beta, why, and how to have it deleted.",
};

const sections: { h: string; p: React.ReactNode }[] = [
  {
    h: "Who we are",
    p: (
      <>
        {site.company} (company no. {site.companyNumber}, England &amp; Wales) is responsible for the data described here. Contact:{" "}
        <a className="text-holds hover:underline" href={`mailto:${site.contactEmail}`}>
          {site.contactEmail}
        </a>
        .
      </>
    ),
  },
  {
    h: "What we collect",
    p: "Only what you type into a beta or notify form: your name, email, company or lab (optional), what you are building, whether you have a robot model ready, which product you asked about, and the time you sent it.",
  },
  {
    h: "Why",
    p: "To contact you about the beta you asked for, and nothing else. We do not sell it, share it for marketing, or add you to a newsletter. The legal basis is your consent, given when you send the form.",
  },
  {
    h: "Where it is kept",
    p: "Sign-ups are stored in a Google Sheet that only TensorPhysics can open (Google acts as our processor). The site is hosted on Vercel, which keeps short-lived server logs, including IP addresses, to run and protect the service. Both may process data outside the UK under their standard safeguards.",
  },
  {
    h: "Cookies and tracking",
    p: "This site sets no cookies and uses no analytics or advertising trackers.",
  },
  {
    h: "How long",
    p: "Until the beta you signed up for ends, and at most 24 months, unless you become a customer. You can ask us to delete it sooner at any time.",
  },
  {
    h: "Your rights",
    p: (
      <>
        You can ask to see, correct or delete your data, or withdraw consent, by emailing{" "}
        <a className="text-holds hover:underline" href={`mailto:${site.contactEmail}`}>
          {site.contactEmail}
        </a>
        . We reply within one month, usually much sooner. If something isn&apos;t right, email us first and we&apos;ll fix it. UK law also
        gives you the right to contact the Information Commissioner&apos;s Office.
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-[760px] px-6 pb-10 pt-14 sm:px-8 lg:pt-20">
      <nav aria-label="Breadcrumb" className="mb-8 font-mono text-xs text-mute">
        <Link href="/" className="hover:text-holds">home</Link> / <span className="text-holds">privacy</span>
      </nav>
      <h1 className="font-display text-[clamp(36px,4.6vw,56px)] font-semibold leading-none tracking-[-0.03em]">Privacy</h1>
      <p className="mt-4 font-mono text-xs text-dim">Last updated 22 November 2026</p>
      <div className="mt-10 flex flex-col gap-8">
        {sections.map((s) => (
          <div key={s.h} className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-semibold">{s.h}</h2>
            <p className="text-[15px] leading-relaxed text-soft">{s.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
