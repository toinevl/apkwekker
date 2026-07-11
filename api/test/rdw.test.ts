import { describe, it, expect } from "vitest";
import { daysUntil, apkStatusFor, buildPassport } from "../src/lib/rdw";

const NOW = new Date("2026-07-11T12:00:00Z");

describe("daysUntil", () => {
  it("computes whole days ignoring time of day", () => {
    expect(daysUntil("2026-07-21T00:00:00.000", NOW)).toBe(10);
    expect(daysUntil("2026-07-11T00:00:00.000", NOW)).toBe(0);
    expect(daysUntil("2026-07-01T00:00:00.000", NOW)).toBe(-10);
  });
  it("returns null for missing or invalid dates", () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil("not-a-date", NOW)).toBeNull();
  });
});

describe("apkStatusFor", () => {
  it("maps day counts to status", () => {
    expect(apkStatusFor(null)).toBe("onbekend");
    expect(apkStatusFor(-1)).toBe("verlopen");
    expect(apkStatusFor(0)).toBe("binnenkort");
    expect(apkStatusFor(59)).toBe("binnenkort");
    expect(apkStatusFor(60)).toBe("geldig");
  });
});

describe("buildPassport", () => {
  const row = {
    kenteken: "00JTB5",
    merk: "VOLKSWAGEN",
    handelsbenaming: "FOX",
    voertuigsoort: "Personenauto",
    datum_eerste_toelating: "20060512",
    vervaldatum_apk_dt: "2026-08-01T00:00:00.000",
    catalogusprijs: "11720",
    massa_rijklaar: "1080",
    maximum_massa_trekken_ongeremd: "520",
    maximum_trekken_massa_geremd: "700",
  };

  it("maps RDW fields into a passport", () => {
    const p = buildPassport(row, "Benzine", NOW);
    expect(p.kenteken).toBe("00-JTB-5");
    expect(p.merk).toBe("VOLKSWAGEN");
    expect(p.bouwjaar).toBe(2006);
    expect(p.vervaldatum_apk).toBe("2026-08-01");
    expect(p.catalogusprijs).toBe(11720);
    expect(p.brandstof).toBe("Benzine");
    expect(p.maximum_massa_trekken_ongeremd).toBe(520);
    expect(p.apkStatus).toBe("binnenkort");
    expect(p.daysUntilApk).toBe(21);
  });

  it("tolerates missing fields", () => {
    const p = buildPassport({ kenteken: "XX99XX" }, null, NOW);
    expect(p.merk).toBeNull();
    expect(p.bouwjaar).toBeNull();
    expect(p.vervaldatum_apk).toBeNull();
    expect(p.apkStatus).toBe("onbekend");
    expect(p.daysUntilApk).toBeNull();
  });
});
