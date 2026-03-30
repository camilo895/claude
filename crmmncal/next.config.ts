import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Otimizações para produção
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Fotos do Google
      },
    ],
  },
  // Permitir external packages no server
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
