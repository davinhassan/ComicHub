import { z } from "zod";
import { ProviderError } from "./providers/errors.ts";
import { getProvider } from "./providers/registry.ts";
import { getKomikuReader } from "./providers/komiku.ts";
import { getPepperCarrotReader } from "./providers/peppercarrot.ts";
import { komikuChapterId } from "./komiku-paths.ts";

export const readerId = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("mangadex"), chapterId: z.uuid() }),
  z.object({ provider: z.literal("komiku"), chapterId: komikuChapterId }),
  z.object({
    provider: z.literal("peppercarrot"),
    chapterId: z.string().regex(/^[1-9]\d{0,2}$/),
  }),
]);

export async function readerChapter(
  provider: string,
  chapterId: string,
  quality: "original" | "data-saver" = "original",
) {
  const parsed = readerId.safeParse({ provider, chapterId });
  if (!parsed.success) throw new ProviderError("NOT_FOUND");
  if (parsed.data.provider === "komiku")
    return getKomikuReader(parsed.data.chapterId);
  if (parsed.data.provider === "peppercarrot")
    return getPepperCarrotReader(parsed.data.chapterId);
  return getProvider(parsed.data.provider).getReader(
    parsed.data.chapterId,
    quality,
  );
}

export const readerErrors = {
  INVALID_INPUT: { status: 400, message: "Permintaan chapter tidak valid." },
  NOT_FOUND: { status: 404, message: "Chapter tidak ditemukan." },
  NO_LICENSE: {
    status: 403,
    message: "Chapter ini belum tersedia untuk dibaca di ComicHub.",
  },
  FORBIDDEN: { status: 403, message: "Akses chapter dibatasi oleh sumber." },
  RATE_LIMITED: {
    status: 429,
    message: "Batas permintaan tercapai. Coba lagi nanti.",
  },
  UPSTREAM_TIMEOUT: {
    status: 504,
    message: "Sumber terlalu lama merespons. Coba lagi.",
  },
  UNAVAILABLE: {
    status: 503,
    message: "Sumber chapter sedang tidak tersedia.",
  },
  INVALID_RESPONSE: {
    status: 502,
    message: "Sumber mengirim metadata yang tidak valid.",
  },
} as const;
