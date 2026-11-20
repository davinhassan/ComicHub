import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://127.0.0.1:3100" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.COMICHUB_BROWSER_CHANNEL,
      },
    },
    {
      name: "mobile-320",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 320, height: 740 },
        channel: process.env.COMICHUB_BROWSER_CHANNEL,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    timeout: 120_000,
  },
});
