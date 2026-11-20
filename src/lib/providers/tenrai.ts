import { z } from "zod";
import { fetchJson } from "./fetch-json.ts";

export const tenraiQuery = z.object({
  q: z.string().trim().max(120).default(""),
  page: z
    .string()
    .regex(/^[1-9]\d{0,2}$/)
    .default("1"),
});

const responseSchema = z.object({
  data: z
    .array(
      z.object({
        mal_id: z.number().int().positive(),
        title: z.string().trim().min(1),
        type: z.string().nullish(),
        synopsis: z.string().nullish(),
      }),
    )
    .max(12),
  pagination: z.object({ has_next_page: z.boolean() }),
});

export function searchTenrai(query: z.output<typeof tenraiQuery>) {
  const url = new URL("https://api.tenrai.org/v1/manga");
  url.search = new URLSearchParams({
    q: query.q,
    page: query.page,
    limit: "12",
    sfw: "true",
  }).toString();
  return fetchJson(url, responseSchema, {
    timeoutMs: 8000,
    userAgent: "ComicHub/0.1.0",
  });
}
