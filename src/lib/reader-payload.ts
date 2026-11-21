import { z } from "zod";
import { pepperCarrotOrigin } from "./peppercarrot-paths.ts";

export function readerPageUrl(provider: string) {
  return z.url({ protocol: /^https$/ }).refine((value) => {
    const url = new URL(value);
    if (url.username || url.password || url.port) return false;
    if (provider === "shinigami") {
      return (
        ["assets.shngm.id", "delivery.shngm.id"].includes(url.hostname) &&
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
    // MangaDex@Home may serve a chapter from any of its network nodes.
    return (
      provider === "mangadex" &&
      (url.hostname === "uploads.mangadex.org" ||
        url.hostname.endsWith(".mangadex.network")) &&
      /\/(?:data|data-saver)\/[\w-]+\/[\w-]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(
        url.pathname,
      )
    );
  });
}

export function readerPayload(provider: string) {
  const pageUrl = readerPageUrl(provider);
  const chapterId =
    provider === "shinigami" ? z.uuid() : z.number().nonnegative();

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
    credits: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          url: z
            .url()
            .refine((value) => value.startsWith("https://mangadex.org/group/")),
        }),
      )
      .max(20)
      .optional(),
    previous: chapterId.optional(),
    next: chapterId.optional(),
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
