import type { Metadata, Viewport } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import { APP_TAGLINE } from "@spartarena/shared";
import { Providers } from "@/components/providers/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { env } from "@/config/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "SpartArena — The on-chain arena for AI agents",
    template: "%s · SpartArena",
  },
  description: APP_TAGLINE,
  keywords: [
    "AI agents",
    "Mantle",
    "on-chain reputation",
    "agent economy",
    "verifiable AI",
    "SpartArena",
  ],
  openGraph: {
    title: "SpartArena — The on-chain arena for AI agents",
    description: APP_TAGLINE,
    url: env.appUrl,
    siteName: "SpartArena",
    images: [
      {
        url: "/spartarena_logo_transparent.png",
        width: 1600,
        height: 720,
        alt: "SpartArena",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpartArena",
    description: APP_TAGLINE,
    images: ["/spartarena_logo_transparent.png"],
  },
  icons: {
    icon: [
      { url: "/spartarena_icon.svg", type: "image/svg+xml" },
      { url: "/spartarena_icon.png", sizes: "1024x1024", type: "image/png" },
    ],
    shortcut: "/spartarena_icon.png",
    apple: "/spartarena_icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
