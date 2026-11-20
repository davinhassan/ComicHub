import { z } from "zod";
import { pepperCarrotOrigin } from "./peppercarrot-paths.ts";

export function readerPayload(provider: string) {
  const pageUrl = z.url({ protocol: /^https$/ }).refine((value) => {
    const url = new URL(value);
    if (url.username || url.password || url.port) return false;
    if (provider === "komiku") {
      return (
        url.hostname === "img.komiku.org" &&
        /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname)
      );
    }
    if (provider === "peppercarrot") {
      return (
        url.origin === pepperCarrotOrigin &&
        /^\/0_sources\/ep(\d{2,3})_[A-Za-z0-9-]+\/low-res\/id_Pepper-and-Carrot_by-David-Revoy_E\1P\d{2}\.jpg$/.test(
          url.pathname,
        )
      );
    }
    return (
      provider === "mangadex" &&
      url.hostname === "uploads.mangadex.org" &&
      /^\/(data|data-saver)\//.test(url.pathname)
    );
  });

  return z.object({
    title: z.string().optional(),
    creditsUrl: z
      .url()
      .refine(
        (value) =>
          provider === "peppercarrot" &&
          value.startsWith(pepperCarrotOrigin + "/") &&
          /^\/id\/webcomic-sources\/ep\d{2,3}_[A-Za-z0-9-]+__files\.html$/.test(
            new URL(value).pathname,
          ),
      )
      .optional(),
    previous: z.number().nonnegative().optional(),
    next: z.number().nonnegative().optional(),
    pages: z
      .array(
        z.object({
          index: z.number().int().nonnegative(),
          url: pageUrl,
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
        }),
      )
      .min(1)
      .max(500)
      .refine((pages) => pages.every((page, index) => page.index === index)),
  });
}
