import { z } from "zod";
import { ProviderError } from "./errors.ts";
import { fetchJson } from "./fetch-json.ts";
import type {
  ComicProvider,
  ComicSummary,
  ComicType,
  PageResult,
  ReaderPage,
} from "./types.ts";

const idSchema = z.uuid();
const localized = z.record(z.string(), z.string());
const language = z.string().regex(/^[a-z]{2,3}(?:-[a-z]{2,4})?$/);
const pageInput = z
  .object({
    limit: z.number().int().min(1).max(30),
    cursor: z
      .string()
      .regex(/^(0|[1-9]\d{0,4})$/)
      .transform(Number)
      .optional(),
    language: language.optional(),
    query: z.string().trim().max(120).optional(),
    genre: idSchema.optional(),
    type: z.enum(["manga", "manhwa", "manhua"]).optional(),
    status: z.enum(["ongoing", "completed", "hiatus", "cancelled"]).optional(),
    sort: z.enum(["latest", "popular", "title"]).optional(),
  })
  .refine(({ cursor = 0, limit }) => cursor + limit <= 10000);
const status = z.enum(["ongoing", "completed", "hiatus", "cancelled"]);
const mangaSchema = z.object({
  id: idSchema,
  type: z.literal("manga"),
  attributes: z.object({
    title: localized.refine((titles) =>
      Object.values(titles).some((title) => title.trim()),
    ),
    altTitles: z.array(localized),
    description: localized,
    originalLanguage: z.string(),
    status: z.string(),
    contentRating: z.string(),
    tags: z.array(z.object({ attributes: z.object({ name: localized }) })),
    availableTranslatedLanguages: z.array(z.string().nullable()).nullable(),
  }),
  relationships: z.array(
    z.object({
      type: z.string(),
      attributes: z
        .object({
          name: z.string().optional(),
          fileName: z.string().optional(),
        })
        .nullish(),
    }),
  ),
});
const chapterSchema = z.object({
  id: idSchema,
  type: z.literal("chapter"),
  attributes: z.object({
    title: z.string().nullable(),
    chapter: z.string().nullable(),
    translatedLanguage: language,
    publishAt: z.iso.datetime({ offset: true }),
    externalUrl: z.string().nullish(),
  }),
  relationships: z
    .array(
      z.object({
        id: idSchema,
        type: z.string(),
        attributes: z
          .object({
            name: z.string().optional(),
            contentRating: z.string().optional(),
          })
          .nullish(),
      }),
    )
    .default([]),
});
const imageFile = z.string().regex(/^[\w-]+\.(?:avif|gif|jpe?g|png|webp)$/i);
const atHomeSchema = z.object({
  result: z.literal("ok"),
  baseUrl: z.url({ protocol: /^https$/ }),
  chapter: z.object({
    hash: z.string().regex(/^[0-9a-f]+$/i),
    data: z.array(imageFile).max(500),
    dataSaver: z.array(imageFile).max(500),
  }),
});

type Chapter = z.infer<typeof chapterSchema>;

function chapterTitle({ title, chapter }: Chapter["attributes"]) {
  return title || (chapter ? `Chapter ${chapter}` : "Chapter");
}

// MangaDex requires crediting the scanlation groups of every readable chapter.
function chapterGroups({ relationships }: Chapter) {
  return relationships.flatMap(({ id, type, attributes }) =>
    type === "scanlation_group" && attributes?.name
      ? [{ id, name: attributes.name, url: `https://mangadex.org/group/${id}` }]
      : [],
  );
}
function collection<T>(item: z.ZodType<T>) {
  return z.object({
    result: z.literal("ok"),
    response: z.literal("collection"),
    data: z.array(item),
    offset: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  });
}

const types: Record<string, ComicType> = {
  ja: "manga",
  ko: "manhwa",
  zh: "manhua",
  "zh-hk": "manhua",
};
function translate(values: Record<string, string>, original?: string) {
  return (
    values.id ||
    values.en ||
    (original && values[original]) ||
    Object.values(values).find((value) => value.trim()) ||
    undefined
  );
}

function summary({
  id,
  attributes,
  relationships,
}: z.infer<typeof mangaSchema>): ComicSummary {
  if (attributes.contentRating !== "safe") throw new ProviderError("FORBIDDEN");
  const cover = relationships.find(({ type }) => type === "cover_art")
    ?.attributes?.fileName;
  return {
    provider: "mangadex",
    id,
    title: translate(attributes.title, attributes.originalLanguage)!,
    description: translate(attributes.description, attributes.originalLanguage),
    coverUrl:
      cover && /^[\w-]+\.(?:jpg|jpeg|png|webp)$/i.test(cover)
        ? `https://uploads.mangadex.org/covers/${id}/${cover}`
        : undefined,
    type: Object.hasOwn(types, attributes.originalLanguage)
      ? types[attributes.originalLanguage]
      : "other",
    status: status.safeParse(attributes.status).data ?? "unknown",
    contentRating: "safe",
    tags: attributes.tags.flatMap(
      ({ attributes }) => translate(attributes.name) ?? [],
    ),
    availableLanguages: [
      ...new Set(
        (attributes.availableTranslatedLanguages ?? []).filter(
          (code): code is string => code !== null,
        ),
      ),
    ],
  };
}

function page<T, R>(
  response: { data: T[]; offset: number; limit: number; total: number },
  map: (item: T) => R,
): PageResult<R> {
  const next = response.offset + response.limit;
  return {
    items: response.data.map(map),
    total: response.total,
    nextCursor:
      next < response.total && next + response.limit <= 10000
        ? String(next)
        : undefined,
  };
}

function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ProviderError("INVALID_INPUT");
  return result.data;
}

export interface MangaDexReader {
  title: string;
  credits: { name: string; url: string }[];
  pages: ReaderPage[];
}

export function createMangaDex(options: {
  timeoutMs: number;
  request?: typeof fetch;
  // Groups that asked for their work to be unavailable here.
  blockedGroups?: string[];
}): ComicProvider & {
  getGenres(): Promise<{ id: string; label: string }[]>;
  getReader(
    id: string,
    quality?: "original" | "data-saver",
  ): Promise<MangaDexReader>;
} {
  const blockedGroups = options.blockedGroups ?? [];
  // Cache only validated metadata. Keep short-lived entries bounded per process.
  const cache = new Map<string, { value: unknown; expires: number }>();
  let activeRequests = 0;

  async function read<T>(
    path: string,
    schema: z.ZodType<T>,
    query?: URLSearchParams,
  ): Promise<T> {
    const url = new URL(path, "https://api.mangadex.org");
    if (query) url.search = query.toString();
    const key = url.href;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      const parsed = schema.safeParse(cached.value);
      if (parsed.success) return parsed.data;
    }
    if (activeRequests >= 2) throw new ProviderError("UNAVAILABLE");
    activeRequests++;
    try {
      const value = await fetchJson(url, schema, {
        timeoutMs: options.timeoutMs,
        request: options.request,
        userAgent: "ComicHub/0.1.0",
      });
      const oldest = cache.keys().next().value;
      if (cache.size >= 128 && oldest !== undefined) cache.delete(oldest);
      cache.set(key, { value, expires: Date.now() + 15_000 });
      return value;
    } finally {
      activeRequests--;
    }
  }

  async function list(input: unknown, mode: "search" | "latest") {
    const { query, language, limit, cursor, type, status, sort, genre } =
      validate(pageInput, input);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(cursor ?? 0),
      "contentRating[]": "safe",
      "includes[]": "cover_art",
    });
    if (query) params.set("title", query);
    if (genre) params.set("includedTags[]", genre);
    if (language) params.set("availableTranslatedLanguage[]", language);
    const originalLanguages = {
      manga: ["ja"],
      manhwa: ["ko"],
      manhua: ["zh", "zh-hk"],
    };
    if (type)
      for (const code of originalLanguages[type])
        params.append("originalLanguage[]", code);
    if (status) params.set("status[]", status);
    if (mode === "latest" || sort === "latest")
      params.set("order[latestUploadedChapter]", "desc");
    if (sort === "popular") params.set("order[followedCount]", "desc");
    if (sort === "title") params.set("order[title]", "asc");
    return page(await read("/manga", collection(mangaSchema), params), summary);
  }

  async function getComic(id: string) {
    validate(idSchema, id);
    const params = new URLSearchParams();
    for (const include of ["cover_art", "author"])
      params.append("includes[]", include);
    const { data } = await read(
      `/manga/${id}`,
      z.object({ result: z.literal("ok"), data: mangaSchema }),
      params,
    );
    return {
      ...summary(data),
      alternativeTitles: [
        ...new Set(data.attributes.altTitles.flatMap(Object.values)),
      ],
      authors: [
        ...new Set(
          data.relationships.flatMap(({ type, attributes }) =>
            type === "author" && attributes?.name ? [attributes.name] : [],
          ),
        ),
      ],
      sourceUrl: `https://mangadex.org/title/${id}`,
    };
  }

  async function getReader(
    id: string,
    quality: "original" | "data-saver" = "original",
  ): Promise<MangaDexReader> {
    validate(idSchema, id);
    const params = new URLSearchParams();
    for (const include of ["scanlation_group", "manga"])
      params.append("includes[]", include);
    const { data } = await read(
      `/chapter/${id}`,
      z.object({ result: z.literal("ok"), data: chapterSchema }),
      params,
    );
    const manga = data.relationships.find(({ type }) => type === "manga");
    if (manga?.attributes?.contentRating !== "safe")
      throw new ProviderError("FORBIDDEN");
    const groups = chapterGroups(data);
    if (
      data.attributes.externalUrl ||
      groups.some((group) => blockedGroups.includes(group.id))
    )
      throw new ProviderError("NO_LICENSE");

    const { baseUrl, chapter } = await read(
      `/at-home/server/${id}`,
      atHomeSchema,
      new URLSearchParams({ forcePort443: "true" }),
    );
    const [folder, files] =
      quality === "original"
        ? ["data", chapter.data]
        : ["data-saver", chapter.dataSaver];
    return {
      title: chapterTitle(data.attributes),
      credits: groups.map(({ name, url }) => ({ name, url })),
      pages: files.map((file, index) => ({
        index,
        url: `${baseUrl.replace(/\/$/, "")}/${folder}/${chapter.hash}/${file}`,
      })),
    };
  }

  return {
    id: "mangadex",
    displayName: "MangaDex",
    getReader,
    search: (input) => list(input, "search"),
    latest: (input) => list(input, "latest"),
    getComic,
    async getGenres() {
      const { data } = await read(
        "/manga/tag",
        z.object({
          result: z.literal("ok"),
          data: z.array(
            z.object({
              id: idSchema,
              attributes: z.object({ name: localized, group: z.string() }),
            }),
          ),
        }),
      );
      return data
        .flatMap(({ id, attributes }) => {
          const label = translate(attributes.name);
          return attributes.group === "genre" && label ? [{ id, label }] : [];
        })
        .sort((a, b) => a.label.localeCompare(b.label, "id"));
    },
    async getChapters(id, input) {
      validate(idSchema, id);
      const { language, limit, cursor } = validate(pageInput, input);
      await getComic(id);
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(cursor ?? 0),
        "order[chapter]": "desc",
        "includes[]": "scanlation_group",
      });
      if (language) params.set("translatedLanguage[]", language);
      for (const group of blockedGroups)
        params.append("excludedGroups[]", group);
      return page(
        await read(`/manga/${id}/feed`, collection(chapterSchema), params),
        (chapter) => ({
          provider: "mangadex",
          id: chapter.id,
          comicId: id,
          title: chapterTitle(chapter.attributes),
          number: chapter.attributes.chapter ?? undefined,
          language: chapter.attributes.translatedLanguage,
          publishedAt: chapter.attributes.publishAt,
          externalUrl: chapter.attributes.externalUrl || undefined,
          groups: chapterGroups(chapter).map(({ name, url }) => ({
            name,
            url,
          })),
        }),
      );
    },
    async getReaderPages(id, quality) {
      return (await getReader(id, quality)).pages;
    },
  };
}
