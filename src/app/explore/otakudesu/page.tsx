import Link from "next/link";
import { z } from "zod";
import { Card } from "@/components/feedback";
import { fetchJson } from "@/lib/providers/fetch-json";
import { ProviderError } from "@/lib/providers/errors";

export const metadata = { title: "Jelajah Otakudesu" };
export const dynamic = "force-dynamic";

const home = z.object({
  data: z.object({
    latest_manga: z
      .array(
        z.object({
          title: z.string().min(1),
          slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
          type: z.string().nullish(),
          latest_chapter: z
            .object({
              title: z.string(),
              slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
            })
            .nullish(),
        }),
      )
      .max(100),
  }),
});

export default async function Page() {
  const result = await fetchJson(
    new URL("https://api.otakudesu.natee.my.id/api/v1/comic/home"),
    home,
    { timeoutMs: 8000, userAgent: "ComicHub/0.1.0" },
  ).catch((error: unknown) => {
    if (!(error instanceof ProviderError)) throw error;
    return null;
  });

  return (
    <section className="page-section">
      <Link
        href="/explore"
        className="mb-3 inline-block font-semibold text-primary underline"
      >
        Kembali ke Jelajah
      </Link>
      <h1 className="mb-3 text-4xl font-bold tracking-tight">
        Komik Indonesia
      </h1>
      <p className="mb-5 text-muted-foreground">
        Pembaruan dari Komiku melalui Otakudesu Community API.
      </p>
      {!result ? (
        <Card>
          <p role="status">Katalog Otakudesu sedang tidak tersedia.</p>
        </Card>
      ) : !result.data.latest_manga.length ? (
        <Card>
          <p role="status">Belum ada pembaruan.</p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {result.data.latest_manga.slice(0, 24).map((comic) => (
            <li key={comic.slug} className="min-w-0">
              <Card>
                <h2 className="break-words font-semibold">{comic.title}</h2>
                {comic.type && (
                  <p className="text-sm text-muted-foreground">{comic.type}</p>
                )}
                {comic.latest_chapter && (
                  <a
                    className="mt-2 inline-block text-primary underline"
                    href={`https://komiku.org/${comic.latest_chapter.slug}/`}
                  >
                    {comic.latest_chapter.title} di Komiku
                  </a>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
