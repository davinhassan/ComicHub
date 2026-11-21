import { notFound } from "next/navigation";
import Link from "next/link";
import { ChapterReader } from "@/components/reader/chapter-reader";
import { readerId } from "@/lib/reader";
import {
  pepperCarrotComicPath,
  pepperCarrotLicense,
} from "@/lib/peppercarrot-paths";

export const metadata = {
  title: "Baca chapter",
  robots: { index: false, follow: true },
};

export default async function ReaderPage({
  params,
}: PageProps<"/read/[provider]/[chapterId]">) {
  const parsed = readerId.safeParse(await params);
  if (!parsed.success) notFound();
  const { provider, chapterId } = parsed.data;
  const comicSlug = provider === "komiku" ? chapterId.split("~")[0] : undefined;
  const chapterPrefix = comicSlug
    ? `/read/komiku/${comicSlug}~`
    : provider === "peppercarrot"
      ? "/read/peppercarrot/"
      : undefined;
  return (
    <section className="page-section">
      <header className="mb-3">
        <h1 className="text-2xl font-bold">Baca chapter</h1>
        {comicSlug ? (
          <Link
            className="mt-2 inline-block font-semibold text-primary underline"
            href={`/comic/komiku/${comicSlug}`}
          >
            Daftar chapter Komiku
          </Link>
        ) : provider === "peppercarrot" ? (
          <div className="mt-2 space-y-2">
            <Link
              className="font-semibold text-primary underline"
              href={pepperCarrotComicPath}
            >
              Daftar episode
            </Link>
            <p>
              Karya David Revoy ·{" "}
              <a className="text-primary underline" href={pepperCarrotLicense}>
                CC BY 4.0
              </a>
            </p>
          </div>
        ) : (
          <a
            className="mt-2 inline-block font-semibold text-primary underline"
            href={`https://mangadex.org/chapter/${chapterId}`}
          >
            Buka di MangaDex
          </a>
        )}
      </header>
      <ChapterReader
        key={chapterId}
        endpoint={`/api/chapters/${provider}/${chapterId}`}
        provider={provider}
        chapterPrefix={chapterPrefix}
      />
    </section>
  );
}
