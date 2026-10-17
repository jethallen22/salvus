import type { NextConfig } from "next";

// cacheComponents is left off: every page here is per-request (session or tap token),
// so the classic dynamic rendering model is simpler than Suspense-wrapping each read.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
