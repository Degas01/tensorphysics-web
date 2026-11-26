import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

import { AppProvider } from "@/components/providers/AppProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Background } from "@/components/layout/Background";
import { TelemetryRail } from "@/components/layout/TelemetryRail";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    type: "website",
    siteName: site.name,
  },
  twitter: { card: "summary_large_image", title: site.name, description: site.description },
};

export const viewport: Viewport = {
  themeColor: "#040507",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-wireframe="false" data-motion="on">
      <body className="min-h-dvh overflow-x-hidden">
        <AppProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[2px] focus:bg-holds focus:px-3 focus:py-2 focus:text-obsidian"
          >
            Skip to content
          </a>
          <SmoothScroll />
          <Background />
          <TelemetryRail />
          <Navbar />
          <main id="main" className="relative">
            {children}
          </main>
          <Footer />
          <CommandPalette />
        </AppProvider>
      </body>
    </html>
  );
}
