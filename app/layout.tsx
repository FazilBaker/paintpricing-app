import type { Metadata, Viewport } from "next";
import { Public_Sans, Space_Grotesk } from "next/font/google";

import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://paintpricing.com"),
  title: {
    default: "PaintPricing.com",
    template: "%s | PaintPricing.com",
  },
  description:
    "Create polished interior repaint quote PDFs in under a minute with saved rates, room templates, and a live pricing calculator.",
  applicationName: "PaintPricing.com",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PaintPricing",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1965d2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
