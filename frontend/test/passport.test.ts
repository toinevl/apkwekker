import { describe, it, expect } from "vitest";
import { toPassportView, badgeFor, daysLineFor, formatDateNl, errorMessage, VehiclePassport } from "../src/lib/passport";

const base: VehiclePassport = {
  kenteken: "00-JTB-5",
  merk: "VOLKSWAGEN",
  handelsbenaming: "FOX",
  voertuigsoort: "Personenauto",
  bouwjaar: 2006,
  vervaldatum_apk: "2026-08-01",
  catalogusprijs: 11720,
  brandstof: "Benzine",
  massa_rijklaar: 1080,
  maximum_massa_trekken_ongeremd: 520,
  maximum_trekken_massa_geremd: 700,
  apkStatus: "binnenkort",
  daysUntilApk: 21,
};

describe("badgeFor", () => {
  it("maps statuses to Dutch badge text", () => {
    expect(badgeFor("verlopen").text).toBe("Verlopen!");
    expect(badgeFor("binnenkort").text).toBe("Verloopt binnenkort");
    expect(badgeFor("geldig").text).toBe("Geldig");
    expect(badgeFor("onbekend").text).toBe("Onbekend");
  });
});

describe("daysLineFor", () => {
  it("phrases day counts in Dutch", () => {
    expect(daysLineFor(21)).toBe("nog 21 dagen");
    expect(daysLineFor(1)).toBe("nog 1 dag");
    expect(daysLineFor(0)).toBe("verloopt vandaag");
    expect(daysLineFor(-5)).toBe("5 dagen geleden verlopen");
    expect(daysLineFor(null)).toBeNull();
  });
});

describe("formatDateNl", () => {
  it("formats ISO dates in Dutch", () => {
    expect(formatDateNl("2026-08-01")).toContain("augustus");
    expect(formatDateNl(null)).toBe("onbekend");
    expect(formatDateNl("garbage")).toBe("onbekend");
  });
});

describe("toPassportView", () => {
  it("builds a full view", () => {
    const v = toPassportView(base);
    expect(v.title).toBe("VOLKSWAGEN FOX");
    expect(v.badge.kind).toBe("binnenkort");
    expect(v.daysLine).toBe("nog 21 dagen");
    expect(v.rows.find((r) => r.label === "Cataloguswaarde")?.value).toMatch(/11\.720/);
    expect(v.rows.find((r) => r.label === "Trekgewicht (geremd)")?.value).toBe("700 kg");
  });

  it("omits missing rows and falls back on title", () => {
    const v = toPassportView({ ...base, merk: null, handelsbenaming: null, catalogusprijs: null, bouwjaar: null });
    expect(v.title).toBe("Voertuig");
    expect(v.rows.find((r) => r.label === "Cataloguswaarde")).toBeUndefined();
    expect(v.rows.find((r) => r.label === "Bouwjaar")).toBeUndefined();
  });
});

describe("errorMessage", () => {
  it("prefers the API-provided message", () => {
    expect(errorMessage(400, { error: "Ongeldig kenteken." })).toBe("Ongeldig kenteken.");
    expect(errorMessage(200, { message: "Check je inbox." })).toBe("Check je inbox.");
  });
  it("falls back per status code", () => {
    expect(errorMessage(429, null)).toContain("Te veel");
    expect(errorMessage(404, null)).toContain("niet gevonden");
    expect(errorMessage(500, null)).toContain("later opnieuw");
  });
});
