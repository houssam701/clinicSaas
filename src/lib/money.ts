/**
 * Money helpers. Amounts are stored as Numeric(12, 2) and come back from the
 * database as exact strings ("150.00"). All arithmetic here happens in whole
 * cents (integers), never in floating point, so 0.10 + 0.20 is exactly 0.30.
 */

/** Largest amount Numeric(12, 2) can hold: 9,999,999,999.99. */
export const MAX_CENTS = 999_999_999_999;

/** "150", "150.5", "150.50" (and "-3.10") as text the database accepts. */
export const AMOUNT_PATTERN = /^-?\d{1,10}(\.\d{1,2})?$/;

/**
 * "150.5" → 15050 cents, parsed digit by digit (no float). Throws on text
 * that is not an amount, so bad data never turns into a silent 0.
 */
export function toCents(amount: string | number): number {
  const text = typeof amount === "number" ? amount.toFixed(2) : amount.trim();
  if (!AMOUNT_PATTERN.test(text)) throw new Error(`Not an amount: "${amount}"`);
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

/** 15050 → "150.50", the form the database stores. */
export function fromCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new Error(`Not a whole number of cents: ${cents}`);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Adds amounts exactly: sumCents(["0.10", "0.20"]) → 30. */
export function sumCents(amounts: (string | number)[]): number {
  return amounts.reduce<number>((total, amount) => total + toCents(amount), 0);
}

/**
 * 15050 → "$150.50" in the clinic's currency. Without a currency the number
 * is shown with two decimals and grouping only ("150.50").
 */
export function formatMoney(cents: number, currency?: string, locale = "en-US"): string {
  const value = cents / 100; // display only; never used for arithmetic
  if (!currency) {
    return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value.toLocaleString(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
