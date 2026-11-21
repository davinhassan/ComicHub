import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CatalogFeedback, Pagination } from "@/components/catalog-results";
import {
  catalogProvider,
  catalogResult,
  detailQuery,
  queryLink,
} from "@/lib/catalog";
import { mangaDexEnabled } from "@/lib/providers/registry";
import { Button } from "@/components/ui/button";
import { KomikuDetail } from "@/components/komiku-detail";
import { PepperCarrotDetail } from "@/components/peppercarrot-detail";

export const metadata = { title: "Detail komik" };
const limit = 20;
const statuses = {
  ongoing: "Berjalan",
  completed: "Tamat",
  hiatus: "Jeda",
  cancelled: "Dibatalkan",
  unknown: "Tidak diketahui",
};

export default async function Page({
  params,
  searchParams,
}: PageProps<"/comic/[provider]/[id]">) {
  const { provider, id } = await params;
  if (provider === "komiku") return <KomikuDetail id={id} />;
  if (provider === "peppercarrot") return <PepperCarrotDetail id={id} />;
  if (provider !== "mangadex" || !z.uuid().safeParse(id).success) notFound();
  const path = `/comic/${provider}/${id}`;
  const parsed = detailQuery.safeParse(await searchParams);
  const enabled = mangaDexEnabled();
  const result = await catalogResult(
    () => catalogProvider().getComic(id),
    enabled,
  );
  if (
    result.state === "error" &&
    ["NOT_FOUND", "FORBIDDEN"].includes(result.code)
  )
    notFound();
  if (result.state !== "ready")
    return (
      <section className="page-section">
        <h1 className="mb-4 text-3xl font-bold">Detail komik</h1>
        <CatalogFeedback state={result.state} />
      </section>
    );

  const comic = result.data;
  const chapters = parsed.success
    ? await catalogResult(
        () => catalogProvider().getChapters(id, { ...parsed.data, limit }),
        enabled,
      )
    : null;
  const offset = Number(parsed.data?.cursor ?? 0);
  const languages = [
    ...new Set([
      ...comic.availableLanguages,
      ...(parsed.data?.language ? [parsed.data.language] : []),
    ]),
  ].sort();
  return (
    <article className="page-section min-w-0">
      <h1 className="mb-3 break-words text-4xl font-bold tracking-tight">
        {comic.title}
      </h1>
      <p className="mb-4 text-muted-foreground">
        {comic.status && statuses[comic.status]} · Rating aman ·{" "}
        <a
          className="font-semibold text-primary underline"
          href={comic.sourceUrl}
        >
          MangaDex
        </a>
      </p>
      {comic.alternativeTitles.length > 0 && (
        <details className="mb-3 max-w-prose break-words text-muted-foreground">
          <summary className="cursor-pointer font-semibold">
            Judul alternatif
          </summary>
          <ul className="mt-2 list-inside list-disc">
            {comic.alternativeTitles.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </details>
      )}
      {comic.authors.length > 0 && (
        <p className="mb-3 break-words">{comic.authors.join(", ")}</p>
      )}
      <p className="max-w-prose whitespace-pre-line break-words text-muted-foreground">
        {comic.description || "Sinopsis belum tersedia."}
      </p>
      {comic.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tag">
          {comic.tags.map((tag) => (
            <li key={tag} className="rounded-lg bg-muted px-2 py-1 text-sm">
              {tag}
            </li>
          ))}
        </ul>
      )}
      <section className="mt-8" aria-labelledby="chapters">
        <h2 id="chapters" className="mb-3 text-2xl font-bold">
          Daftar chapter
        </h2>
        <form action={path} className="mb-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 font-semibold">
            Bahasa chapter
            <select
              name="language"
              className="catalog-field"
              defaultValue={parsed.data?.language ?? ""}
            >
              <option value="">Semua</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang === "id" ? "Indonesia" : lang}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">Terapkan</Button>
        </form>
        {!chapters ? (
          <CatalogFeedback state="invalid" />
        ) : chapters.state !== "ready" ? (
          <CatalogFeedback state={chapters.state} />
        ) : !chapters.data.items.length ? (
          <CatalogFeedback state="empty" />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {chapters.data.items.map((chapter) => (
              <li key={chapter.id} className="break-words p-3">
                {chapter.externalUrl ? (
                  <span className="font-semibold">{chapter.title}</span>
                ) : (
                  <Link
                    className="font-semibold text-primary underline"
                    prefetch={false}
                    href={`/read/${provider}/${chapter.id}`}
                  >
                    {chapter.title}
                  </Link>
                )}
                <span className="ml-2 text-sm text-muted-foreground">
                  {chapter.language}
                </span>
                <p className="mt-1 text-sm text-muted-foreground">
                  {chapter.groups?.length ? (
                    <>
                      Diterjemahkan oleh{" "}
                      {chapter.groups.map((group, index) => (
                        <span key={group.url}>
                          {index > 0 && ", "}
                          <a className="underline" href={group.url}>
                            {group.name}
                          </a>
                        </span>
                      ))}{" "}
                      ·{" "}
                    </>
                  ) : null}
                  <a
                    className="underline"
                    href={`https://mangadex.org/chapter/${chapter.id}`}
                    aria-label={`Buka ${chapter.title} di MangaDex`}
                  >
                    {chapter.externalUrl
                      ? "Hanya tersedia di situs penerbit lewat MangaDex"
                      : "Buka di MangaDex"}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}
        {chapters?.state === "ready" && (
          <Pagination
            previous={
              offset > 0
                ? queryLink(path, {
                    ...parsed.data,
                    cursor: String(Math.max(0, offset - limit)),
                  })
                : undefined
            }
            next={
              chapters.data.nextCursor
                ? queryLink(path, {
                    ...parsed.data,
                    cursor: chapters.data.nextCursor,
                  })
                : undefined
            }
          />
        )}
      </section>
    </article>
  );
}
