"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface AppState {
  wireframe: boolean;
  motionOff: boolean; // user toggle OR system reduced-motion
  paletteOpen: boolean;
  setWireframe: (v: boolean) => void;
  setMotionToggle: (v: boolean) => void;
  setPaletteOpen: (v: boolean) => void;
  stressPulse: number; // increments to make the hero arm flinch (easter egg)
  triggerStress: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [wireframe, setWireframe] = useState(false);
  const [motionToggle, setMotionToggle] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [stressPulse, setStressPulse] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.wireframe = wireframe ? "true" : "false";
  }, [wireframe]);

  useEffect(() => {
    document.documentElement.dataset.motion = motionToggle ? "off" : "on";
  }, [motionToggle]);

  // Global Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const triggerStress = useCallback(() => setStressPulse((n) => n + 1), []);

  const value = useMemo<AppState>(
    () => ({
      wireframe,
      motionOff: motionToggle || systemReduced,
      paletteOpen,
      setWireframe,
      setMotionToggle,
      setPaletteOpen,
      stressPulse,
      triggerStress,
    }),
    [wireframe, motionToggle, systemReduced, paletteOpen, stressPulse, triggerStress],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
