import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      "/explore/otakudesu",
      "/explore/tenrai",
      "/comic/komiku/:id",
      "/read/komiku/:chapterId",
    ].map((source) => ({ source, destination: "/explore", permanent: false }));
  },
};

export default config;
