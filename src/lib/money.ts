import Decimal from "decimal.js";

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
});

export { Decimal };

export type MoneyInput = string | number | Decimal;

const IT_LOCALE = "it-IT";

export function toDecimal(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
      return new Decimal(parseMoneyInput(trimmed));
    }
    return new Decimal(trimmed);
  }
  return new Decimal(value);
}

export function money(value: MoneyInput): Decimal {
  return toDecimal(value).toDecimalPlaces(4);
}

export function add(a: MoneyInput, b: MoneyInput): Decimal {
  return money(toDecimal(a).plus(toDecimal(b)));
}

export function sub(a: MoneyInput, b: MoneyInput): Decimal {
  return money(toDecimal(a).minus(toDecimal(b)));
}

export function isPositive(value: MoneyInput): boolean {
  return toDecimal(value).gt(0);
}

/** Canonical DB/API string with `.` as decimal separator. */
export function serializeDecimal(value: MoneyInput): string {
  return money(value).toFixed(4);
}

/** FX rates keep up to 8 decimal places (e.g. 0.94514). */
export function serializeRate(value: MoneyInput): string {
  return toDecimal(value).toDecimalPlaces(8).toFixed(8);
}

/**
 * Parse user-facing amounts to canonical `1234.56`.
 * Accepts Italian (`1.234,56` / `1234,56`) and plain (`1234.56`).
 */
export function parseMoneyInput(raw: string, maxDecimals = 8): string {
  const trimmed = raw.trim().replace(/\s/g, "").replace(/[^\d.,-]/g, "");
  if (!trimmed || trimmed === "-" || trimmed === "," || trimmed === ".") {
    throw new Error("Invalid amount");
  }

  let normalized: string;
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  if (hasComma && hasDot) {
    // 1.234,56 → thousands `.`, decimal `,`
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = trimmed.replace(",", ".");
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    // 1.234 or 1.234.567 → thousands only
    normalized = trimmed.replace(/\./g, "");
  } else {
    normalized = trimmed;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid amount");
  }

  const [, frac = ""] = normalized.split(".");
  if (frac.length > maxDecimals) {
    throw new Error(`Max ${maxDecimals} decimal places`);
  }

  return normalized;
}

/** Number only, Italian separators (e.g. 1.234,56). */
export function formatNumber(
  value: MoneyInput,
  fractionDigits = 2,
): string {
  const fixed = toDecimal(value).toDecimalPlaces(fractionDigits).toFixed(fractionDigits);
  return new Intl.NumberFormat(IT_LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: true,
  }).format(Number(fixed));
}

/** Currency display with Italian separators. */
export function formatMoney(
  value: MoneyInput,
  currency: "EUR" | "CHF",
): string {
  const amount = Number(money(value).toFixed(2));
  return new Intl.NumberFormat(IT_LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount);
}

/** Value for amount inputs: Italian decimal comma, optional thousands. */
export function formatMoneyInput(value: MoneyInput, maxFractionDigits = 4): string {
  const asMoney = toDecimal(value).toDecimalPlaces(maxFractionDigits);
  const raw = asMoney.toFixed(maxFractionDigits).replace(/\.?0+$/, "");
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [intPart, fracPart] = unsigned.split(".");
  const intFormatted = new Intl.NumberFormat(IT_LOCALE, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(Number(intPart || "0"));
  const sign = negative ? "-" : "";
  return fracPart ? `${sign}${intFormatted},${fracPart}` : `${sign}${intFormatted}`;
}
