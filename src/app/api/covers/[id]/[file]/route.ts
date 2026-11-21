import { z } from "zod";
import { mangaDexEnabled } from "@/lib/providers/registry";

// MangaDex blocks hotlinked covers and requires third-party sites to proxy
// them. The request must carry our real User-Agent and no Via header.
const params = z.object({
  id: z.uuid(),
  file: z.string().regex(/^[\w-]+\.(?:jpg|jpeg|png|webp)$/i),
});

export async function GET(
  _request: Request,
  context: RouteContext<"/api/covers/[id]/[file]">,
) {
  const parsed = params.safeParse(await context.params);
  if (!parsed.success || !mangaDexEnabled())
    return new Response(null, { status: 404 });
  const { id, file } = parsed.data;
  const upstream = await fetch(
    `https://uploads.mangadex.org/covers/${id}/${file}.256.jpg`,
    {
      signal: AbortSignal.timeout(8000),
      redirect: "error",
      headers: { "User-Agent": "ComicHub/0.1.0" },
    },
  ).catch(() => null);
  const type = upstream?.headers.get("content-type");
  if (!upstream?.ok || !type?.startsWith("image/")) {
    await upstream?.body?.cancel();
    return new Response(null, { status: upstream?.status === 404 ? 404 : 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      // Cover files never change under the same name, so let browsers keep them.
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
