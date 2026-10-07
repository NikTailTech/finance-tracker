"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { DateInput } from "@/components/ui/date-input";
import { Label, Select } from "@/components/ui/form";
import { formatMoney, formatNumber } from "@/lib/money";
import { DIVISION_LABELS, cn } from "@/lib/utils";
import { fetchJson } from "@/lib/hooks";
import { InvestmentsAllocationSection } from "@/components/dashboard/investments-allocation-card";
import type { WealthAllocationSegment } from "@/lib/wealth-allocation";
import { thisMonthDateRange } from "@/lib/review-dates";

type DisplayCurrency = "EUR" | "CHF";

/** Convert a dual-currency total into one display currency via EUR→CHF rate. */
function convertDualCurrency(
  amounts: { EUR: string; CHF: string },
  to: DisplayCurrency,
  eurToChfRate: number,
) {
  const eur = Number(amounts.EUR) || 0;
  const chf = Number(amounts.CHF) || 0;
  const rate = eurToChfRate > 0 ? eurToChfRate : 0.95;
  if (to === "EUR") return eur + chf / rate;
  return eur * rate + chf;
}

type DashboardData = {
  netWorth: {
    eurToChfRate: string;
    byCurrency: { EUR: string; CHF: string };
    converted: { EUR: string; CHF: string };
    ledger: { EUR: string; CHF: string };
    investments: { EUR: string; CHF: string };
    total: { EUR: string; CHF: string };
    amount: string;
    currency: "EUR" | "CHF";
  };
  accounts: {
    accountId: string;
    name: string;
    currency: "EUR" | "CHF";
    kind: "CHECKING" | "CASH";
    balance: string;
    divisions: { divisionId: string; type: string; balance: string }[];
  }[];
  investments: {
    totals: { EUR: string; CHF: string };
    totalChf: string;
    totalEur: string;
    envelope: { EUR: string; CHF: string };
    connected: boolean;
    sources: {
      id: string;
      label: string;
      amount: string;
      currency: "EUR" | "CHF";
      amountEur: string;
      amountChf: string;
      status: "disconnected" | "live" | "manual" | "error";
    }[];
  };
  wealthAllocation: {
    total: string;
    currency: "EUR" | "CHF";
    segments: WealthAllocationSegment[];
  };
  income: { EUR: string; CHF: string };
  expenses: { EUR: string; CHF: string };
  expensesByCategory: {
    categoryId: string;
    name: string;
    EUR: string;
    CHF: string;
  }[];
};

const DIVISION_ORDER = ["NEEDS", "PLAY", "INVESTMENT", "SAVINGS"] as const;

const CATEGORY_COLORS = [
  "var(--primary)",
  "var(--danger)",
  "var(--accent)",
  "#6b8cce",
  "#c9a227",
  "#b07ad9",
  "#e8956a",
  "#2fa66a",
];

function Section({
  title,
  description,
  children,
  className,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("min-w-0 space-y-4", className)}>
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

function sortedDivisions(
  divisions: DashboardData["accounts"][number]["divisions"],
) {
  return [...divisions].sort((a, b) => {
    const ai = DIVISION_ORDER.indexOf(a.type as (typeof DIVISION_ORDER)[number]);
    const bi = DIVISION_ORDER.indexOf(b.type as (typeof DIVISION_ORDER)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function DashboardView() {
  const month = thisMonthDateRange();
  const [from, setFrom] = useState(month.from);
  const [to, setTo] = useState(month.to);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flowCurrency, setFlowCurrency] = useState<DisplayCurrency | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      const summary = await fetchJson<DashboardData>(
        qs ? `/api/dashboard?${qs}` : "/api/dashboard",
      );
      setData(summary);
      setFlowCurrency((prev) => prev ?? summary.netWorth.currency);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayCurrency: DisplayCurrency = flowCurrency ?? "EUR";
  const eurToChfRate = Number(data?.netWorth.eurToChfRate) || 0.95;

  const incomeTotal = useMemo(() => {
    if (!data) return 0;
    return convertDualCurrency(data.income, displayCurrency, eurToChfRate);
  }, [data, displayCurrency, eurToChfRate]);

  const expensesTotal = useMemo(() => {
    if (!data) return 0;
    return convertDualCurrency(data.expenses, displayCurrency, eurToChfRate);
  }, [data, displayCurrency, eurToChfRate]);

  const expensePieData = useMemo(() => {
    if (!data) return [];
    return data.expensesByCategory
      .map((row, index) => {
        const value = convertDualCurrency(row, displayCurrency, eurToChfRate);
        return {
          id: row.categoryId,
          name: row.name,
          value,
          fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          EUR: row.EUR,
          CHF: row.CHF,
        };
      })
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, displayCurrency, eurToChfRate]);

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--danger)]">{error}</p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Ensure PostgreSQL is running and migrations/seed have been applied.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center text-[var(--muted-foreground)]">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-10 sm:space-y-12">
      {/* Totals by currency */}
      <section className="grid min-w-0 gap-6 sm:grid-cols-2 sm:gap-8">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Totale conti EUR
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {formatMoney(data.netWorth.ledger.EUR, "EUR")}
          </p>
        </div>
        <div className="min-w-0 border-t border-[var(--border)] pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Totale conti CHF
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {formatMoney(data.netWorth.ledger.CHF, "CHF")}
          </p>
        </div>
      </section>

      {/* Accounts + divisions */}
      <Section title="Accounts" description="Balances and envelopes by account.">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.accounts.map((account) => (
            <div
              key={account.accountId}
              className="min-w-0 rounded-2xl border border-[var(--border)] p-4"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{account.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {account.kind === "CASH" ? "Cash" : "Checking"} ·{" "}
                    {account.currency}
                  </p>
                </div>
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums">
                {formatMoney(account.balance, account.currency)}
              </p>
              <ul className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-3">
                {sortedDivisions(account.divisions).map((division) => {
                  const amount = Number(division.balance);
                  const negative = amount < 0;
                  const positive = amount > 0;
                  return (
                    <li
                      key={division.divisionId}
                      className="flex items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="truncate text-[var(--muted-foreground)]">
                        {DIVISION_LABELS[division.type] ?? division.type}
                      </span>
                      <span
                        className={`shrink-0 tabular-nums ${
                          negative
                            ? "text-[var(--danger)]"
                            : positive
                              ? "text-[var(--success)]"
                              : "text-[var(--muted-foreground)]"
                        }`}
                      >
                        {negative ? "−" : null}
                        {formatMoney(
                          negative ? Math.abs(amount) : division.balance,
                          account.currency,
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Income / Outcome with date filter */}
      <Section
        title="Income & expenses"
        description="Totals for the selected period (default: this month), converted with the EUR→CHF rate."
        action={
          <div className="grid grid-cols-2 gap-2 sm:w-[28rem] sm:grid-cols-[1fr_1fr_5.5rem]">
            <div className="space-y-1">
              <Label
                htmlFor="dash-from"
                className="text-xs text-[var(--muted-foreground)]"
              >
                From
              </Label>
              <DateInput
                id="dash-from"
                className="h-9"
                value={from}
                onChange={setFrom}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="dash-to"
                className="text-xs text-[var(--muted-foreground)]"
              >
                To
              </Label>
              <DateInput
                id="dash-to"
                className="h-9"
                value={to}
                onChange={setTo}
              />
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <Label
                htmlFor="dash-currency"
                className="text-xs text-[var(--muted-foreground)]"
              >
                Currency
              </Label>
              <Select
                id="dash-currency"
                className="h-9"
                value={displayCurrency}
                onChange={(e) =>
                  setFlowCurrency(e.target.value as DisplayCurrency)
                }
              >
                <option value="EUR">EUR</option>
                <option value="CHF">CHF</option>
              </Select>
            </div>
          </div>
        }
      >
        <div className="grid min-w-0 grid-cols-2 gap-6 border-y border-[var(--border)] py-5 sm:gap-10">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Income
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums text-[var(--success)] sm:text-2xl">
              {formatMoney(incomeTotal, displayCurrency)}
            </p>
          </div>
          <div className="min-w-0 border-l border-[var(--border)] pl-6 sm:pl-10">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Expenses
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums text-[var(--danger)] sm:text-2xl">
              {formatMoney(expensesTotal, displayCurrency)}
            </p>
          </div>
        </div>
      </Section>

      {/* Allocation pie (accounts + future crypto/investments) */}
      <InvestmentsAllocationSection
        investments={data.investments}
        allocation={data.wealthAllocation}
      />

      {/* Expenses by category pie */}
      <Section
        title="Expenses by category"
        description={`Selected period, amounts converted to ${displayCurrency} for the chart.`}
      >
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="mx-auto h-52 w-full max-w-xs sm:h-64 sm:max-w-sm lg:mx-0">
            {expensePieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-[var(--muted-foreground)]">
                No expenses in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={2}
                  >
                    {expensePieData.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={entry.fill}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      typeof value === "number"
                        ? formatMoney(value, displayCurrency)
                        : String(value ?? "")
                    }
                    contentStyle={{
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {expensePieData.length === 0 ? (
              <li className="py-3 text-sm text-[var(--muted-foreground)]">—</li>
            ) : (
              expensePieData.map((row) => {
                const total = expensePieData.reduce((sum, item) => sum + item.value, 0);
                const share = total > 0 ? (row.value / total) * 100 : 0;
                return (
                  <li
                    key={row.id}
                    className="flex min-w-0 items-center justify-between gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: row.fill }}
                      />
                      <p className="truncate text-sm font-medium">{row.name}</p>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <p className="text-sm font-medium">
                        {formatMoney(row.value, displayCurrency)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatNumber(share, 1)}%
                      </p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </Section>
    </div>
  );
}
