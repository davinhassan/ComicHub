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
  assert.equal(requests, 1);
});

const chapterId = "86c80f2e-6696-4373-834c-a5c7c9ece0e7";
const groupId = "a3c1c2a5-6a0e-4b0e-9d59-5b2f7f0f9f11";
function chapterFixture(contentRating = "safe") {
  return {
    result: "ok",
    data: {
      id: chapterId,
      type: "chapter",
      attributes: {
        title: null,
        chapter: "7",
        translatedLanguage: "id",
        publishAt: "2024-01-01T00:00:00+00:00",
        externalUrl: null,
      },
      relationships: [
        {
          id: groupId,
          type: "scanlation_group",
          attributes: { name: "Grup Uji" },
        },
        {
          id: fixture.data[0].id,
          type: "manga",
          attributes: { contentRating },
        },
      ],
    },
  };
}
const atHome = {
  result: "ok",
  baseUrl: "https://node.mangadex.network/token",
  chapter: {
    hash: "0123abcd",
    data: ["1-aa.png", "2-bb.jpg"],
    dataSaver: ["1-cc.jpg", "2-dd.jpg"],
  },
};
function readerProvider(options: {
  contentRating?: string;
  blockedGroups?: string[];
}) {
  const urls: string[] = [];
  const provider = createMangaDex({
    timeoutMs: 1000,
    blockedGroups: options.blockedGroups,
    request: async (url) => {
      urls.push(String(url));
      return Response.json(
        String(url).includes("/at-home/")
          ? atHome
          : chapterFixture(options.contentRating),
      );
    },
  });
  return { provider, urls };
}

test("reader menyusun halaman MangaDex@Home beserta kredit grup", async () => {
  const { provider, urls } = readerProvider({});
  const reader = await provider.getReader(chapterId);
  assert.equal(reader.title, "Chapter 7");
  assert.deepEqual(reader.credits, [
    { name: "Grup Uji", url: `https://mangadex.org/group/${groupId}` },
  ]);
  assert.deepEqual(
    reader.pages.map(({ url }) => url),
    [
      "https://node.mangadex.network/token/data/0123abcd/1-aa.png",
      "https://node.mangadex.network/token/data/0123abcd/2-bb.jpg",
    ],
  );
  assert.deepEqual(urls, [
    `https://api.mangadex.org/chapter/${chapterId}?includes%5B%5D=scanlation_group&includes%5B%5D=manga`,
    `https://api.mangadex.org/at-home/server/${chapterId}?forcePort443=true`,
  ]);
});

test("reader menolak grup yang diblokir dan komik di luar rating aman", async () => {
  const blocked = readerProvider({ blockedGroups: [groupId] });
  await assert.rejects(blocked.provider.getReader(chapterId), {
    code: "NO_LICENSE",
  });
  const mature = readerProvider({ contentRating: "erotica" });
  await assert.rejects(mature.provider.getReader(chapterId), {
    code: "FORBIDDEN",
  });
  // Neither case may ask MangaDex@Home for images.
  assert.equal(blocked.urls.length + mature.urls.length, 2);
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
