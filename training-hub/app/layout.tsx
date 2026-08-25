import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adaptive Fitness — Training Hub",
  description: "Canonical training program, exports, and Intervals.icu sync.",
  applicationName: "Training Hub",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Training Hub", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f3efe6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
