import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // heic-convert ships a WASM decoder; keep it out of the bundle and load it from node_modules.
  serverExternalPackages: ["heic-convert", "libheif-js"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
