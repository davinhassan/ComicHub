import Link from "next/link";
import { Compass, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IndonesianCards } from "@/components/indonesian-cards";
import { loadIndonesianCatalog } from "@/lib/providers/indonesian-catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const results = await loadIndonesianCatalog();
  const available = results.filter(({ items }) => items.length > 0);
  const cards = available.flatMap(({ items }) =>
    items.slice(0, Math.floor(8 / available.length)),
  );
  return (
    <div className="page-section">
      <section className="hero">
        <div>
          <h1>Ruang baca untuk penggemar komik.</h1>
          <p>Temukan manga, manhwa, dan manhua di ComicHub.</p>
          <Button asChild>
            <Link href="/explore">
              <Compass className="size-5" aria-hidden="true" />
              Jelajahi katalog
            </Link>
          </Button>
        </div>
        <div className="hero-icon" aria-hidden="true">
          <Layers3 />
        </div>
      </section>
      <section className="mt-9" aria-labelledby="updates">
        <h2 id="updates" className="mb-4 text-2xl font-bold">
          Pembaruan terbaru
        </h2>
        {cards.length ? (
          <IndonesianCards items={cards} />
        ) : (
          <p role="status">Katalog sedang tidak tersedia.</p>
        )}
        {results
          .filter(({ failed }) => failed)
          .map(({ name }) => (
            <p
              key={name}
              role="status"
              className="mt-3 text-sm text-muted-foreground"
            >
              {name} sedang tidak tersedia.
            </p>
          ))}
      </section>
    </div>
  );
}
