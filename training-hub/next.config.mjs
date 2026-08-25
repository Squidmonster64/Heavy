import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Parent Lift Log package-lock.json must not become the workspace root.
  outputFileTracingRoot: appRoot,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
