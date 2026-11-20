import { setTimeout as delay } from "node:timers/promises";
import type { ZodType } from "zod";
import { ProviderError } from "./errors.ts";

function retryDelay(headers: Headers, status: number) {
  const retryAfter = headers.get("retry-after");
  if (retryAfter !== null) {
    if (/^\d+$/.test(retryAfter)) return Number(retryAfter) * 1000;
    const timestamp = Date.parse(retryAfter);
    if (Number.isFinite(timestamp)) return Math.max(0, timestamp - Date.now());
  }
  const reset = headers.get("x-ratelimit-retry-after");
  if (status === 429 && reset && /^\d+$/.test(reset)) {
    return Math.max(0, Number(reset) * 1000 - Date.now());
  }
  return status === 503 ? 500 : undefined;
}

export async function fetchJson<T>(
  url: URL,
  schema: ZodType<T>,
  options: {
    timeoutMs: number;
    request?: typeof fetch;
    userAgent: string;
  },
): Promise<T> {
  const signal = AbortSignal.timeout(options.timeoutMs);
  const request = options.request ?? fetch;
  try {
    for (let attempt = 0; ; attempt++) {
      const response = await request(url, {
        signal,
        redirect: "error",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": options.userAgent,
        },
      });
      if (response.ok) {
        const value: unknown = await response.json().catch((error: unknown) => {
          if (signal.aborted) throw error;
          throw new ProviderError("INVALID_RESPONSE");
        });
        const parsed = schema.safeParse(value);
        if (!parsed.success) throw new ProviderError("INVALID_RESPONSE");
        return parsed.data;
      }
      await response.body?.cancel();
      const wait = retryDelay(response.headers, response.status);
      if (
        response.status === 503 &&
        attempt === 0 &&
        wait !== undefined &&
        wait <= 1000
      ) {
        await delay(Math.max(250, wait), undefined, { signal });
        continue;
      }
      switch (response.status) {
        case 429:
          throw new ProviderError("RATE_LIMITED", wait);
        case 404:
          throw new ProviderError("NOT_FOUND");
        case 401:
        case 403:
          throw new ProviderError("FORBIDDEN");
        default:
          throw new ProviderError("UNAVAILABLE");
      }
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(
      signal.aborted ? "UPSTREAM_TIMEOUT" : "UNAVAILABLE",
    );
  }
}
