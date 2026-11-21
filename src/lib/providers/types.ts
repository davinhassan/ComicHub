export type ComicType = "manga" | "manhwa" | "manhua" | "other";
export type ContentRating = "safe" | "suggestive" | "mature" | "unknown";

export interface ComicSummary {
  provider: string;
  id: string;
  title: string;
  coverUrl?: string;
  description?: string;
  type: ComicType;
  status?: "ongoing" | "completed" | "hiatus" | "cancelled" | "unknown";
  contentRating: ContentRating;
  tags: string[];
  availableLanguages: string[];
}

export interface ComicDetail extends ComicSummary {
  alternativeTitles: string[];
  authors: string[];
  sourceUrl?: string;
}

export interface ComicChapter {
  provider: string;
  id: string;
  comicId: string;
  title: string;
  number?: string;
  language: string;
  publishedAt?: string;
  externalUrl?: string;
  groups?: { name: string; url: string }[];
}

export interface ReaderPage {
  index: number;
  url: string;
  width?: number;
  height?: number;
}

export interface PageResult<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

export interface PageInput {
  cursor?: string;
  limit: number;
}

export interface ComicSearchInput extends PageInput {
  query: string;
  genre?: string;
  language?: string;
  type?: Exclude<ComicType, "other">;
  status?: Exclude<ComicSummary["status"], "unknown">;
  sort?: "latest" | "popular" | "title";
}

export interface ComicProvider {
  id: string;
  displayName: string;
  search(input: ComicSearchInput): Promise<PageResult<ComicSummary>>;
  latest(input: PageInput): Promise<PageResult<ComicSummary>>;
  getComic(id: string): Promise<ComicDetail>;
  getChapters(
    id: string,
    input: PageInput & { language?: string },
  ): Promise<PageResult<ComicChapter>>;
  getReaderPages(
    id: string,
    quality: "original" | "data-saver",
  ): Promise<ReaderPage[]>;
}
