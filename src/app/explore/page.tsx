import Form from "next/form";
import { Search } from "lucide-react";
import { z } from "zod";
import { IndonesianCards } from "@/components/indonesian-cards";
import { Button } from "@/components/ui/button";
import { genres, type Genre } from "@/lib/genres";
import {
  loadIndonesianCatalog,
  sources,
} from "@/lib/providers/indonesian-catalog";

export const metadata = { title: "Jelajah" };
const filters = z.object({
  q: z.string().trim().max(120).default(""),
  source: z.union([z.literal(""), z.enum(sources)]).default(""),
  genre: z.enum(["", ...(Object.keys(genres) as Genre[])]).default(""),
});
const label = "grid gap-1 text-sm font-semibold";

export default async function Page({ searchParams }: PageProps<"/explore">) {
  const parsed = filters.safeParse(await searchParams);
  const query = parsed.data?.q ?? "";
  const source = parsed.data?.source || undefined;
  const genre = parsed.data?.genre || undefined;
  const results = parsed.success
    ? await loadIndonesianCatalog(query, source, genre)
    : [];
  const items = results.flatMap((result) => result.items);
  return (
    <section className="page-section">
      <h1 className="mb-5 text-3xl font-bold tracking-tight">Jelajah</h1>
      <Form
        action="/explore"
        className="mb-6 grid grid-cols-2 items-end gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]"
        role="search"
      >
        <div className={`${label} col-span-2 md:col-span-1`}>
          <label htmlFor="comic-query">Cari judul</label>
          <input
            id="comic-query"
            name="q"
            type="search"
            maxLength={120}
            defaultValue={query}
            key={query}
            className="catalog-field font-normal"
            placeholder="Judul komik"
          />
        </div>
        <label className={label}>
          Genre
          <select
            className="catalog-field font-normal"
            name="genre"
            defaultValue={genre ?? ""}
            key={genre}
          >
            <option value="">Semua genre</option>
            {Object.entries(genres).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Sumber
          <select
            className="catalog-field font-normal"
            name="source"
            defaultValue={source ?? ""}
            key={source}
          >
            <option value="">Semua sumber</option>
            {sources.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="col-span-2 md:col-span-1">
          <Search className="size-5" aria-hidden="true" />
          Cari
        </Button>
      </Form>
      {!parsed.success && <p role="status">Pencarian tidak valid.</p>}
      {items.length > 0 && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {items.length} judul
          </p>
          <IndonesianCards items={items} />
        </>
      )}
      {parsed.success &&
        !items.length &&
        results.some(({ failed }) => !failed) && (
          <p role="status" className="text-muted-foreground">
            Tidak ada judul yang cocok. Coba kata kunci lain atau hapus filter
            genre.
          </p>
        )}
      {results
        .filter(({ failed }) => failed)
        .map(({ name }) => (
          <p key={name} role="status" className="mt-3 text-muted-foreground">
            {name} sedang tidak tersedia.
          </p>
        ))}
    </section>
  );
}
