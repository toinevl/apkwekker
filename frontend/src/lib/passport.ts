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

export interface PassportView {
  title: string;
  dateLine: string | null;
  rows: { label: string; value: string }[];
  badge: { text: string; kind: "verlopen" | "binnenkort" | "geldig" | "onbekend" };
  daysLine: string | null;
}

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const nlDate = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });

export function formatDateNl(iso: string | null): string {
  if (!iso) return "onbekend";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "onbekend" : nlDate.format(d);
}

export function badgeFor(status: VehiclePassport["apkStatus"]): PassportView["badge"] {
  switch (status) {
    case "verlopen":
      return { text: "Verlopen!", kind: "verlopen" };
    case "binnenkort":
      return { text: "Verloopt binnenkort", kind: "binnenkort" };
    case "geldig":
      return { text: "Geldig", kind: "geldig" };
    default:
      return { text: "Onbekend", kind: "onbekend" };
  }
}

export function daysLineFor(days: number | null): string | null {
  if (days === null) return null;
  if (days < 0) return `${Math.abs(days)} dagen geleden verlopen`;
  if (days === 0) return "verloopt vandaag";
  if (days === 1) return "nog 1 dag";
  return `nog ${days} dagen`;
}

/** Prominent one-line APK-date result (free sample): the instant answer, before any ask. */
export function dateLineFor(iso: string | null, status: VehiclePassport["apkStatus"]): string | null {
  if (!iso) return null;
  const formatted = formatDateNl(iso);
  if (formatted === "onbekend") return null;
  if (status === "verlopen") return `Je APK is verlopen sinds ${formatted}`;
  return `Je volgende APK: ${formatted}`;
}

export function toPassportView(p: VehiclePassport): PassportView {
  const title = [p.merk, p.handelsbenaming].filter(Boolean).join(" ") || "Voertuig";
  const rows: { label: string; value: string }[] = [];

  if (p.bouwjaar) rows.push({ label: "Bouwjaar", value: String(p.bouwjaar) });
  if (p.brandstof) rows.push({ label: "Brandstof", value: p.brandstof });
  if (p.catalogusprijs) rows.push({ label: "Cataloguswaarde", value: euro.format(p.catalogusprijs) });
  if (p.massa_rijklaar) rows.push({ label: "Massa rijklaar", value: `${p.massa_rijklaar} kg` });
  if (p.maximum_trekken_massa_geremd)
    rows.push({ label: "Trekgewicht (geremd)", value: `${p.maximum_trekken_massa_geremd} kg` });
  if (p.maximum_massa_trekken_ongeremd)
    rows.push({ label: "Trekgewicht (ongeremd)", value: `${p.maximum_massa_trekken_ongeremd} kg` });

  return { title, dateLine: dateLineFor(p.vervaldatum_apk, p.apkStatus), rows, badge: badgeFor(p.apkStatus), daysLine: daysLineFor(p.daysUntilApk) };
}

/** Map an API error response to a Dutch user message. */
export function errorMessage(status: number, body: { error?: string; message?: string } | null): string {
  const fromApi = body?.error ?? body?.message;
  if (fromApi) return fromApi;
  if (status === 429) return "Te veel verzoeken. Probeer het later opnieuw.";
  if (status === 404) return "Kenteken niet gevonden.";
  if (status >= 500) return "Er ging iets mis. Probeer het later opnieuw.";
  return "Er ging iets mis.";
}
