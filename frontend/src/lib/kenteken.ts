export function normalizeKenteken(input: string): string {
  return input.toUpperCase().replace(/[-\s]/g, "");
}

export function isValidKenteken(input: string): boolean {
  return /^[A-Z0-9]{6}$/.test(normalizeKenteken(input));
}

export function formatKenteken(input: string): string {
  const normalized = normalizeKenteken(input);
  const groups = normalized.match(/[A-Z]+|[0-9]+/g);
  return groups ? groups.join("-") : normalized;
}
