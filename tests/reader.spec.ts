import { expect, test } from "@playwright/test";

const chapterId = "86c80f2e-6696-4373-834c-a5c7c9ece0e7";
const path = `/read/mangadex/${chapterId}`;
const endpoint = `/api/chapters/mangadex/${chapterId}`;

test("reader menampilkan status jujur bila chapter belum diizinkan", async ({
  page,
  request,
}) => {
  const response = await request.get(endpoint);
  const enabled = process.env.FEATURE_MANGADEX === "true";
  expect(response.status()).toBe(enabled ? 403 : 503);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const error = await response.json();
  expect(error.code).toBe(enabled ? "NO_LICENSE" : "UNAVAILABLE");
  await page.goto(path);
  await expect(page.getByRole("status")).toHaveText(error.message);
  await expect(
    page.getByRole("link", { name: "Buka di MangaDex" }),
  ).toHaveAttribute("href", `https://mangadex.org/chapter/${chapterId}`);
  expect((await request.get("/api/chapters/mangadex/invalid")).status()).toBe(
    404,
  );
});

test("mode baca dan pemulihan gambar dengan fixture khusus browser", async ({
  page,
}) => {
  const pages = [0, 1].map((index) => ({
    index,
    width: 320,
    height: 480,
    url: `https://uploads.mangadex.org/data/test-fixture/page-${index}.png`,
  }));
  await page.route(endpoint, (route) => route.fulfill({ json: { pages } }));
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf2sAAAAASUVORK5CYII=",
    "base64",
  );
  await page.route(pages[0].url, (route) =>
    route.fulfill({ contentType: "image/png", body: pixel }),
  );
  await page.route(pages[1].url, (route) => route.abort());
  await page.goto(path);
  await expect(page.getByLabel("Mode baca")).toHaveValue("strip");
  await expect(page.getByRole("img", { name: "Halaman 1" })).toBeVisible();
  await page.getByLabel("Mode baca").selectOption("paged");
  await expect(page.getByText("Halaman 1 / 2")).toBeVisible();
  await page.getByRole("button", { name: "Lebar penuh" }).click();
  await expect(
    page.getByRole("button", { name: "Lebar penuh" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Lebar penuh" }).press("ArrowRight");
  await expect(page.getByText("Halaman 2 / 2")).toBeVisible();
  await expect(page.getByText("Halaman 2 gagal dimuat.")).toBeVisible();
  await page.getByRole("button", { name: "Muat ulang chapter" }).click();
  await expect(page.getByLabel("Mode baca")).toHaveValue("strip");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    page.viewportSize()?.width,
  );
});

test("reader Komiku tetap di ComicHub dan menavigasi chapter desimal", async ({
  page,
  request,
}) => {
  const path = "/read/komiku/comichub-test-fixture~1";
  const endpoint = "/api/chapters/komiku/comichub-test-fixture~1";
  const locked = await request.get(endpoint);
  expect(locked.status()).toBe(403);
  expect((await locked.json()).code).toBe("NO_LICENSE");
  expect(
    (
      await request.get("/api/chapters/komiku/comichub-test-fixture~invalid")
    ).status(),
  ).toBe(404);

  const url = "https://img.komiku.org/comichub-test-fixture/page-1.png";
  const pages = [{ index: 0, url }];
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf2sAAAAASUVORK5CYII=",
    "base64",
  );
  await page.route(url, (route) =>
    route.fulfill({ contentType: "image/png", body: pixel }),
  );
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { title: "Chapter 1", pages, next: 1.5 } }),
  );
  await page.route(`${endpoint}.5`, (route) =>
    route.fulfill({ json: { title: "Chapter 1.5", pages, previous: 1 } }),
  );
  await page.goto(path);
  await expect(page.getByRole("img", { name: "Halaman 1" })).toBeVisible();
  await page.getByRole("link", { name: "Chapter berikutnya" }).click();
  await expect(page).toHaveURL(`${path}.5`);
  await expect(
    page.getByRole("heading", { name: "Chapter 1.5" }),
  ).toBeVisible();
});
