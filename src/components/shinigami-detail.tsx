import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CatalogFeedback } from "@/components/catalog-results";
import { Button } from "@/components/ui/button";
import { catalogResult } from "@/lib/catalog";
import {
  getShinigamiSeries,
  shinigamiEnabled,
} from "@/lib/providers/local-api-manga";

export async function ShinigamiDetail({ id }: { id: string }) {
  if (!shinigamiEnabled() || !z.uuid().safeParse(id).success) notFound();
  const result = await catalogResult(() => getShinigamiSeries(id));
  if (result.state === "error" && result.code === "NOT_FOUND") notFound();

  if (result.state !== "ready") {
    return (
      <section className="page-section">
        <h1 className="mb-4 text-3xl font-bold">Detail komik</h1>
        <CatalogFeedback state={result.state} source="Shinigami" />
      </section>
    );
  }

  const series = result.data;
  return (
    <article className="page-section">
      <h1 className="mb-4 break-words text-3xl font-bold">{series.title}</h1>
      {series.latest_chapter_id ? (
        <Button asChild>
          <Link
            href={`/read/shinigami/${series.latest_chapter_id}`}
            prefetch={false}
          >
            Baca chapter terbaru
            {series.latest_chapter_number != null &&
              ` (${series.latest_chapter_number})`}
          </Link>
        </Button>
      ) : (
        <p role="status">Chapter belum tersedia.</p>
      )}
      {series.description && (
        <p className="mt-4 max-w-prose whitespace-pre-line break-words text-muted-foreground">
          {series.description}
        </p>
      )}
    </article>
  );
}
