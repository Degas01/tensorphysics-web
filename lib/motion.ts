import type { Transition } from "framer-motion";

/** The one spring used across the site. */
export const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };
export const springSoft: Transition = { type: "spring", stiffness: 300, damping: 30, mass: 1.4 };
