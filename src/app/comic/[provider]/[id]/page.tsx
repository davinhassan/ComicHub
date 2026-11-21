import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
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
  unknown: "Status tidak diketahui",
};
const types = {
  manga: "Manga",
  manhwa: "Manhwa",
  manhua: "Manhua",
  other: "Komik",
};
const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

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
  const latest =
    chapters?.state === "ready"
      ? chapters.data.items.find((chapter) => !chapter.externalUrl)
      : undefined;
  return (
    <article className="page-section min-w-0">
      <header className="grid gap-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
        <div className="relative grid aspect-[3/4] w-36 place-items-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground sm:w-full">
          <BookOpen className="size-8" aria-hidden="true" />
          {comic.coverUrl && (
            // MangaDex covers are served through our cover proxy.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api${new URL(comic.coverUrl).pathname}`}
              alt=""
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="mb-3 break-words text-3xl font-bold tracking-tight text-balance">
            {comic.title}
          </h1>
          <ul className="mb-3 flex flex-wrap gap-2">
            <li className="badge">{types[comic.type]}</li>
            <li className="badge">{statuses[comic.status ?? "unknown"]}</li>
            <li className="badge">Rating aman</li>
          </ul>
          {comic.authors.length > 0 && (
            <p className="mb-3 break-words text-muted-foreground">
              Oleh {comic.authors.join(", ")}
            </p>
          )}
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {latest && (
              <Button asChild>
                <Link href={`/read/${provider}/${latest.id}`} prefetch={false}>
                  <BookOpen className="size-5" aria-hidden="true" />
                  Baca chapter terbaru
                </Link>
              </Button>
            )}
            <a className="text-link" href={comic.sourceUrl}>
              Lihat di MangaDex
            </a>
          </div>
          <p className="max-w-prose whitespace-pre-line break-words text-muted-foreground">
            {comic.description || "Sinopsis belum tersedia."}
          </p>
          {comic.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tag">
              {comic.tags.map((tag) => (
                <li key={tag} className="badge">
                  {tag}
                </li>
              ))}
            </ul>
          )}
          {comic.alternativeTitles.length > 0 && (
            <details className="mt-4 max-w-prose break-words text-muted-foreground">
              <summary className="cursor-pointer py-2 font-semibold">
                Judul alternatif
              </summary>
              <ul className="list-inside list-disc">
                {comic.alternativeTitles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </header>
      <section className="mt-10" aria-labelledby="chapters">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="chapters" className="text-2xl font-bold">
            Daftar chapter
          </h2>
          <form action={path} className="flex items-end gap-2">
            <label className="grid gap-1 text-sm font-semibold">
              Bahasa chapter
              <select
                name="language"
                className="catalog-field font-normal"
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
            <Button type="submit" variant="outline">
              Terapkan
            </Button>
          </form>
        </div>
        {!chapters ? (
          <CatalogFeedback state="invalid" />
        ) : chapters.state !== "ready" ? (
          <CatalogFeedback state={chapters.state} />
        ) : !chapters.data.items.length ? (
          <CatalogFeedback state="empty" />
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {chapters.data.items.map((chapter) => (
              <li
                key={chapter.id}
                className="min-w-0 break-words rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  {chapter.externalUrl ? (
                    <span className="font-semibold">{chapter.title}</span>
                  ) : (
                    <Link
                      className="font-semibold text-primary underline underline-offset-2"
                      prefetch={false}
                      href={`/read/${provider}/${chapter.id}`}
                    >
                      {chapter.title}
                    </Link>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {chapter.language.toUpperCase()}
                    {chapter.publishedAt &&
                      ` · ${dateFormat.format(new Date(chapter.publishedAt))}`}
                  </span>
                </div>
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
