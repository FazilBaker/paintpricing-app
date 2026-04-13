import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PaintPricing.com",
    short_name: "PaintPricing",
    description:
      "Fast interior repaint quote PDFs for solo painters and small crews.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f2",
    theme_color: "#1965d2",
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
