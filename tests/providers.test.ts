import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createMangaDex } from "../src/lib/providers/mangadex.ts";
import { fetchJson } from "../src/lib/providers/fetch-json.ts";

const endpoint = new URL("https://api.mangadex.org/manga");
const fixture = {
  result: "ok",
  response: "collection",
  offset: 0,
  limit: 1,
  total: 2,
  data: [
    {
      id: "58be6aa6-06cb-4ca5-bd20-f1392ce451fb",
      type: "manga",
      attributes: {
        title: { en: "Fixture", id: "Judul pengujian" },
        altTitles: [],
        description: {},
        originalLanguage: "ja",
        status: "ongoing",
        contentRating: "safe",
        tags: [],
        availableTranslatedLanguages: ["id", null, "id"],
      },
      relationships: [],
    },
  ],
};

test("menormalisasi metadata, mengirim filter aman, dan memakai cache", async () => {
  let requests = 0;
  const provider = createMangaDex({
    timeoutMs: 1000,
    request: async (url) => {
      requests++;
      assert.equal(
        String(url),
        "https://api.mangadex.org/manga?limit=1&offset=0&contentRating%5B%5D=safe&includes%5B%5D=cover_art&title=Fixture&availableTranslatedLanguage%5B%5D=id",
      );
      return Response.json(fixture);
    },
  });
  const input = { query: "Fixture", language: "id", limit: 1 };
  const result = await provider.search(input);
  assert.equal(result.items[0]?.title, "Judul pengujian");
  assert.deepEqual(result.items[0]?.availableLanguages, ["id"]);
  assert.equal(result.nextCursor, "1");
  await provider.search(input);
  assert.equal(requests, 1);
  await assert.rejects(provider.search({ ...input, limit: 31 }), {
    code: "INVALID_INPUT",
  });
  await assert.rejects(
    provider.getReaderPages(fixture.data[0].id, "original"),
    { code: "NO_LICENSE" },
  );
  assert.equal(requests, 1);
});

test("mematuhi Retry-After yang melebihi anggaran retry", async () => {
  let attempts = 0;
  const request = async () => {
    attempts++;
    return new Response(null, {
      status: 429,
      headers: { "Retry-After": "10" },
    });
  };
  await assert.rejects(
    fetchJson(endpoint, z.object({}), {
      timeoutMs: 1000,
      request,
      userAgent: "ComicHub/test",
    }),
    {
      code: "RATE_LIMITED",
      retryAfterMs: 10000,
    },
  );
  assert.equal(attempts, 1);
});

test("mencoba 503 sekali, kemudian mengembalikan UNAVAILABLE", async () => {
  let attempts = 0;
  const request = async () => {
    attempts++;
    return new Response(null, { status: 503 });
  };
  await assert.rejects(
    fetchJson(endpoint, z.object({}), {
      timeoutMs: 2000,
      request,
      userAgent: "ComicHub/test",
    }),
    { code: "UNAVAILABLE" },
  );
  assert.equal(attempts, 2);
});

test("menolak payload yang menyimpang dari kontrak", async () => {
  const provider = createMangaDex({
    timeoutMs: 1000,
    request: async () => Response.json({ data: [] }),
  });
  await assert.rejects(provider.search({ query: "Fixture", limit: 1 }), {
    code: "INVALID_RESPONSE",
  });
});

test("batas waktu berlaku selama permintaan", async () => {
  const request: typeof fetch = async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      signal?.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
      setTimeout(
        () => reject(new Error("AbortSignal tidak dijalankan")),
        100,
      ).unref();
    });
  await assert.rejects(
    fetchJson(endpoint, z.object({}), {
      timeoutMs: 20,
      request,
      userAgent: "ComicHub/test",
    }),
    { code: "UPSTREAM_TIMEOUT" },
  );
});
