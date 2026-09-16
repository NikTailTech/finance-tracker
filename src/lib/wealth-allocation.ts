import { AccountKind, Currency, type DivisionType } from "@prisma/client";
import type Decimal from "decimal.js";
import {
  add,
  money,
  serializeDecimal,
  toDecimal,
} from "@/lib/money";
import {
  type ExternalInvestmentHolding,
  type ExternalInvestmentsSnapshot,
} from "@/lib/external-investments";

export type WealthAllocationGroup = "CHECKING" | "CASH" | "ASSET";

export type WealthAllocationSegment = {
  id: string;
  label: string;
  group: WealthAllocationGroup;
  /** Amount in the chart currency (CHF by default). */
  amount: string;
  share: string;
  source: "ledger" | "external";
  accountId?: string;
  symbol?: string;
  /** Original currency of the underlying balance. */
  nativeCurrency?: "EUR" | "CHF";
};

export type AccountBalanceRow = {
  accountId: string;
  name: string;
  currency: Currency;
  kind: AccountKind | string;
  balance: string;
  divisions: { divisionId: string; type: DivisionType | string; balance: string }[];
};

/** Convert any EUR/CHF amount into a target currency using 1 EUR = eurToChf CHF. */
export function convertCurrency(
  amount: string | Decimal,
  from: Currency,
  to: Currency,
  eurToChf: Decimal,
): Decimal {
  const value = toDecimal(amount);
  if (from === to) return value;
  if (from === Currency.EUR && to === Currency.CHF) return value.mul(eurToChf);
  // CHF → EUR
  return value.div(eurToChf);
}

/**
 * Allocation pie uses CHF so external assets (API in CHF) sit next to
 * checking/cash without an extra conversion step for investments.
 */
export function buildWealthAllocation(
  accounts: AccountBalanceRow[],
  external: ExternalInvestmentsSnapshot,
  eurToChf: Decimal,
  chartCurrency: Currency = Currency.CHF,
): {
  total: string;
  currency: Currency;
  segments: WealthAllocationSegment[];
} {
  const segments: Omit<WealthAllocationSegment, "share">[] = [];

  for (const account of accounts) {
    const displayAmount = money(
      convertCurrency(account.balance, account.currency, chartCurrency, eurToChf),
    );
    if (!displayAmount.gt(0)) continue;

    segments.push({
      id: `account-${account.accountId}`,
      label: account.name,
      group: account.kind === AccountKind.CASH ? "CASH" : "CHECKING",
      amount: serializeDecimal(displayAmount),
      source: "ledger",
      accountId: account.accountId,
      nativeCurrency: account.currency,
    });
  }

  for (const holding of external.holdings) {
    appendExternalHolding(segments, holding, eurToChf, chartCurrency);
  }

  let total = money(0);
  for (const segment of segments) {
    total = add(total, segment.amount);
  }

  const withShares: WealthAllocationSegment[] = segments.map((segment) => ({
    ...segment,
    share: total.gt(0)
      ? serializeDecimal(money(toDecimal(segment.amount).div(total).mul(100)))
      : serializeDecimal(money(0)),
  }));

  return {
    total: serializeDecimal(total),
    currency: chartCurrency,
    segments: withShares.sort((a, b) =>
      Number(b.amount) !== Number(a.amount)
        ? Number(b.amount) - Number(a.amount)
        : a.label.localeCompare(b.label),
    ),
  };
}

function appendExternalHolding(
  segments: Omit<WealthAllocationSegment, "share">[],
  holding: ExternalInvestmentHolding,
  eurToChf: Decimal,
  chartCurrency: Currency,
) {
  const from = holding.currency === "EUR" ? Currency.EUR : Currency.CHF;
  const amount = money(
    convertCurrency(holding.amount, from, chartCurrency, eurToChf),
  );
  if (!amount.gt(0)) return;
  segments.push({
    id: holding.id,
    label: holding.label,
    group: "ASSET",
    amount: serializeDecimal(amount),
    source: "external",
    symbol: holding.symbol,
    nativeCurrency: holding.currency,
  });
}

export function sumInvestmentEnvelopeByCurrency(
  accounts: AccountBalanceRow[],
  eurToChf: Decimal,
): { EUR: string; CHF: string } {
  let eur = money(0);
  let chf = money(0);
  for (const account of accounts) {
    for (const division of account.divisions) {
      if (division.type !== "INVESTMENT") continue;
      eur = add(
        eur,
        convertCurrency(division.balance, account.currency, Currency.EUR, eurToChf),
      );
      chf = add(
        chf,
        convertCurrency(division.balance, account.currency, Currency.CHF, eurToChf),
      );
    }
  }
  return {
    EUR: serializeDecimal(eur),
    CHF: serializeDecimal(chf),
  };
}
