"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import type { CatalogCard } from "@/lib/providers/indonesian-catalog";

function Cover({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground">
      <BookOpen className="size-8" aria-hidden="true" />
      {url && !failed && (
        // The cover is served by the allowlisted source or our cover proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full bg-muted object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04]"
        />
      )}
    </div>
  );
}

export function IndonesianCards({ items }: { items: CatalogCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item, index) => {
        const content = (
          <>
            <Cover key={item.cover} url={item.cover} />
            <h3 className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-snug group-hover:text-primary">
              {item.title}
            </h3>
            {/* Sits after the title so the link reads "title, source, caption". */}
            {item.source !== item.title && (
              <span className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">
                {item.source}
              </span>
            )}
            {item.caption && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {item.caption}
              </p>
            )}
          </>
        );
        return (
          <li
            key={`${item.source}:${item.href ?? item.title}:${index}`}
            className="min-w-0"
          >
            {item.href ? (
              <Link
                href={item.href}
                prefetch={false}
                className="group relative block rounded-xl"
              >
                {content}
              </Link>
            ) : (
              <div className="group relative">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
