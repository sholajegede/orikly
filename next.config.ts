import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets the admin subdomain and customer subdomains load in development (admin.localhost:3000).
  allowedDevOrigins: ["admin.localhost", "*.localhost"],
};

export default nextConfig;
