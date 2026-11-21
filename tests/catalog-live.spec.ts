import { expect, test } from "@playwright/test";

test("genre Fantasi membuka episode Pepper & Carrot dengan gambar asli", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.COMICHUB_TEST_LIVE !== "true",
    "Memerlukan akses ke API dan gambar Pepper & Carrot.",
  );
  await page.goto("/explore");
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
