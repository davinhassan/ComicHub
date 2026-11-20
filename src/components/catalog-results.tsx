import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/feedback";
import type { ComicSummary } from "@/lib/providers/types";

export function CatalogFeedback({
  state,
  source = "MangaDex",
}: {
  source?: string;
  state: "disabled" | "error" | "empty" | "invalid";
}) {
  const messages = {
    disabled: `Sumber ${source} belum diaktifkan.`,
    error: `${source} sedang tidak dapat diakses. Coba muat ulang halaman.`,
    empty: "Tidak ada hasil yang cocok.",
    invalid: "Filter atau halaman tidak valid. Setel ulang untuk melanjutkan.",
  };
  return (
    <Card>
      <p role="status">{messages[state]}</p>
    </Card>
  );
}

export function ComicGrid({ items }: { items: ComicSummary[] }) {
  if (!items.length) return <CatalogFeedback state="empty" />;
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <li key={`${item.provider}:${item.id}`} className="min-w-0">
          <Link
            className="block h-full overflow-hidden rounded-xl border border-border bg-card hover:bg-muted"
            href={`/comic/${item.provider}/${item.id}`}
            prefetch={false}
          >
            <div
              className="grid aspect-[4/3] place-items-center bg-muted text-primary"
              aria-hidden="true"
            >
              <BookOpen className="size-8" />
            </div>
            <div className="p-3">
              <h3 className="break-words font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                {item.type === "other" ? "Komik" : item.type} · MangaDex
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Pagination({
  previous,
  next,
}: {
  previous?: string;
  next?: string;
}) {
  if (!previous && !next) return null;
  return (
    <nav
      className="mt-5 flex flex-wrap gap-4 font-semibold text-primary"
      aria-label="Halaman hasil"
    >
      {previous && (
        <Link href={previous} prefetch={false}>
          Sebelumnya
        </Link>
      )}
      {next && (
        <Link href={next} prefetch={false}>
          Berikutnya
        </Link>
      )}
    </nav>
  );
}
