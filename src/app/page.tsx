import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IndonesianCards } from "@/components/indonesian-cards";
import { genres } from "@/lib/genres";
import {
  loadIndonesianCatalog,
  type CatalogCard,
} from "@/lib/providers/indonesian-catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const results = await loadIndonesianCatalog();
  const available = results.filter(({ items }) => items.length > 0);
  // Take one title per source in turn, so every source shows in the first row.
  const cards: CatalogCard[] = [];
  for (let row = 0; available.some(({ items }) => items[row]); row++) {
    for (const { items } of available) {
      if (items[row] && cards.length < 12) cards.push(items[row]);
    }
  }
  return (
    <div className="page-section">
      <section className="hero">
        <h1>Ruang baca untuk penggemar komik.</h1>
        <p>
          Manga, manhwa, dan manhua berbahasa Indonesia dari beberapa sumber,
          dalam satu tempat.
        </p>
        <Form action="/explore" role="search" className="hero-search">
          <label htmlFor="home-query" className="sr-only">
            Cari judul
          </label>
          <input
            id="home-query"
            name="q"
            type="search"
            maxLength={120}
            className="catalog-field"
            placeholder="Cari judul komik"
          />
          <Button type="submit">
            <Search className="size-5" aria-hidden="true" />
            Cari
          </Button>
        </Form>
      </section>
      <section className="mt-8" aria-labelledby="genres">
        <h2 id="genres" className="sr-only">
          Genre
        </h2>
        <ul className="flex flex-wrap gap-2">
          {Object.entries(genres).map(([id, label]) => (
            <li key={id}>
              <Link
                className="chip"
                href={`/explore?genre=${id}`}
                prefetch={false}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-10" aria-labelledby="updates">
        <div className="section-head">
          <h2 id="updates">Pembaruan terbaru</h2>
          <Link href="/explore" className="text-link">
            Jelajahi katalog
          </Link>
        </div>
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
