import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // LINE profile pictures
      { protocol: "https", hostname: "profile.line-scdn.net" },
      // Supabase Storage (slip / menu images). Host is set per project via env.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
