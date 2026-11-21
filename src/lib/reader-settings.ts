"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

const schema = z.object({
  mode: z.enum(["strip", "paged"]).catch("strip"),
  width: z.enum(["medium", "wide", "full"]).catch("medium"),
  gap: z.boolean().catch(true),
  direction: z.enum(["ltr", "rtl"]).catch("ltr"),
  dataSaver: z.boolean().catch(false),
});

export type ReaderSettings = z.infer<typeof schema>;

const defaults = schema.parse({});
const storageKey = "comichub:reader";
const changeEvent = "comichub:reader-settings";

// Used when the browser blocks localStorage, so settings still apply for the visit.
let memory: string | null = null;
let cachedRaw: string | null | undefined;
let cached = defaults;

function snapshot() {
  let raw = memory;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    let value: unknown = {};
    try {
      value = JSON.parse(raw ?? "{}");
    } catch {}
    cached = schema.catch(defaults).parse(value);
  }
  return cached;
}

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(changeEvent, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(changeEvent, notify);
  };
}

export function useReaderSettings() {
  const settings = useSyncExternalStore(subscribe, snapshot, () => defaults);
  const update = (patch: Partial<ReaderSettings>) => {
    memory = JSON.stringify({ ...snapshot(), ...patch });
    try {
      localStorage.setItem(storageKey, memory);
    } catch {}
    window.dispatchEvent(new Event(changeEvent));
  };
  return [settings, update] as const;
}
