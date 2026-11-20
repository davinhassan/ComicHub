import { z } from "zod";
import { comicSlug } from "../komiku-paths.ts";
import type { Genre } from "../genres.ts";
import { ProviderError } from "./errors.ts";
import { fetchJson } from "./fetch-json.ts";

const base = "https://api.otakudesu.natee.my.id/api/v1/comic";
const options = { timeoutMs: 6500, userAgent: "ComicHub/0.1.0" };

const chapter = z.object({
  title: z.string().nullish(),
  chapter_number: z.number().nonnegative().nullish(),
});

const komikuItem = z.object({
  title: z.string().min(1),
  slug: comicSlug,
  poster: z.string().nullish(),
  type: z.string().nullish(),
  latest_chapter: chapter.nullish(),
});

export async function listKomiku(query: string, genre?: Genre) {
  const browse = Boolean(query || genre);
  const url = new URL(`${base}/${browse ? "browse" : "home"}`);
  if (query) url.searchParams.set("q", query);
  else if (genre) url.searchParams.set("genre", genre);
  const items = z.array(komikuItem).max(100);
  const { data } = await fetchJson(
    url,
    z.object({
      data: browse
        ? z.object({ comics: items }).transform(({ comics }) => comics)
        : z
            .object({ latest_manga: items })
            .transform(({ latest_manga }) => latest_manga),
    }),
    options,
  );
  if (!query || !genre) return data;

  // The search endpoint omits genres. Look up the returned titles in small batches.
  const matches: typeof data = [];
  for (let start = 0; start < data.length; start += 3) {
    const batch = await Promise.all(
      data.slice(start, start + 3).map(async (item) => {
        try {
          const detail = await getKomikuComic(item.slug);
          return detail.genres.some((tag) => tag.slug === genre) ? item : null;
        } catch (error) {
          if (error instanceof ProviderError && error.code === "NOT_FOUND")
            return null;
          throw error;
        }
      }),
    );
    for (const item of batch) {
      if (item) matches.push(item);
    }
  }
  return matches;
}

export async function getKomikuComic(slug: string) {
  const { data } = await fetchJson(
    new URL(`${base}/${slug}`),
    z.object({
      data: z.object({
        title: z.string().min(1),
        synopsis: z.string().nullish(),
        genres: z.array(z.object({ slug: z.string() })).default([]),
        chapters: z.array(chapter).max(5000),
      }),
    }),
    options,
  );
  return data;
}

export async function getKomikuReader(chapterId: string) {
  const [slug, number] = chapterId.split("~");
  const allowed = process.env.KOMIKU_READER_ALLOWED_COMICS?.split(",").map(
    (id) => id.trim(),
  );
  if (!allowed?.includes(slug)) throw new ProviderError("NO_LICENSE");

  const { data } = await fetchJson(
    new URL(`${base}/${slug}/chapter/${number}`),
    z.object({
      data: z.object({
        comic: z.object({ slug: z.literal(slug) }),
        chapter_number: z.literal(Number(number)),
        title: z.string().nullish(),
        images: z.array(z.string()).max(500),
        prev: chapter.nullish(),
        next: chapter.nullish(),
      }),
    }),
    options,
  );
  return {
    title: data.title || undefined,
    previous: data.prev?.chapter_number ?? undefined,
    next: data.next?.chapter_number ?? undefined,
    pages: data.images.map((url, index) => ({ index, url })),
  };
}
