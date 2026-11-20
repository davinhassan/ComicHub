import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/explore/otakudesu",
        destination: "/explore?source=Komiku",
        permanent: false,
      },
      { source: "/explore/tenrai", destination: "/explore", permanent: false },
      {
        source: "/comic/mangadex/:id",
        destination: "/explore",
        permanent: false,
      },
    ];
  },
};

export default config;
