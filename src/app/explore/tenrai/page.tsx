import Form from "next/form";
import Link from "next/link";
import { Pagination } from "@/components/catalog-results";
import { Card } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { queryLink } from "@/lib/catalog";
import { ProviderError } from "@/lib/providers/errors";
import { searchTenrai, tenraiQuery } from "@/lib/providers/tenrai";

export const metadata = { title: "Jelajah Tenrai" };

async function loadResults(input: Parameters<typeof searchTenrai>[0]) {
  try {
    return { data: await searchTenrai(input) };
  } catch (error) {
    if (!(error instanceof ProviderError)) throw error;
    return {
      message:
        error.code === "RATE_LIMITED"
          ? "Batas permintaan Tenrai tercapai. Coba lagi nanti."
          : "Tenrai sedang tidak dapat diakses. Coba lagi nanti.",
    };
  }
}

export default async function Page({
  searchParams,
}: PageProps<"/explore/tenrai">) {
  const path = "/explore/tenrai";
  const parsed = tenraiQuery.safeParse(await searchParams);
  const query = parsed.data?.q ?? "";
  const page = Number(parsed.data?.page ?? "1");
  const result =
    parsed.success && query ? await loadResults(parsed.data) : null;
  const message = !parsed.success
    ? "Permintaan pencarian tidak valid."
    : (result?.message ??
      (result && !result.data?.data.length
        ? "Tidak ada judul yang cocok."
        : null));
  return (
    <section className="page-section">
      <p className="mb-3">
        <Link href="/explore" className="font-semibold text-primary underline">
          Jelajah MangaDex
        </Link>
      </p>
      <h1 className="mb-3 text-4xl font-bold tracking-tight">Jelajah Tenrai</h1>
      <p className="mb-5 text-muted-foreground">
        Cari metadata manga dari Tenrai. Judul membuka detail di MyAnimeList.
      </p>
      <Form action={path} className="mb-6 grid gap-3" role="search">
        <label htmlFor="tenrai-query" className="font-semibold">
          Cari judul
        </label>
        <input
          id="tenrai-query"
          name="q"
          type="search"
          key={query}
          defaultValue={query}
          maxLength={120}
          className="catalog-field"
          placeholder="Contoh: Yotsuba"
        />
        <Button type="submit" className="justify-self-start">
          Cari
        </Button>
      </Form>
      {message && (
        <Card>
          <p role="status">{message}</p>
        </Card>
      )}
      {result?.data && result.data.data.length > 0 && (
        <>
          <h2 className="mb-3 text-xl font-semibold">Hasil Tenrai</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {result.data.data.map((comic) => (
              <li key={comic.mal_id} className="min-w-0">
                <Card>
                  <h3 className="break-words font-semibold">
                    <a
                      className="text-primary underline"
                      href={`https://myanimelist.net/manga/${comic.mal_id}`}
                    >
                      {comic.title}
                    </a>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {comic.type || "Komik"} · Tenrai
                  </p>
                  {comic.synopsis && (
                    <p className="mt-2 line-clamp-3 break-words text-sm">
                      {comic.synopsis}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
      {result?.data && (
        <Pagination
          previous={
            page > 1
              ? queryLink(path, { q: query, page: String(page - 1) })
              : undefined
          }
          next={
            page < 999 && result.data.pagination.has_next_page
              ? queryLink(path, { q: query, page: String(page + 1) })
              : undefined
          }
        />
      )}
    </section>
  );
}
