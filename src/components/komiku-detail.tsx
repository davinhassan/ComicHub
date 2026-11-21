import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogFeedback } from "@/components/catalog-results";
import { catalogResult } from "@/lib/catalog";
import { comicSlug, komikuChapterPath } from "@/lib/komiku-paths";
import { getKomikuComic } from "@/lib/providers/komiku";

export async function KomikuDetail({ id }: { id: string }) {
  if (!comicSlug.safeParse(id).success) notFound();
  const result = await catalogResult(() => getKomikuComic(id));
  if (result.state === "error" && result.code === "NOT_FOUND") notFound();
  if (result.state !== "ready") {
    return (
      <section className="page-section">
        <h1 className="mb-4 text-3xl font-bold">Detail komik</h1>
        <CatalogFeedback state={result.state} source="Komiku" />
      </section>
    );
  }

  const { title, synopsis, chapters } = result.data;
  const chapterTitles = new Map<number, string>();
  for (const chapter of chapters) {
    const number = chapter.chapter_number;
    if (number != null && !chapterTitles.has(number)) {
      chapterTitles.set(number, chapter.title || `Chapter ${number}`);
    }
  }

  return (
    <article className="page-section">
      <h1 className="mb-3 break-words text-3xl font-bold tracking-tight text-balance">
        {title}
      </h1>
      <p className="mb-4">
        Sumber{" "}
        <a
          className="text-primary underline"
          href={`https://komiku.org/manga/${id}/`}
        >
          Komiku
        </a>
      </p>
      {synopsis && (
        <p className="max-w-prose whitespace-pre-line break-words text-muted-foreground">
          {synopsis}
        </p>
      )}
      <h2 className="mb-3 mt-8 text-2xl font-bold">Daftar chapter</h2>
      {chapterTitles.size ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[...chapterTitles].map(([number, name]) => (
            <li key={number}>
              <Link
                href={komikuChapterPath(id, number)}
                prefetch={false}
                className="flex min-h-11 items-center break-words rounded-xl border border-border bg-card px-3 py-2 font-semibold hover:border-primary hover:text-primary"
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <CatalogFeedback state="empty" />
      )}
    </article>
  );
}
