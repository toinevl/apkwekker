import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "https://victorious-pebble-0f3357803.7.azurestaticapps.net",
    trace: "off",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});
