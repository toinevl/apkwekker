export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";

/**
 * Application Insights connection string (cookieless telemetry).
 * Leeg (default) = geen telemetry: de beacon laadt dan niets en verstuurt niets.
 * De connection string wordt via de GitHub-variabele VITE_APP_INSIGHTS_CONNECTION_STRING
 * als build-env ingezet.
 */
export const APP_INSIGHTS_CONNECTION_STRING: string =
  import.meta.env.VITE_APP_INSIGHTS_CONNECTION_STRING ?? "";
