import { z } from "zod";
import { ProviderError } from "./errors.ts";
import { createMangaDex } from "./mangadex.ts";

const envSchema = z.object({
  FEATURE_MANGADEX: z.enum(["true", "false"]).default("false"),
  UPSTREAM_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(250)
    .max(15000)
    .default(8000),
  // UUID grup scanlation yang meminta karyanya tidak ditayangkan.
  MANGADEX_BLOCKED_GROUPS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.uuid())),
});

export function mangaDexEnabled() {
  return process.env.FEATURE_MANGADEX === "true";
}

let mangaDex: ReturnType<typeof createMangaDex> | undefined;

export function getProvider(id: string) {
  if (id !== "mangadex") throw new ProviderError("NOT_FOUND");
  const env = envSchema.parse(process.env);
  if (env.FEATURE_MANGADEX !== "true") throw new ProviderError("UNAVAILABLE");
  return (mangaDex ??= createMangaDex({
    timeoutMs: env.UPSTREAM_TIMEOUT_MS,
    blockedGroups: env.MANGADEX_BLOCKED_GROUPS,
  }));
}
