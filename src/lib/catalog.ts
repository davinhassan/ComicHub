import { z } from "zod";
import { ProviderError } from "./providers/errors.ts";
import { getProvider } from "./providers/registry.ts";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

export const catalogQuery = z.object({
  q: z.string().trim().max(120).default(""),
  genre: optional(z.uuid()),
  language: optional(z.enum(["id", "en", "ja", "ko", "zh"])),
  type: optional(z.enum(["manga", "manhwa", "manhua"])),
  status: optional(z.enum(["ongoing", "completed", "hiatus", "cancelled"])),
  sort: optional(z.enum(["latest", "popular", "title"])),
  cursor: optional(z.string().regex(/^(0|[1-9]\d{0,3})$/)),
});

export type CatalogQuery = z.output<typeof catalogQuery>;

export const detailQuery = z.object({
  language: optional(z.string().regex(/^[a-z]{2,3}(?:-[a-z]{2,4})?$/)),
  cursor: optional(z.string().regex(/^(0|[1-9]\d{0,3})$/)),
});

export function catalogProvider() {
  return getProvider("mangadex");
}

export async function catalogResult<T>(
  operation: () => Promise<T>,
  enabled = true,
) {
  if (!enabled) return { state: "disabled" as const };
  try {
    return { state: "ready" as const, data: await operation() };
  } catch (error) {
    if (!(error instanceof ProviderError)) throw error;
    return { state: "error" as const, code: error.code };
  }
}

export function queryLink(
  path: string,
  query: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  return params.size ? `${path}?${params}` : path;
}
