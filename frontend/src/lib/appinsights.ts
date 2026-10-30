import { APP_INSIGHTS_CONNECTION_STRING } from "../config";

/**
 * Initialiseert Application Insights als cookieless beacon.
 *
 * - Zonder connection string: strakke no-op — het SDK-bundle wordt via dynamic
 *   import niet eens geladen en er verlaat niets de browser.
 * - Met connection string: cookies uit (disableCookiesUsage), alleen first-party
 *   pageviews; geen PII (kenteken/e-mail) wordt geregistreerd.
 * - Fouten hierin mogen de site nooit breken: alles in try/catch, degraderen
 *   naar "geen telemetry".
 */
export async function initAppInsights(): Promise<void> {
  if (!APP_INSIGHTS_CONNECTION_STRING) return;
  try {
    const { ApplicationInsights } = await import("@microsoft/applicationinsights-web");
    const appInsights = new ApplicationInsights({
      config: {
        connectionString: APP_INSIGHTS_CONNECTION_STRING,
        disableCookiesUsage: true,
        autoTrackPageVisitTime: true,
        samplingPercentage: 100,
      },
    });
    appInsights.loadAppInsights();
    appInsights.trackPageView();
  } catch (err) {
    console.warn("[telemetry] App Insights niet geladen — beacon uitgeschakeld.", err);
  }
}
