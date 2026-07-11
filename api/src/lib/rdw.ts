import { normalizeKenteken, formatKenteken } from "./kenteken";

export interface VehiclePassport {
  kenteken: string;
  merk: string | null;
  handelsbenaming: string | null;
  voertuigsoort: string | null;
  bouwjaar: number | null;
  vervaldatum_apk: string | null;
  catalogusprijs: number | null;
  brandstof: string | null;
  massa_rijklaar: number | null;
  maximum_massa_trekken_ongeremd: number | null;
  maximum_trekken_massa_geremd: number | null;
  apkStatus: "verlopen" | "binnenkort" | "geldig" | "onbekend";
  daysUntilApk: number | null;
}

export class RdwError extends Error {
  constructor(public code: "NOT_FOUND" | "UNAVAILABLE", message: string) {
    super(message);
  }
}

const RDW_BASE = "https://opendata.rdw.nl/resource";
const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 60 * 60 * 1000;

const cache = new Map<string, { data: VehiclePassport; at: number }>();

export function clearRdwCache(): void {
  cache.clear();
}

export function daysUntil(dateIso: string | null, now: Date = new Date()): number | null {
  if (!dateIso) return null;
  const expiry = new Date(dateIso);
  if (isNaN(expiry.getTime())) return null;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfExpiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  return Math.round((startOfExpiry.getTime() - startOfToday.getTime()) / 86400000);
}

export function apkStatusFor(days: number | null): VehiclePassport["apkStatus"] {
  if (days === null) return "onbekend";
  if (days < 0) return "verlopen";
  if (days < 60) return "binnenkort";
  return "geldig";
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "APKwekker/1.0" } });
    if (!res.ok) throw new Error(`RDW status ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export interface RawRdwRow {
  [key: string]: unknown;
}

export function buildPassport(row: RawRdwRow, brandstof: string | null, now: Date = new Date()): VehiclePassport {
  const apkIso = (row.vervaldatum_apk_dt as string | undefined) ?? null;
  const days = daysUntil(apkIso, now);
  const toelating = row.datum_eerste_toelating_dt ?? row.datum_eerste_toelating;
  let bouwjaar: number | null = null;
  if (typeof toelating === "string" && toelating.length >= 4) {
    const y = parseInt(toelating.slice(0, 4), 10);
    bouwjaar = isNaN(y) ? null : y;
  }
  return {
    kenteken: formatKenteken(String(row.kenteken ?? "")),
    merk: (row.merk as string | undefined) ?? null,
    handelsbenaming: (row.handelsbenaming as string | undefined) ?? null,
    voertuigsoort: (row.voertuigsoort as string | undefined) ?? null,
    bouwjaar,
    vervaldatum_apk: apkIso ? apkIso.slice(0, 10) : null,
    catalogusprijs: toNumber(row.catalogusprijs),
    brandstof,
    massa_rijklaar: toNumber(row.massa_rijklaar),
    maximum_massa_trekken_ongeremd: toNumber(row.maximum_massa_trekken_ongeremd),
    maximum_trekken_massa_geremd: toNumber(row.maximum_trekken_massa_geremd),
    apkStatus: apkStatusFor(days),
    daysUntilApk: days,
  };
}

export async function getVehicle(kenteken: string): Promise<VehiclePassport> {
  const normalized = normalizeKenteken(kenteken);

  const hit = cache.get(normalized);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  let rows: unknown;
  try {
    rows = await fetchJson(`${RDW_BASE}/m9d7-ebf2.json?kenteken=${encodeURIComponent(normalized)}`);
  } catch {
    throw new RdwError("UNAVAILABLE", "RDW is tijdelijk niet bereikbaar.");
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new RdwError("NOT_FOUND", "Kenteken niet gevonden.");
  }

  let brandstof: string | null = null;
  try {
    const fuel = await fetchJson(`${RDW_BASE}/8ys7-d773.json?kenteken=${encodeURIComponent(normalized)}`);
    if (Array.isArray(fuel) && fuel.length > 0) {
      brandstof = (fuel[0].brandstof_omschrijving as string | undefined) ?? null;
    }
  } catch {
    // best-effort: fuel data failure is tolerated
  }

  const passport = buildPassport(rows[0] as RawRdwRow, brandstof);
  cache.set(normalized, { data: passport, at: Date.now() });
  return passport;
}
