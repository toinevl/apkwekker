const KENTEKEN_RE = /^[A-Z0-9]{6}$/;

export function normalizeKenteken(input: string): string {
  return input.toUpperCase().replace(/[-\s]/g, "");
}

export function isValidKenteken(input: string): boolean {
  return KENTEKEN_RE.test(normalizeKenteken(input));
}

/** Display format: split runs of letters/digits and join with dashes, e.g. 00JTB5 -> 00-JTB-5 */
export function formatKenteken(input: string): string {
  const normalized = normalizeKenteken(input);
  const groups = normalized.match(/[A-Z]+|[0-9]+/g);
  return groups ? groups.join("-") : normalized;
}
