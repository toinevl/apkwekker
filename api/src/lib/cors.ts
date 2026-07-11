import { HttpRequest, HttpResponseInit } from "@azure/functions";

const DEFAULT_ORIGINS = "http://localhost:5173,http://localhost:4280";

function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function corsHeaders(req: HttpRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (origin && allowedOrigins().includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  return {};
}

/** Returns a 204 preflight response for OPTIONS requests, or null to continue. */
export function handlePreflight(req: HttpRequest): HttpResponseInit | null {
  if (req.method === "OPTIONS") {
    return { status: 204, headers: corsHeaders(req) };
  }
  return null;
}

/** Wrap a response with CORS headers for the request origin. */
export function withCors(req: HttpRequest, res: HttpResponseInit): HttpResponseInit {
  return { ...res, headers: { ...corsHeaders(req), ...(res.headers as Record<string, string> | undefined) } };
}
