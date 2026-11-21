import { z } from "zod";
import { readerPageUrl } from "@/lib/reader-payload";

// Relays reader image results to MangaDex, which requires a report for every
// image served by a MangaDex@Home node rather than by mangadex.org itself.
const report = z.object({
  url: readerPageUrl("mangadex").refine(
    (value) => !new URL(value).hostname.endsWith("mangadex.org"),
  ),
  success: z.boolean(),
  bytes: z.number().int().nonnegative().max(100_000_000),
  duration: z.number().int().nonnegative().max(600_000),
});

export async function POST(request: Request) {
  const parsed = report.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  await fetch("https://api.mangadex.network/report", {
    method: "POST",
    signal: AbortSignal.timeout(5000),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "ComicHub/0.1.0",
    },
    // The browser cannot read the node's X-Cache header across origins.
    body: JSON.stringify({ ...parsed.data, cached: false }),
  }).catch(() => undefined);
  return new Response(null, { status: 204 });
}
