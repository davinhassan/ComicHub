"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import type { CatalogCard } from "@/lib/providers/indonesian-catalog";

function Cover({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative grid aspect-[3/4] place-items-center overflow-hidden bg-muted text-primary">
      <BookOpen className="size-8" aria-hidden="true" />
      {url && !failed && (
        // The cover is served directly by the allowlisted source.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full bg-muted object-cover"
        />
      )}
    </div>
  );
}

export function IndonesianCards({ items }: { items: CatalogCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item, index) => {
        const content = (
          <>
            <Cover key={item.cover} url={item.cover} />
            <div className="p-3">
              <h3 className="break-words font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                {item.source !== item.title && item.source}
                {item.caption &&
                  (item.source === item.title
                    ? item.caption
                    : ` · ${item.caption}`)}
              </p>
            </div>
          </>
        );
        return (
          <li
            key={`${item.source}:${item.href ?? item.title}:${index}`}
            className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
          >
            {item.href ? (
              <Link
                href={item.href}
                prefetch={false}
                className="block h-full hover:bg-muted"
              >
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
