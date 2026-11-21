import { z } from "zod";
import type { Genre } from "../genres.ts";
import type { CatalogCard } from "./indonesian-catalog.ts";
import { fetchJson } from "./fetch-json.ts";
import { ProviderError } from "./errors.ts";

const item = z.object({
  title: z.string().trim().min(1),
  href: z.string(),
  genre: z.string().nullish(),
});
const response = z.object({
  status: z.literal("success"),
  data: z.array(item).max(100),
});
const seriesResponse = z.object({
  retcode: z.literal(0),
  data: z.object({
    title: z.string().trim().min(1),
    description: z.string().nullish(),
    latest_chapter_id: z.uuid().nullish(),
    latest_chapter_number: z.union([z.number(), z.string()]).nullish(),
  }),
});
const chapterResponse = z.object({
  retcode: z.literal(0),
  data: z.object({
    chapter_id: z.uuid(),
    chapter_title: z.string().nullish(),
    chapter_number: z.union([z.number(), z.string()]).nullish(),
    prev_chapter_id: z.uuid().nullish(),
    next_chapter_id: z.uuid().nullish(),
    base_url: z
      .enum(["https://assets.shngm.id", "https://delivery.shngm.id"])
      .nullish(),
    chapter: z.object({
      path: z.string().regex(/^\/(?!\/).*\/$/),
      data: z
        .array(z.string().regex(/^[^/\\?#]+$/))
        .min(1)
        .max(500),
    }),
  }),
});
const upstreamCatalogResponse = z.object({
  retcode: z.literal(0),
  data: z
    .array(
      z.object({
        manga_id: z.uuid(),
        title: z.string().trim().min(1),
        taxonomy: z
          .object({
            Genre: z.array(z.object({ name: z.string() })).nullish(),
          })
          .nullish(),
      }),
    )
    .max(100),
});
const shinigamiApi = "https://api.shngm.io/v1";
const requestOptions = { timeoutMs: 8000, userAgent: "ComicHub/0.1.0" };

export function localApiMangaEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.FEATURE_LOCAL_API_MANGA === "true"
  );
}

export function shinigamiEnabled() {
  return (
    localApiMangaEnabled() ||
    (process.env.VERCEL_ENV === "preview" &&
      process.env.FEATURE_PRIVATE_SHINIGAMI === "true")
  );
}

export async function getShinigamiSeries(id: string) {
  if (!shinigamiEnabled()) throw new ProviderError("NOT_FOUND");
  // Series metadata includes the latest chapter even when the chapter list fails.
  const { data } = await fetchJson(
    new URL(`${shinigamiApi}/manga/detail/${id}`),
    seriesResponse,
    requestOptions,
  );
  return data;
}

export async function getShinigamiReader(id: string) {
  if (!shinigamiEnabled()) throw new ProviderError("NOT_FOUND");
  const { data } = await fetchJson(
    new URL(`${shinigamiApi}/chapter/detail/${id}`),
    chapterResponse,
    requestOptions,
  );
  if (data.chapter_id !== id) throw new ProviderError("INVALID_RESPONSE");
  const imageBase = data.base_url ?? "https://delivery.shngm.id";
  return {
    title:
      data.chapter_title?.trim() ||
      `Chapter ${data.chapter_number ?? ""}`.trim(),
    previous: data.prev_chapter_id ?? undefined,
    next: data.next_chapter_id ?? undefined,
    pages: data.chapter.data.map((file, index) => ({
      index,
      url: `${imageBase}${data.chapter.path}${file}`,
    })),
  };
}

async function listLocalSeries(query: string) {
  const url = new URL(query ? "/search" : "/terbaru", "http://127.0.0.1:3300");
  url.searchParams.set("provider", "shinigami");
  if (query) url.searchParams.set("keyword", query);
  else url.searchParams.set("page", "1");

  const { data } = await fetchJson(url, response, requestOptions);
  const series = data.flatMap(({ title, href, genre: tags }) => {
    const match = /^\/series\/([^/]+)$/.exec(href);
    const id = z.uuid().safeParse(match?.[1]);
    return id.success ? [{ title, id: id.data, tags }] : [];
  });
  // The wrapper may return results from another provider when Shinigami fails.
  if (data.length && !series.length)
    throw new ProviderError("INVALID_RESPONSE");
  return series;
}

async function listPreviewSeries(query: string) {
  const url = new URL(`${shinigamiApi}/manga/list`);
  url.search = new URLSearchParams({
    page: "1",
    page_size: "24",
    sort: "latest",
    sort_order: "desc",
  }).toString();
  if (query) url.searchParams.set("q", query);
  const { data } = await fetchJson(
    url,
    upstreamCatalogResponse,
    requestOptions,
  );
  return data.map(({ title, manga_id, taxonomy }) => ({
    title,
    id: manga_id,
    tags: taxonomy?.Genre?.map(({ name }) => name).join(","),
  }));
}

export async function listShinigami(
  query: string,
  genre?: Genre,
): Promise<CatalogCard[]> {
  if (!shinigamiEnabled()) throw new ProviderError("NOT_FOUND");
  const series = await (localApiMangaEnabled()
    ? listLocalSeries(query)
    : listPreviewSeries(query));
  return series
    .filter(({ tags }) =>
      genre
        ? tags
            ?.split(",")
            .some(
              (tag) => tag.trim().toLowerCase().replace(/\s+/g, "-") === genre,
            )
        : true,
    )
    .map(({ title, id }) => ({
      title,
      source: "Shinigami",
      href: `/comic/shinigami/${id}`,
      caption: "Baca di ComicHub",
    }));
}
