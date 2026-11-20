import { readerPayload } from "@/lib/reader-payload";
import { readerChapter, readerErrors } from "@/lib/reader";
import { ProviderError } from "@/lib/providers/errors";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/chapters/[provider]/[id]">,
) {
  const { provider, id } = await context.params;
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  try {
    const chapter = await readerChapter(provider, id);
    if (!chapter.pages.length) throw new ProviderError("UNAVAILABLE");
    const payload = readerPayload(provider).safeParse(chapter);
    if (!payload.success) throw new ProviderError("INVALID_RESPONSE");
    return Response.json(payload.data, { headers });
  } catch (error) {
    const code = error instanceof ProviderError ? error.code : "UNAVAILABLE";
    const { status, message } = readerErrors[code];
    if (
      code === "RATE_LIMITED" &&
      error instanceof ProviderError &&
      error.retryAfterMs !== undefined
    ) {
      headers.set("Retry-After", String(Math.ceil(error.retryAfterMs / 1000)));
    }
    return Response.json({ code, message }, { status, headers });
  }
}
