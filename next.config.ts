import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Avoid wrong workspace root when a parent directory also has package-lock.json (Turbopack warning).
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Next does not map /ai-faq → public/ai-faq/index.html by default; serve the SPA explicitly.
        { source: "/ai-faq", destination: "/ai-faq/index.html" },
      ],
    };
  },
};

export default nextConfig;
