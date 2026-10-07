export const DATE_FORMATS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD.MM.YYYY",
] as const;

export type DateFormat = (typeof DATE_FORMATS)[number];

export const DEFAULT_DATE_FORMAT: DateFormat = "DD/MM/YYYY";

export const DATE_FORMAT_OPTIONS: {
  value: DateFormat;
  label: string;
  example: string;
}[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "31/12/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "12/31/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-12-31" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY", example: "31.12.2026" },
];

export function resolveDateFormat(
  value: string | null | undefined,
): DateFormat {
  if (value && (DATE_FORMATS as readonly string[]).includes(value)) {
    return value as DateFormat;
  }
  return DEFAULT_DATE_FORMAT;
}

/** Format an ISO date string (`YYYY-MM-DD` or full ISO) for display. */
export function formatDisplayDate(
  iso: string | null | undefined,
  format: DateFormat = DEFAULT_DATE_FORMAT,
): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return iso;
  const [, year, month, day] = match;
  switch (format) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "DD.MM.YYYY":
      return `${day}.${month}.${year}`;
    case "DD/MM/YYYY":
    default:
      return `${day}/${month}/${year}`;
  }
}

export function dateFormatPlaceholder(format: DateFormat = DEFAULT_DATE_FORMAT) {
  return (
    DATE_FORMAT_OPTIONS.find((option) => option.value === format)?.example ??
    "31/12/2026"
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoParts(year: number, month: number, day: number): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Parse a display-formatted date back to ISO `YYYY-MM-DD`, or null if invalid. */
export function parseDisplayDate(
  text: string | null | undefined,
  format: DateFormat = DEFAULT_DATE_FORMAT,
): string | null {
  const raw = (text ?? "").trim();
  if (!raw) return null;

  let year = 0;
  let month = 0;
  let day = 0;

  if (format === "YYYY-MM-DD") {
    const match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(raw);
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else if (format === "MM/DD/YYYY") {
    const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(raw);
    if (!match) return null;
    month = Number(match[1]);
    day = Number(match[2]);
    year = Number(match[3]);
  } else {
    // DD/MM/YYYY and DD.MM.YYYY (also accept - as separator)
    const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(raw);
    if (!match) return null;
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
  }

  return toIsoParts(year, month, day);
}

/** True when `iso` is a valid calendar date in `YYYY-MM-DD` form. */
export function isIsoDate(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return false;
  return (
    toIsoParts(Number(match[1]), Number(match[2]), Number(match[3])) === iso.trim()
  );
}
