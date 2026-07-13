import { test, expect } from "@playwright/test";

const API_BASE = process.env.API_BASE_URL ?? "";
const BASE_URL = process.env.BASE_URL ?? "https://victorious-pebble-0f3357803.7.azurestaticapps.net";

if (!API_BASE) {
  throw new Error("API_BASE_URL is required for production E2E tests");
}

test.describe("APKwekker production E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("loads the homepage", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Nooit meer je APK vergeten");
  });

  test("happy path: valid kenteken shows vehicle passport", async ({ page }) => {
    const plate = "00-JTB-5";
    await page.fill("#kenteken-input", plate);
    await page.click("#kenteken-form button[type='submit']");

    await expect(page.locator("#result .passport-card")).toBeVisible();
    await expect(page.locator(".mini-plate")).toHaveText(plate);
    await expect(page.locator("#subscribe-section")).toBeVisible();
  });

  test("error path: invalid kenteken shows Dutch validation error", async ({ page }) => {
    await page.fill("#kenteken-input", "bad");
    await page.click("#kenteken-form button[type='submit']");

    await expect(
      page.locator("#result .error", { hasText: "Ongeldig kenteken" })
    ).toBeVisible();
    await expect(page.locator("#subscribe-section")).toBeHidden();
  });

  test("error path: unknown kenteken shows 404 message", async ({ page }) => {
    await page.fill("#kenteken-input", "ZZ-ZZ-ZZ");
    await page.click("#kenteken-form button[type='submit']");

    await expect(
      page.locator("#result .error", { hasText: "Kenteken niet gevonden" })
    ).toBeVisible();
    await expect(page.locator("#subscribe-section")).toBeHidden();
  });

  test("subscribe shows message and keeps optimistic UI hidden when network fails", async ({ page }) => {
    await page.route(`${API_BASE}/api/subscribe`, (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: "boom" }) })
    );

    await page.fill("#kenteken-input", "AA-11-BB");
    await page.click("#kenteken-form button[type='submit']");
    await expect(page.locator("#result .passport-card")).toBeVisible();

    const now = Date.now();
    await page.fill("#email-input", `e2e-${now}@example.com`);
    await page.click("#subscribe-form button[type='submit']");

    await expect(page.locator("#subscribe-message .error")).toContainText("boom");
  });

  test("confirm invalid token redirects to invalid page", async ({ page }) => {
    await page.goto(`${API_BASE}/api/confirm?token=invalid`);

    await expect(page).toHaveURL(new RegExp(`${BASE_URL}/ongeldig.html$`));
    await expect(page.locator("h1")).toContainText("ongeldig");
  });

  test("unsubscribe invalid token redirects to invalid page", async ({ page }) => {
    await page.goto(`${API_BASE}/api/unsubscribe?token=invalid`);

    await expect(page).toHaveURL(new RegExp(`${BASE_URL}/ongeldig.html$`));
    await expect(page.locator("h1")).toContainText("ongeldig");
  });

  test("navigation to privacy, confirmation, and unsubscribe pages resolves", async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy.html`);
    await expect(page).toHaveURL(new RegExp(`${BASE_URL}/privacy.html$`));
    await expect(page.locator("h1")).toContainText("Privacyverklaring");

    await page.goto(`${BASE_URL}/bevestigd.html`);
    await expect(page.locator("h1")).toContainText("bevestigd");

    await page.goto(`${BASE_URL}/afgemeld.html`);
    await expect(page.locator("h1")).toContainText("afgemeld");
  });

  test("health endpoint is ok", async ({ page }) => {
    const result = (await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/health`);
      const json = (await res.json()) as { status?: string };
      return { status: res.status, body: json };
    }, API_BASE)) as { status: number; body: { status?: string } };

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("ok");
  });
});
