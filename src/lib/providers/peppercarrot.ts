import { z } from "zod";
import {
  pepperCarrotOrigin,
  pepperCarrotTitle,
} from "../peppercarrot-paths.ts";
import { fetchJson } from "./fetch-json.ts";
import { ProviderError } from "./errors.ts";

const index = z
  .array(
    z.object({
      name: z.string().regex(/^ep\d{2,3}_[A-Za-z0-9-]+$/),
      total_pages: z.number().int().min(1).max(99),
      translated_languages: z.array(z.string()),
    }),
  )
  .max(250);

export async function getPepperCarrotEpisodes() {
  const episodes = await fetchJson(
    new URL("/0_sources/episodes.json", pepperCarrotOrigin),
    index,
    {
      timeoutMs: 6500,
      userAgent: "ComicHub/0.1.0",
    },
  );

  return episodes
    .filter((episode) => episode.translated_languages.includes("id"))
    .map(({ name, total_pages }) => {
      const [episodeId, slug] = name.split("_");
      const number = Number(episodeId.slice(2));
      return {
        name,
        number,
        title: `Episode ${number} · ${slug.replaceAll("-", " ")}`,
        pageCount: total_pages,
      };
    })
    .sort((a, b) => a.number - b.number);
}

export async function getPepperCarrotReader(chapterId: string) {
  const episodes = await getPepperCarrotEpisodes();
  const position = episodes.findIndex(
    ({ number }) => String(number) === chapterId,
  );
  if (position === -1) throw new ProviderError("NOT_FOUND");
  const { name, title, pageCount } = episodes[position];
  const number = name.split("_")[0].slice(2);
  return {
    title: `${pepperCarrotTitle} · ${title}`,
    previous: episodes[position - 1]?.number,
    next: episodes[position + 1]?.number,
    creditsUrl: `${pepperCarrotOrigin}/id/webcomic-sources/${name}__files.html`,
    pages: Array.from({ length: pageCount + 1 }, (_, index) => ({
      index,
      url: `${pepperCarrotOrigin}/0_sources/${name}/low-res/id_Pepper-and-Carrot_by-David-Revoy_E${number}P${String(index).padStart(2, "0")}.jpg`,
    })),
  };
}
