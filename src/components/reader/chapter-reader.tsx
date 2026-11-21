"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { readerPayload } from "@/lib/reader-payload";
import { useReaderSettings, type ReaderSettings } from "@/lib/reader-settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/feedback";
import { ReaderSettingsFields } from "@/components/reader/reader-settings";
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
  const [settings] = useReaderSettings();
  const [attempt, setAttempt] = useState(0);
  const url =
    provider === "mangadex" && settings.dataSaver
      ? `${endpoint}?quality=data-saver`
      : endpoint;
  // A result only counts for the request that produced it.
  const request = `${url}#${attempt}`;
  const [loaded, setLoaded] = useState<{ request: string; value: Result }>();
  const result = loaded?.request === request ? loaded.value : undefined;
  const retry = () => setAttempt((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    const finish = (value: Result) => setLoaded({ request, value });
    async function load() {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data: unknown = await response.json();
        if (controller.signal.aborted) return;
        if (response.ok) {
          const validated = readerPayload(provider).safeParse(data);
          finish(validated.success ? validated.data : genericFailure);
        } else {
          const validated = failure.safeParse(data);
          finish(
            validated.success
              ? {
                  message: validated.data.message,
                  canRetry: response.status >= 500 || response.status === 429,
                }
              : genericFailure,
          );
        }
      } catch {
        if (!controller.signal.aborted) finish(genericFailure);
      }
    }
    void load();
    return () => controller.abort();
  }, [url, provider, request]);

  if (!result)
    return (
      <div role="status">
        <p className="mb-3">Memuat chapter…</p>
        <div
          className="mx-auto aspect-[2/3] w-full max-w-3xl rounded-lg bg-muted motion-safe:animate-pulse"
          aria-hidden="true"
        />
      </div>
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
        <h2 className="mb-1 break-words text-xl font-bold">{result.title}</h2>
      )}
      {result.creditsUrl && (
        <a className="text-link" href={result.creditsUrl}>
          Sumber dan kredit episode
        </a>
      )}
      {provider === "mangadex" && (
        <p className="mb-3 break-words text-sm text-muted-foreground">
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
        key={request}
        pages={result.pages}
        reload={retry}
        report={(url, success) => reportImage(provider, url, success)}
      />
      {chapterPrefix &&
        (result.previous !== undefined || result.next !== undefined) && (
          <nav
            aria-label="Navigasi chapter"
            className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-between gap-3"
          >
            {result.previous !== undefined ? (
              <Button asChild variant="outline">
                <Link href={`${chapterPrefix}${result.previous}`}>
                  <ChevronLeft className="size-5" aria-hidden="true" />
                  Chapter sebelumnya
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {result.next !== undefined && (
              <Button asChild>
                <Link href={`${chapterPrefix}${result.next}`}>
                  Chapter berikutnya
                  <ChevronRight className="size-5" aria-hidden="true" />
                </Link>
              </Button>
            )}
          </nav>
        )}
    </>
  );
}

type Report = (url: string, success: boolean) => void;
const widths: Record<ReaderSettings["width"], string> = {
  medium: "max-w-3xl",
  wide: "max-w-5xl",
  full: "max-w-none",
};

function ReaderPages({
  pages,
  reload,
  report,
}: {
  pages: ReaderPage[];
  reload: () => void;
  report: Report;
}) {
  const [settings] = useReaderSettings();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const last = pages.length - 1;
  const paged = settings.mode === "paged";
  const forward = settings.direction === "rtl" ? -1 : 1;

  const changePage = (step: number) => {
    setIndex((value) => Math.max(0, Math.min(last, value + step)));
    // Bring the top of the next page back under the sticky bar.
    const top = list.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) list.current?.scrollIntoView({ block: "start" });
  };

  // In strip mode the page in the middle of the screen is the current one.
  useEffect(() => {
    if (paged || !list.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            setIndex(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const item of list.current.children) observer.observe(item);
    return () => observer.disconnect();
  }, [paged, pages]);

  return (
    <div
      onKeyDown={(event) => {
        if (
          !paged ||
          !["ArrowLeft", "ArrowRight"].includes(event.key) ||
          event.target instanceof HTMLSelectElement
        )
          return;
        event.preventDefault();
        changePage((event.key === "ArrowLeft" ? -1 : 1) * forward);
      }}
    >
      <div className="reader-bar">
        <output aria-live={paged ? "polite" : "off"} className="text-sm">
          Halaman {index + 1} / {pages.length}
        </output>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls="reader-settings"
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          Pengaturan
        </Button>
        <div
          className="reader-progress"
          style={{ transform: `scaleX(${(index + 1) / pages.length})` }}
          aria-hidden="true"
        />
      </div>
      {open && (
        <div
          id="reader-settings"
          className="-mx-4 border-b border-border bg-card p-4"
        >
          <ReaderSettingsFields />
        </div>
      )}
      <ol
        ref={list}
        className={`mx-auto mt-4 w-full scroll-mt-16 ${widths[settings.width]} ${
          settings.gap ? "space-y-2" : ""
        } ${paged ? "cursor-pointer" : ""}`}
        onClick={(event) => {
          if (!paged || (event.target as HTMLElement).closest("button")) return;
          const { left, width } = event.currentTarget.getBoundingClientRect();
          changePage((event.clientX > left + width / 2 ? 1 : -1) * forward);
        }}
      >
        {(paged ? [pages[index]] : pages).map((page) => (
          <ReaderImage
            key={page.index}
            page={page}
            reload={reload}
            report={report}
            eager={paged || page.index === 0}
            rounded={settings.gap}
          />
        ))}
      </ol>
      {paged && (
        <div className="mx-auto mt-4 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => changePage(-1)}
            disabled={index === 0}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
            Sebelumnya
          </Button>
          <p className="order-last col-span-2 text-center text-sm text-muted-foreground sm:order-none sm:col-span-1">
            Ketuk sisi gambar atau pakai tombol panah.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => changePage(1)}
            disabled={index === last}
          >
            Berikutnya
            <ChevronRight className="size-5" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ReaderImage({
  page,
  reload,
  report,
  eager,
  rounded,
}: {
  page: ReaderPage;
  reload: () => void;
  report: Report;
  eager: boolean;
  rounded: boolean;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  return (
    <li
      data-index={page.index}
      className={`overflow-hidden bg-muted ${rounded ? "rounded-lg" : ""}`}
    >
      {state === "error" ? (
        <div className="p-4">
          <p role="status">Halaman {page.index + 1} gagal dimuat.</p>
          <Button className="mt-2" variant="outline" onClick={reload}>
            Muat ulang chapter
          </Button>
        </div>
      ) : (
        <div className={state === "loading" ? "min-h-64" : undefined}>
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
