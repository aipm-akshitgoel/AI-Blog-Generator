import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  eslint: {
    // Avoid CI/Vercel failing on lint noise when ESLint is not fully configured interactively.
    ignoreDuringBuilds: true,
  },
  // Avoid wrong workspace root when a parent directory also has package-lock.json (Turbopack warning).
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Keep /ai-faq for tenant login page; serve the static FAQ SPA at /ai-faq/app.
        { source: "/ai-faq/app", destination: "/ai-faq/index.html" },
        // Mirror the same SPA for dummy tenant demo route.
        { source: "/ai-faq-test/app", destination: "/ai-faq/index.html" },
      ],
    };
  },
};

export default nextConfig;
