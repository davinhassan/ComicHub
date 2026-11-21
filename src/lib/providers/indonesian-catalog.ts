import { ProviderError } from "./errors.ts";
import { listShinigami, shinigamiEnabled } from "./local-api-manga.ts";
import { getProvider, mangaDexEnabled } from "./registry.ts";
import type { Genre } from "../genres.ts";
import {
  pepperCarrotComicPath,
  pepperCarrotOrigin,
  pepperCarrotTitle,
} from "../peppercarrot-paths.ts";

const defaultSources = [pepperCarrotTitle, "MangaDex"] as const;
const shinigami = "Shinigami";
type Source = (typeof defaultSources)[number] | typeof shinigami;

export function catalogSources(): readonly Source[] {
  return shinigamiEnabled() ? [...defaultSources, shinigami] : defaultSources;
}

export interface CatalogCard {
  title: string;
  source: Source;
  href?: string;
  cover?: string;
  caption?: string;
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
  source?: Source,
  genre?: Genre,
) {
  const available = catalogSources();
  const selected = source
    ? available.filter((name) => name === source)
    : available;
  return Promise.all(
    selected.map(async (name) => {
      try {
        if (name === pepperCarrotTitle) {
          return { name, items: fromPepperCarrot(query, genre), failed: false };
        }
        if (name === shinigami) {
          const items = await listShinigami(query, genre);
          return { name, items, failed: false };
        }
        if (!mangaDexEnabled()) {
          return { name, items: [] as CatalogCard[], failed: false };
        }
        const items = await fromMangaDex(query, genre);
        return { name, items, failed: false };
      } catch (error) {
        if (!(error instanceof ProviderError)) throw error;
        return { name, items: [] as CatalogCard[], failed: true };
      }
    }),
  );
}
