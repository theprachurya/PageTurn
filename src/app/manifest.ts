import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PageTurn — E-Reader",
    short_name: "PageTurn",
    description: "A beautiful web-based EPUB reader with offline support, highlights, bookmarks, and reading analytics.",
    start_url: "/shelf",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#8b5cf6",
    orientation: "any",
    categories: ["books", "education", "productivity"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
