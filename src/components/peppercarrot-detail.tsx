import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogFeedback } from "@/components/catalog-results";
import { catalogResult } from "@/lib/catalog";
import {
  pepperCarrotLicense,
  pepperCarrotOrigin,
  pepperCarrotSlug,
  pepperCarrotTitle,
} from "@/lib/peppercarrot-paths";
import { getPepperCarrotEpisodes } from "@/lib/providers/peppercarrot";

export async function PepperCarrotDetail({ id }: { id: string }) {
  if (id !== pepperCarrotSlug) notFound();
  const result = await catalogResult(getPepperCarrotEpisodes);
  return (
    <article className="page-section">
      <h1 className="mb-3 text-3xl font-bold tracking-tight">
        {pepperCarrotTitle}
      </h1>
      <p className="mb-3 text-muted-foreground">
        Fantasi · Komedi · Bahasa Indonesia
      </p>
      <p className="mb-4">
        Karya{" "}
        <a
          className="text-primary underline"
          href={`${pepperCarrotOrigin}/id/webcomics/peppercarrot.html`}
        >
          David Revoy
        </a>
        {" · "}
        <a className="text-primary underline" href={pepperCarrotLicense}>
          CC BY 4.0
        </a>
      </p>
      <h2 className="mb-3 mt-8 text-2xl font-bold">Daftar episode</h2>
      {result.state !== "ready" ? (
        <CatalogFeedback state={result.state} source={pepperCarrotTitle} />
      ) : !result.data.length ? (
        <CatalogFeedback state="empty" />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map(({ number, title }) => (
            <li key={number}>
              <Link
                href={`/read/peppercarrot/${number}`}
                prefetch={false}
                className="flex min-h-11 items-center break-words rounded-xl border border-border bg-card px-3 py-2 font-semibold hover:border-primary hover:text-primary"
              >
                {title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
