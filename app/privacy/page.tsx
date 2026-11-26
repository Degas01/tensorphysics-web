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
        {site.company} (company no. {site.companyNumber}, registered in England &amp; Wales; registered office:{" "}
        {site.registeredOffice}) is responsible for the data described here. Contact us through the{" "}
        <Link className="text-holds hover:underline" href={site.contactPath}>
          contact form
        </Link>
        .
      </>
    ),
  },
  {
    h: "What we collect",
    p: "Only what you type into a form. Beta or notify forms: your name, email, company or lab (optional), the type of robot you work on (chosen from a list), whether you have a robot model ready, which product you asked about, and the time you sent it. Contact form: your name, email, company or lab (optional), the topic, your message and the time you sent it.",
  },
  {
    h: "Why",
    p: "To contact you about the beta you asked for, or to reply to your message, and nothing else. We do not sell it, share it for marketing, or add you to a newsletter. We rely on our legitimate interest in answering requests people send us. For beta sign-ups, we rely on your request to join. We make no automated decisions about you.",
  },
  {
    h: "Robot files",
    p: (
      <>
        If you send us a robot model (MJCF or URDF) or related files, we use them only to run the checks you asked for. We don&apos;t share them, publish
        them or use them to train anything. We delete them within 90 days of sending you the results, or sooner if you ask. If you need an NDA before
        sending, ask through the{" "}
        <Link className="text-holds hover:underline" href={site.contactPath}>
          contact form
        </Link>
        .
      </>
    ),
  },
  {
    h: "If we contacted you first",
    p: "We sometimes email people at robotics companies and labs about our work, using business contact details that are publicly available. We keep your name, work email, company and our messages for up to 24 months. If you'd rather not hear from us, reply \"stop\" and we'll remove you.",
  },
  {
    h: "Where it is kept",
    p: "Sign-ups and messages are stored in a Google Sheet that only TensorPhysics can open, and messages are also forwarded to our company inbox (Google acts as our processor). The site is hosted on Vercel, which keeps short-lived server logs, including IP addresses, to run and protect the service. Both may process data outside the UK. Where they do, they rely on UK-approved safeguards such as the International Data Transfer Addendum.",
  },
  {
    h: "Cookies and tracking",
    p: "This site sets no cookies and uses no analytics or advertising trackers.",
  },
  {
    h: "How long",
    p: "Sign-ups: until the beta you signed up for ends, and at most 24 months, unless you become a customer. Messages: as long as the conversation needs, and at most 24 months. You can ask us to delete it sooner at any time.",
  },
  {
    h: "Your rights",
    p: (
      <>
        You can ask to see, correct or delete your data, to restrict or object to how we use it, or to receive a copy in a portable format, through the{" "}
        <Link className="text-holds hover:underline" href={site.contactPath}>
          contact form
        </Link>{" "}
        (topic: Privacy request). We reply within one month, usually much sooner. If something isn&apos;t right, tell us first and we&apos;ll fix it. UK law also
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
      <p className="mt-4 font-mono text-xs text-dim">Last updated 26 November 2026</p>
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
