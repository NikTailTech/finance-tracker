"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { formatMoney, formatMoneyInput, formatNumber } from "@/lib/money";
import { DIVISION_LABELS, TRANSFER_KIND_LABELS, cn } from "@/lib/utils";
import { fetchJson } from "@/lib/hooks";
import { InvestmentsAllocationSection } from "@/components/dashboard/investments-allocation-card";
import type { WealthAllocationSegment } from "@/lib/wealth-allocation";

type ExpenseIncomeRecent = {
  entryType: "expense" | "income";
  id: string;
  title: string;
  date: string;
  amount: string;
  currency: "EUR" | "CHF";
  category: { name: string };
  account: { name: string };
};

type TransferRecent = {
  entryType: "transfer";
  id: string;
  title: string;
  date: string;
  kind: string;
  fromAmount: string;
  fromCurrency: "EUR" | "CHF";
  fromAccount: { name: string };
  toAccount: { name: string };
};

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
  recent: Array<ExpenseIncomeRecent | TransferRecent>;
};

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 space-y-4", className)}>
      <header className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fxInput, setFxInput] = useState("");
  const [fxSaving, setFxSaving] = useState(false);
  const [fxError, setFxError] = useState<string | null>(null);
  const [fxSaved, setFxSaved] = useState(false);
  const [fxEditing, setFxEditing] = useState(false);
  const [totalCurrency, setTotalCurrency] = useState<"EUR" | "CHF">("EUR");
  const fxInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const summary = await fetchJson<DashboardData>("/api/dashboard");
      setData(summary);
      setFxInput(formatMoneyInput(summary.netWorth.eurToChfRate, 8));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (fxEditing) {
      fxInputRef.current?.focus();
      fxInputRef.current?.select();
    }
  }, [fxEditing]);

  function openFxEdit() {
    if (!data) return;
    setFxInput(formatMoneyInput(data.netWorth.eurToChfRate, 8));
    setFxError(null);
    setFxSaved(false);
    setFxEditing(true);
  }

  function cancelFxEdit() {
    if (data) {
      setFxInput(formatMoneyInput(data.netWorth.eurToChfRate, 8));
    }
    setFxError(null);
    setFxSaved(false);
    setFxEditing(false);
  }

  async function saveFxRate() {
    setFxSaving(true);
    setFxError(null);
    setFxSaved(false);
    try {
      const updated = await fetchJson<{ eurToChfRate: string }>("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eurToChfRate: fxInput }),
      });
      setFxInput(formatMoneyInput(updated.eurToChfRate, 8));
      setFxSaved(true);
      setFxEditing(false);
      await load();
    } catch (e) {
      setFxError(e instanceof Error ? e.message : "Failed to update FX rate");
    } finally {
      setFxSaving(false);
    }
  }

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

  const chartData = data.expensesByCategory.map((row) => ({
    name: row.name,
    EUR: Number(row.EUR),
    CHF: Number(row.CHF),
  }));

  const fxDirty =
    formatMoneyInput(data.netWorth.eurToChfRate, 8) !== fxInput.trim();

  return (
    <div className="min-w-0 space-y-10 sm:space-y-12">
      {/* Hero: net worth */}
      <section className="min-w-0 space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Net worth
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Sums by currency of denomination — no FX mix.
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 sm:gap-8">
            <div className="min-w-0">
              <p className="text-sm text-[var(--muted-foreground)]">EUR</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight tabular-nums break-words sm:text-4xl">
                {formatMoney(data.netWorth.byCurrency.EUR, "EUR")}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Conti + investimenti in euro
              </p>
            </div>
            <div className="min-w-0 border-t border-[var(--border)] pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
              <p className="text-sm text-[var(--muted-foreground)]">CHF</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight tabular-nums break-words sm:text-4xl">
                {formatMoney(data.netWorth.byCurrency.CHF, "CHF")}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Conti + investimenti in franchi
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Totale convertito
            </p>
            <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5">
              {(["EUR", "CHF"] as const).map((currency) => (
                <button
                  key={currency}
                  type="button"
                  onClick={() => setTotalCurrency(currency)}
                  className={`min-h-9 touch-manipulation rounded-md px-3 text-sm font-medium transition ${
                    totalCurrency === currency
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {formatMoney(
              data.netWorth.converted[totalCurrency],
              totalCurrency,
            )}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Tutto convertito in {totalCurrency} con il cambio sotto.
          </p>
        </div>

        <dl className="grid gap-x-6 gap-y-3 border-t border-[var(--border)] pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex min-w-0 items-baseline justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-[var(--muted-foreground)]">Conti EUR</dt>
            <dd className="font-medium tabular-nums">
              {formatMoney(data.netWorth.ledger.EUR, "EUR")}
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-[var(--muted-foreground)]">Conti CHF</dt>
            <dd className="font-medium tabular-nums">
              {formatMoney(data.netWorth.ledger.CHF, "CHF")}
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-[var(--muted-foreground)]">Investimenti EUR</dt>
            <dd className="font-medium tabular-nums">
              {formatMoney(data.netWorth.investments.EUR, "EUR")}
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-[var(--muted-foreground)]">Investimenti CHF</dt>
            <dd className="font-medium tabular-nums">
              {formatMoney(data.netWorth.investments.CHF, "CHF")}
            </dd>
          </div>
        </dl>

        <div className="flex min-h-14 items-center border-t border-[var(--border)] py-3 sm:min-h-16">
          {!fxEditing ? (
            <div className="flex w-full min-w-0 items-center gap-3">
              <p className="min-w-0 flex-1 text-base tabular-nums text-[var(--foreground)] sm:text-lg">
                1 EUR = {formatNumber(data.netWorth.eurToChfRate, 5)} CHF
                {fxSaved ? (
                  <span className="text-[var(--muted-foreground)]"> · saved</span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={openFxEdit}
                className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Edit EUR to CHF exchange rate"
              >
                <Pencil className="h-5 w-5" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 w-full space-y-1.5 sm:max-w-[11rem]">
                  <Label htmlFor="eur-to-chf">1 EUR = … CHF</Label>
                  <Input
                    ref={fxInputRef}
                    id="eur-to-chf"
                    inputMode="decimal"
                    autoComplete="off"
                    className="text-base sm:text-sm"
                    value={fxInput}
                    onChange={(e) => {
                      setFxInput(e.target.value);
                      setFxSaved(false);
                      setFxError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && fxDirty && !fxSaving) {
                        e.preventDefault();
                        void saveFxRate();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelFxEdit();
                      }
                    }}
                  />
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                  <Button
                    type="button"
                    className="min-h-10 w-full touch-manipulation sm:w-auto"
                    variant="outline"
                    disabled={fxSaving}
                    onClick={cancelFxEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="min-h-10 w-full touch-manipulation sm:w-auto"
                    disabled={!fxDirty || fxSaving}
                    onClick={() => void saveFxRate()}
                  >
                    {fxSaving ? "Saving…" : "Update FX"}
                  </Button>
                </div>
              </div>
              {fxError ? (
                <p className="text-xs text-[var(--danger)]">{fxError}</p>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* Cashflow */}
      <section className="grid min-w-0 grid-cols-2 gap-6 border-y border-[var(--border)] py-6 sm:gap-10">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Income
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums text-[var(--success)] sm:text-2xl">
            {formatMoney(data.income.EUR, "EUR")}
          </p>
          <p className="mt-1 text-sm tabular-nums text-[var(--muted-foreground)]">
            {formatMoney(data.income.CHF, "CHF")}
          </p>
        </div>
        <div className="min-w-0 border-l border-[var(--border)] pl-6 sm:pl-10">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Expenses
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums text-[var(--danger)] sm:text-2xl">
            {formatMoney(data.expenses.EUR, "EUR")}
          </p>
          <p className="mt-1 text-sm tabular-nums text-[var(--muted-foreground)]">
            {formatMoney(data.expenses.CHF, "CHF")}
          </p>
        </div>
      </section>

      <InvestmentsAllocationSection
        investments={data.investments}
        allocation={data.wealthAllocation}
      />

      <Section title="Accounts" description="Balances and envelopes by account.">
        <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {data.accounts.map((account) => (
            <li key={account.accountId} className="py-4 sm:py-5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{account.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {account.kind === "CASH" ? "Cash" : "Checking"} · {account.currency}
                  </p>
                </div>
                <p className="shrink-0 font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums">
                  {formatMoney(account.balance, account.currency)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-y-2 text-sm">
                {account.divisions.map((division, index) => {
                  const amount = Number(division.balance);
                  const negative = amount < 0;
                  const positive = amount > 0;
                  return (
                    <div
                      key={division.divisionId}
                      className="flex min-w-0 items-baseline"
                    >
                      {index > 0 ? (
                        <span
                          className="mx-2.5 shrink-0 text-[var(--border)] sm:mx-3"
                          aria-hidden
                        >
                          |
                        </span>
                      ) : null}
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0 text-[var(--muted-foreground)]">
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid min-w-0 gap-10 lg:grid-cols-2 lg:gap-12">
        <Section title="Expenses by category" description="All-time totals.">
          <div className="h-64 min-w-0 sm:h-72">
            {chartData.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No expenses yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    interval="preserveStartEnd"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    width={36}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === "number"
                        ? formatNumber(value, 2)
                        : String(value ?? "")
                    }
                    contentStyle={{
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="EUR" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="CHF" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>

        <Section title="Recent activity" description="Latest ledger movements.">
          {data.recent.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {data.recent.map((item) => {
                if (item.entryType === "transfer") {
                  return (
                    <li
                      key={`t-${item.id}`}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="mt-0.5 break-words text-xs text-[var(--muted-foreground)]">
                          {item.date} ·{" "}
                          {TRANSFER_KIND_LABELS[item.kind] ?? "Change"} ·{" "}
                          {item.fromAccount.name} → {item.toAccount.name}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums">
                        {formatMoney(item.fromAmount, item.fromCurrency)}
                      </p>
                    </li>
                  );
                }
                return (
                  <li
                    key={`${item.entryType}-${item.id}`}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 break-words text-xs text-[var(--muted-foreground)]">
                        {item.date} · {item.category.name} · {item.account.name}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        item.entryType === "expense"
                          ? "text-[var(--danger)]"
                          : "text-[var(--success)]"
                      }`}
                    >
                      {item.entryType === "expense" ? "−" : "+"}
                      {formatMoney(item.amount, item.currency)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
