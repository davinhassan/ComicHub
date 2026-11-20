import Form from "next/form";
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
      <h1 className="mb-5 text-4xl font-bold tracking-tight">Jelajah</h1>
      <Form
        action="/explore"
        className="mb-7 grid gap-3 rounded-xl border border-border bg-card p-4"
        role="search"
      >
        <label htmlFor="comic-query" className="font-semibold">
          Cari judul
        </label>
        <input
          id="comic-query"
          name="q"
          type="search"
          maxLength={120}
          defaultValue={query}
          key={query}
          className="catalog-field"
          placeholder="Judul komik"
        />
        <label className="grid gap-1 font-semibold">
          Genre
          <select
            className="catalog-field"
            name="genre"
            defaultValue={genre ?? ""}
            key={genre}
          >
            <option value="">Semua genre</option>
            {Object.entries(genres).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="justify-self-start">
          Cari
        </Button>
      </Form>
      {!parsed.success && <p role="status">Pencarian tidak valid.</p>}
      {items.length > 0 && <IndonesianCards items={items} />}
      {parsed.success &&
        !items.length &&
        results.some(({ failed }) => !failed) && (
          <p role="status" className="text-muted-foreground">
            Tidak ada judul yang cocok.
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
