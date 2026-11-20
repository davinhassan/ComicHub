import { z } from "zod";

const siteUrl = z
  .url({ protocol: /^https?$/ })
  .parse(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

export const metadataBase = new URL(siteUrl);
