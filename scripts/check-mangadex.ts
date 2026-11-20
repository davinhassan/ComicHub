import { getProvider } from "../src/lib/providers/registry.ts";

const provider = getProvider("mangadex");
const search = await provider.search({ query: "Yotsuba", limit: 1 });
const match = search.items[0];
if (!match) throw new Error("Pencarian live tidak menghasilkan judul.");
const detail = await provider.getComic(match.id);
const chapters = await provider.getChapters(match.id, {
  limit: 3,
  language: "id",
});
if (!chapters.items.length) throw new Error("Daftar chapter Indonesia kosong.");
console.log(
  JSON.stringify(
    {
      provider: detail.provider,
      title: detail.title,
      comicId: detail.id,
      availableLanguages: detail.availableLanguages,
      totalIndonesianChapters: chapters.total,
      sample: chapters.items.map(({ id, language, number }) => ({
        id,
        language,
        number,
      })),
    },
    null,
    2,
  ),
);
