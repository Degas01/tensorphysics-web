export const site = {
  name: "TensorPhysics",
  tagline: "Make reality predictable.",
  description:
    "TensorPhysics searches for the places a physics simulation is wrong, measures how wrong it can be before your design fails, and tells you what to test on the bench first.",
  company: "TensorPhysics Ltd",
  companyNumber: "17325040",
  contactEmail: "giacomodemetrio@gmail.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://tensorphysics-web.vercel.app",
} as const;

export const nav = [
  { label: "Engine", href: "/engine" },
  { label: "ActuatorFit", href: "/actuatorfit" },
  { label: "PhysicsFuzz", href: "/physicsfuzz" },
  { label: "Evidence", href: "/evidence" },
] as const;

export type ModuleKey = "simulate" | "break" | "prove" | "improve";
