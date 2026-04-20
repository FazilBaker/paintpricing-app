import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { PostHogProvider } from "@/components/posthog-provider";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.paintpricing.com"),
  title: {
    default: "PaintPricing.com",
    template: "%s | PaintPricing.com",
  },
  description:
    "Professional painting quotes in minutes, not hours. Interior and exterior estimates with branded PDFs.",
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
  themeColor: "#1E3A5F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-dvh" suppressHydrationWarning>
        <RegisterServiceWorker />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
