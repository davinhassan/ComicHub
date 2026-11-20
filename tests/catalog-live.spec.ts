import { expect, test } from "@playwright/test";

test("sampul Komiku dimuat dan pencarian lintas sumber membuka reader", async ({
  page,
}) => {
  test.skip(
    process.env.COMICHUB_TEST_LIVE !== "true",
    "Memerlukan akses katalog dan gambar Komiku.",
  );
  await page.goto("/");
  const updates = page.getByRole("region", { name: "Pembaruan terbaru" });
  const cover = updates
    .locator('img[src^="https://thumbnail.komiku.org/"]')
    .first();
  await cover.scrollIntoViewIfNeeded();
  await expect
    .poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole("link", { name: "Jelajahi katalog" }).click();
  await page.getByRole("searchbox", { name: "Cari judul" }).fill("One Piece");
  await page.getByLabel("Genre").selectOption("action");
  await page.getByRole("button", { name: "Cari" }).click();
  await expect(page).toHaveURL(/genre=action/);
  await expect(
    page.getByRole("link", { name: /^One Piece Komikcast/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /One Piece/i }).first(),
  ).toBeVisible();
  const result = page.getByRole("link", { name: /^One Piece Komiku/ });
  await expect(result).toHaveAttribute("href", /\/comic\/komiku\//);
  await result.click();
  await page
    .getByRole("link", { name: /^Chapter / })
    .first()
    .click();
  await expect(page).toHaveURL(/\/read\/komiku\/[^/]+~\d/);
  await expect(
    page.getByRole("link", { name: "Daftar chapter Komiku" }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    page.viewportSize()?.width,
  );
});

test("Komikcast menampilkan katalog, hasil pencarian, dan hasil kosong", async ({
  page,
}) => {
  test.skip(
    process.env.COMICHUB_TEST_LIVE !== "true",
    "Memerlukan akses ke Komikcast.",
  );
  await page.goto("/explore?source=Komikcast");
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();

  const fill = async (query: string) => {
    await page.getByRole("searchbox", { name: "Cari judul" }).fill(query);
    await page.getByRole("button", { name: "Cari" }).click();
  };
  await fill("One Piece");
  const result = page.getByRole("link", { name: /^One Piece Komikcast/ });
  await expect(result).toHaveAttribute(
    "href",
    /^https:\/\/s1\.komikcast00\.co\.id\/detail-comic\//,
  );
  await fill("zzzcodexnonexistent123");
  await expect(page.getByText("Tidak ada judul yang cocok.")).toBeVisible();
});

test("genre Fantasi membuka episode Pepper & Carrot dengan gambar asli", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.COMICHUB_TEST_LIVE !== "true",
    "Memerlukan akses ke API dan gambar Pepper & Carrot.",
  );
  await page.goto("/explore");
  await expect(page.getByLabel("Sumber")).toHaveCount(0);
  await page.getByLabel("Genre").selectOption("fantasy");
  await page.getByRole("button", { name: "Cari" }).click();
  await expect(page).toHaveURL(/genre=fantasy/);
  await page
    .getByRole("link", { name: /Pepper & Carrot.*Baca di ComicHub/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Daftar episode" }),
  ).toBeVisible();
  const episodes = page.locator('a[href^="/read/peppercarrot/"]');
  expect(await episodes.count()).toBeGreaterThan(30);
  await page.getByRole("link", { name: /^Episode 26 / }).click();
  await expect(page).toHaveURL(/\/read\/peppercarrot\/26$/);
  const firstImage = page.getByRole("img", { name: "Halaman 1", exact: true });
  await expect
    .poll(() =>
      firstImage.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: "CC BY 4.0" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sumber dan kredit episode" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Chapter berikutnya" }).click();
  await expect(page).toHaveURL(/\/read\/peppercarrot\/27$/);
  await expect(page.getByRole("heading", { name: /Episode 27/ })).toBeVisible();
  expect((await request.get("/api/chapters/peppercarrot/999")).status()).toBe(
    404,
  );

  await page.goto("/explore?genre=horror&q=Pepper%20%26%20Carrot");
  await expect(page.getByText("Tidak ada judul yang cocok.")).toBeVisible();
});
