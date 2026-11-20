import { z } from "zod";

export const comicSlug = z
  .string()
  .max(200)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
const chapterNumber = /^\d{1,10}(?:\.\d{1,10})?$/;

export const komikuChapterId = z.string().refine((id) => {
  const [slug, number, extra] = id.split("~");
  return (
    extra === undefined &&
    comicSlug.safeParse(slug).success &&
    chapterNumber.test(number ?? "")
  );
});

export function komikuChapterPath(slug: string, number: number) {
  return `/read/komiku/${slug}~${number}`;
}
