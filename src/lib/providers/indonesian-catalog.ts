import { z } from "zod";
import { fetchJson } from "./fetch-json.ts";
import { ProviderError } from "./errors.ts";
import { comicSlug, komikuChapterPath } from "../komiku-paths.ts";
import { listKomiku } from "./komiku.ts";
import { getProvider, mangaDexEnabled } from "./registry.ts";
import type { Genre } from "../genres.ts";
import {
  pepperCarrotComicPath,
  pepperCarrotOrigin,
  pepperCarrotTitle,
} from "../peppercarrot-paths.ts";

export const sources = [
  pepperCarrotTitle,
  "MangaDex",
  "Komiku",
  "Komikcast",
] as const;

export interface CatalogCard {
  title: string;
  source: (typeof sources)[number];
  href?: string;
  cover?: string;
  caption?: string;
}

const komikcastItem = z.object({
  title: z.string().min(1),
  slug: comicSlug,
  cover: z.string().nullish(),
  type: z.string().nullish(),
  chapter: z.string().nullish(),
  genres: z.array(z.object({ slug: z.string() })).default([]),
});

function allowedUrl(
  value: string | null | undefined,
  hosts: readonly string[],
) {
  if (!value || !URL.canParse(value)) return undefined;
  const url = new URL(value);
  if (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    hosts.includes(url.hostname)
  )
    return url.href;
}

const options = { timeoutMs: 6500, userAgent: "ComicHub/0.1.0" };
const komikcastBase = "https://s1.komikcast00.co.id";

async function fromKomiku(
  query: string,
  genre?: Genre,
): Promise<CatalogCard[]> {
  const items = await listKomiku(query, genre);
  return items.map((item) => ({
    title: item.title,
    source: "Komiku",
    href:
      !query && !genre && item.latest_chapter?.chapter_number != null
        ? komikuChapterPath(item.slug, item.latest_chapter.chapter_number)
        : `/comic/komiku/${item.slug}`,
    cover: allowedUrl(item.poster, ["thumbnail.komiku.org"]),
    caption: item.latest_chapter?.title || item.type || undefined,
  }));
}

async function fromKomikcast(
  query: string,
  genre?: Genre,
): Promise<CatalogCard[]> {
  if (query === "." || query === "..") return [];
  const endpoint = query
    ? `search/${encodeURIComponent(query)}`
    : genre
      ? `genre/${genre}/1`
      : "home";
  const url = new URL(`/api/comic/komikcast/${endpoint}`, komikcastBase);
  const items = z.array(komikcastItem).max(100);
  const { data } = await fetchJson(
    url,
    z.object({
      success: z.literal(true),
      data:
        query || genre
          ? items
          : z
              .object({ latestUpdates: items })
              .transform(({ latestUpdates }) => latestUpdates),
    }),
    options,
  );
  return data
    .filter((item) => !genre || item.genres.some((tag) => tag.slug === genre))
    .map((item) => ({
      title: item.title,
      source: "Komikcast",
      href: `${komikcastBase}/detail-comic/${item.slug}`,
      cover: allowedUrl(item.cover, ["direct-stor.berkasdrive.com"]),
      caption: item.chapter || item.type || undefined,
    }));
}

const comicTypes = { manga: "Manga", manhwa: "Manhwa", manhua: "Manhua" };

async function fromMangaDex(
  query: string,
  genre?: Genre,
): Promise<CatalogCard[]> {
  const provider = getProvider("mangadex");
  // MangaDex filters by tag id, so match its genre names to our slugs.
  const tag = genre
    ? (await provider.getGenres()).find(
        ({ label }) => label.toLowerCase().replaceAll(" ", "-") === genre,
      )
    : undefined;
  if (genre && !tag) return [];
  const { items } = await provider.search({
    query,
    genre: tag?.id,
    language: "id",
    sort: query ? undefined : "latest",
    limit: 24,
  });
  return items.map((item) => ({
    title: item.title,
    source: "MangaDex",
    href: `/comic/mangadex/${item.id}?language=id`,
    // MangaDex forbids hotlinking, so covers go through /api/covers.
    cover: item.coverUrl && `/api${new URL(item.coverUrl).pathname}`,
    caption: item.type === "other" ? undefined : comicTypes[item.type],
  }));
}

function fromPepperCarrot(query: string, genre?: Genre): CatalogCard[] {
  const normalizedQuery = query.toLowerCase().replace(/\s*&\s*/g, " and ");
  if (!"pepper and carrot".includes(normalizedQuery)) return [];
  if (genre && genre !== "comedy" && genre !== "fantasy") return [];
  return [
    {
      title: pepperCarrotTitle,
      source: pepperCarrotTitle,
      href: pepperCarrotComicPath,
      cover: `${pepperCarrotOrigin}/0_sources/ep26_Books-Are-Great/low-res/gfx-only/gfx_Pepper-and-Carrot_by-David-Revoy_E26.jpg`,
      caption: "Baca di ComicHub · Bahasa Indonesia",
    },
  ];
}

export async function loadIndonesianCatalog(
  query = "",
  source?: (typeof sources)[number],
  genre?: Genre,
) {
  const selected = source ? [source] : sources;
  return Promise.all(
    selected.map(async (name) => {
      try {
        if (name === pepperCarrotTitle) {
          return { name, items: fromPepperCarrot(query, genre), failed: false };
        }
        if (name === "MangaDex" && !mangaDexEnabled()) {
          return { name, items: [] as CatalogCard[], failed: false };
        }
        const items = await (name === "MangaDex"
          ? fromMangaDex(query, genre)
          : name === "Komiku"
            ? fromKomiku(query, genre)
            : fromKomikcast(query, genre));
        return { name, items, failed: false };
      } catch (error) {
        if (!(error instanceof ProviderError)) throw error;
        return { name, items: [] as CatalogCard[], failed: true };
      }
    }),
  );
}
