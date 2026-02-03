import type { Metadata, Viewport } from "next";
import { Bebas_Neue } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { NotificationSetup } from "@/components/NotificationSetup";
import { InstallBanner } from "@/components/InstallBanner";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

export const metadata: Metadata = {
  title: "Before Work",
  description: "Daily workout check-in. Streak. Zero friction.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Workout" },
};

export const viewport: Viewport = {
  themeColor: "#22c55e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${bebas.variable} antialiased font-sans`}>
        <NotificationSetup />
        <InstallBanner />
        <main className="min-h-dvh pb-20">{children}</main>
        <Nav />
        <SpeedInsights />
      </body>
    </html>
  );
}
