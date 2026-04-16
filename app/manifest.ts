import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PaintPricing.com",
    short_name: "PaintPricing",
    description:
      "Professional painting quotes in minutes, not hours.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#1E3A5F",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
