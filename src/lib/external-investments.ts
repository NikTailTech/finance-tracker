import { Currency } from "@prisma/client";
import type Decimal from "decimal.js";
import { add, money, serializeDecimal } from "@/lib/money";

export type ExternalInvestmentSource = {
  id: string;
  label: string;
  /** Native amount as reported by the API for this source. */
  amount: string;
  currency: "EUR" | "CHF";
  status: "disconnected" | "live" | "manual" | "error";
};

export type ExternalInvestmentHolding = {
  id: string;
  sourceId: string;
  label: string;
  symbol?: string;
  amount: string;
  currency: "EUR" | "CHF";
};

/**
 * External portfolios. Crypto-tracker is expected to report CHF;
 * EUR slots stay ready for future EUR-denominated assets.
 */
export type ExternalInvestmentsSnapshot = {
  connected: boolean;
  /** Native totals by currency (no FX conversion). */
  totals: { EUR: string; CHF: string };
  sources: ExternalInvestmentSource[];
  holdings: ExternalInvestmentHolding[];
};

/**
 * Placeholder until crypto-tracker (or other) API is wired via env URL.
 * Amounts land in CHF when connected.
 */
export async function fetchExternalInvestments(_options: {
  eurToChf: Decimal;
}): Promise<ExternalInvestmentsSnapshot> {
  void _options;
  return {
    connected: false,
    totals: {
      EUR: serializeDecimal(money(0)),
      CHF: serializeDecimal(money(0)),
    },
    sources: [
      {
        id: "crypto",
        label: "Crypto",
        amount: serializeDecimal(money(0)),
        currency: "CHF",
        status: "disconnected",
      },
    ],
    holdings: [],
  };
}

export function sumExternalTotals(snapshot: ExternalInvestmentsSnapshot) {
  return {
    EUR: money(snapshot.totals.EUR),
    CHF: money(snapshot.totals.CHF),
    combined: add(snapshot.totals.EUR, snapshot.totals.CHF),
  };
}

export const EXTERNAL_INVESTMENT_CURRENCY = Currency.CHF;
