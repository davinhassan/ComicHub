"use client";

import { useEffect, useRef } from "react";

export function CatalogSearch({ query }: { query: string }) {
  const field = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (field.current && document.activeElement !== field.current)
      field.current.value = query;
  }, [query]);

  return (
    <input
      ref={field}
      name="q"
      type="search"
      defaultValue={query}
      maxLength={120}
      id="catalog-query"
      placeholder="Judul komik"
      className="catalog-field"
      onChange={(event) => {
        const form = event.currentTarget.form;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => form?.requestSubmit(), 350);
      }}
    />
  );
}
