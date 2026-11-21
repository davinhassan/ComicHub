"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { readerPayload } from "@/lib/reader-payload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/feedback";
import type { ReaderPage } from "@/lib/providers/types";

const failure = z.object({ code: z.string(), message: z.string() });
type Result =
  | z.infer<ReturnType<typeof readerPayload>>
  | { message: string; canRetry: boolean };
// MangaDex asks clients to report how each image from a MangaDex@Home node
// loaded. Images served by mangadex.org itself are exempt.
function reportImage(provider: string, url: string, success: boolean) {
  if (provider !== "mangadex" || new URL(url).hostname.endsWith("mangadex.org"))
    return;
  const timing = performance.getEntriesByName(url).at(-1) as
    PerformanceResourceTiming | undefined;
  void fetch("/api/reports/mangadex", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      success,
      bytes: success ? (timing?.encodedBodySize ?? 0) : 0,
      duration: Math.round(timing?.duration ?? 0),
    }),
  }).catch(() => undefined);
}

const genericFailure = {
  message: "Chapter gagal dimuat. Coba lagi.",
  canRetry: true,
};

export function ChapterReader({
  endpoint,
  provider,
  chapterPrefix,
}: {
  endpoint: string;
  provider: string;
  chapterPrefix?: string;
}) {
  const [result, setResult] = useState<Result>();
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setResult(undefined);
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data: unknown = await response.json();
        if (controller.signal.aborted) return;
        if (response.ok) {
          const validated = readerPayload(provider).safeParse(data);
          setResult(validated.success ? validated.data : genericFailure);
        } else {
          const validated = failure.safeParse(data);
          setResult(
            validated.success
              ? {
                  message: validated.data.message,
                  canRetry: response.status >= 500 || response.status === 429,
                }
              : genericFailure,
          );
        }
      } catch {
        if (!controller.signal.aborted) setResult(genericFailure);
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, provider, attempt]);

  if (!result)
    return (
      <Card>
        <p role="status">Memuat chapter…</p>
        <div
          className="mt-3 h-28 rounded-lg bg-muted motion-safe:animate-pulse"
          aria-hidden="true"
        />
      </Card>
    );
  if ("message" in result)
    return (
      <Card>
        <p role="status">{result.message}</p>
        {result.canRetry && (
          <Button className="mt-3" variant="outline" onClick={retry}>
            Coba lagi
          </Button>
        )}
      </Card>
    );
  return (
    <>
      {result.title && (
        <h2 className="mb-4 text-xl font-bold">{result.title}</h2>
      )}
      {result.creditsUrl && (
        <a
          className="mb-4 inline-block text-primary underline"
          href={result.creditsUrl}
        >
          Sumber dan kredit episode
        </a>
      )}
      {provider === "mangadex" && (
        <p className="mb-4 break-words text-muted-foreground">
          {result.credits?.length ? (
            <>
              Diterjemahkan oleh{" "}
              {result.credits.map((group, index) => (
                <span key={group.url}>
                  {index > 0 && ", "}
                  <a className="text-primary underline" href={group.url}>
                    {group.name}
                  </a>
                </span>
              ))}{" "}
              ·{" "}
            </>
          ) : null}
          Disediakan oleh{" "}
          <a className="text-primary underline" href="https://mangadex.org">
            MangaDex
          </a>
        </p>
      )}
      <ReaderPages
        pages={result.pages}
        reload={retry}
        report={(url, success) => reportImage(provider, url, success)}
      />
      {chapterPrefix &&
        (result.previous !== undefined || result.next !== undefined) && (
          <nav
            aria-label="Navigasi chapter"
            className="mt-5 flex flex-wrap gap-3"
          >
            {result.previous !== undefined && (
              <Button asChild variant="outline">
                <Link href={`${chapterPrefix}${result.previous}`}>
                  Chapter sebelumnya
                </Link>
              </Button>
            )}
            {result.next !== undefined && (
              <Button asChild variant="outline">
                <Link href={`${chapterPrefix}${result.next}`}>
                  Chapter berikutnya
                </Link>
              </Button>
            )}
          </nav>
        )}
    </>
  );
}

type Report = (url: string, success: boolean) => void;

function ReaderPages({
  pages,
  reload,
  report,
}: {
  pages: ReaderPage[];
  reload: () => void;
  report: Report;
}) {
  const [mode, setMode] = useState<"strip" | "paged">("strip");
  const [wide, setWide] = useState(false);
  const [index, setIndex] = useState(0);
  const last = pages.length - 1;
  const changePage = (step: number) =>
    setIndex((value) => Math.max(0, Math.min(last, value + step)));

  return (
    <div
      onKeyDown={(event) => {
        if (
          mode !== "paged" ||
          !["ArrowLeft", "ArrowRight"].includes(event.key) ||
          event.target instanceof HTMLSelectElement
        )
          return;
        event.preventDefault();
        changePage(event.key === "ArrowLeft" ? -1 : 1);
      }}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          Mode baca
          <select
            className="catalog-field"
            value={mode}
            onChange={(event) =>
              setMode(event.target.value === "paged" ? "paged" : "strip")
            }
          >
            <option value="strip">Gulir vertikal</option>
            <option value="paged">Per halaman</option>
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          aria-pressed={wide}
          onClick={() => setWide(!wide)}
        >
          Lebar penuh
        </Button>
      </div>
      {mode === "paged" && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => changePage(-1)}
            disabled={index === 0}
          >
            Sebelumnya
          </Button>
          <output aria-live="polite">
            Halaman {index + 1} / {pages.length}
          </output>
          <Button
            type="button"
            variant="outline"
            onClick={() => changePage(1)}
            disabled={index === last}
          >
            Berikutnya
          </Button>
        </div>
      )}
      {mode === "strip" && (
        <p className="mb-4 text-muted-foreground">{pages.length} halaman</p>
      )}
      <ol
        className={
          wide
            ? "mx-auto w-full space-y-2"
            : "mx-auto w-full max-w-3xl space-y-2"
        }
      >
        {(mode === "strip" ? pages : [pages[index]]).map((page) => (
          <ReaderImage
            key={page.index}
            page={page}
            reload={reload}
            report={report}
            eager={mode === "paged" || page.index === 0}
          />
        ))}
      </ol>
    </div>
  );
}

function ReaderImage({
  page,
  reload,
  report,
  eager,
}: {
  page: ReaderPage;
  reload: () => void;
  report: Report;
  eager: boolean;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  return (
    <li className="overflow-hidden rounded-lg bg-muted">
      {state === "error" ? (
        <div className="p-4">
          <p role="status">Halaman {page.index + 1} gagal dimuat.</p>
          <Button className="mt-2" variant="outline" onClick={reload}>
            Muat ulang chapter
          </Button>
        </div>
      ) : (
        <div className={state === "loading" ? "min-h-44" : undefined}>
          {/* Chapter delivery uses the provider URL directly, without Next.js image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.url}
            alt={`Halaman ${page.index + 1}`}
            width={page.width}
            height={page.height}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-auto w-full"
            onLoad={() => {
              setState("loaded");
              report(page.url, true);
            }}
            onError={() => {
              setState("error");
              report(page.url, false);
            }}
          />
        </div>
      )}
    </li>
  );
}
