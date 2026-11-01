/** Parse full currency amounts; never infer units or returns from shorthand. */
export function money(value: string): number | null {
  if (!value.trim()) return null;
  const cleaned = value
    .trim()
    .replace(/^(GBP|USD|EUR)\s*/i, "")
    .replace(/\s*(GBP|USD|EUR)$/i, "")
    .replace(/^[£$€]\s*/, "");
  if (!/^(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)$/.test(cleaned))
    return null;
  const result = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(result) ? result : null;
}
function currency(value: string) {
  if (/GBP|£/i.test(value)) return "GBP";
  if (/USD|\$/i.test(value)) return "USD";
  if (/EUR|€/i.test(value)) return "EUR";
  return null;
}
export function runway(savings: string, expenses: string): number | null {
  const s = money(savings),
    e = money(expenses);
  const a = currency(savings),
    b = currency(expenses);
  if (a && b && a !== b) return null;
  return s !== null && e !== null && e > 0
    ? Math.round((s / e) * 10) / 10
    : null;
}
