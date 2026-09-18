/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Raster/GIS processing and long-running satellite retrieval jobs must never
  // run inside a serverless request/response cycle — see src/lib/jobs/README.md.
  // This app only triggers and reads job status; the actual processing worker
  // is a separate long-running service (see ARCHITECTURE.md, Phase 5+).
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"]
  }
};

export default nextConfig;
