"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { TransactionForm } from "@/components/transactions/transaction-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/form";
import { formatMoney, formatMoneyInput } from "@/lib/money";
import {
  defaultReviewDateRange,
  lastMonthsDateRange,
  thisMonthDateRange,
} from "@/lib/review-dates";
import { DIVISION_LABELS } from "@/lib/utils";
import { fetchJson, useAccounts, useCategories } from "@/lib/hooks";
import { useFormatDate } from "@/components/layout/appearance";

type TxType = "EXPENSE" | "INCOME";

type Row = {
  id: string;
  type: TxType;
  title: string;
  notes: string | null;
  date: string;
  amount: string;
  currency: "EUR" | "CHF";
  accountId: string;
  divisionId: string;
  categoryId: string;
  account: { name: string };
  division: { type: string };
  category: { name: string };
};

type FilterState = {
  type: "" | TxType;
  categoryId: string;
  accountId: string;
  divisionId: string;
  from: string;
  to: string;
  amountMin: string;
  amountMax: string;
  q: string;
};

const defaultRange = defaultReviewDateRange();

function initialFilters(): FilterState {
  return {
    type: "",
    categoryId: "",
    accountId: "",
    divisionId: "",
    from: defaultRange.from,
    to: defaultRange.to,
    amountMin: "",
    amountMax: "",
    q: "",
  };
}

function buildQuery(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.divisionId) params.set("divisionId", filters.divisionId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.amountMin.trim()) params.set("amountMin", filters.amountMin.trim());
  if (filters.amountMax.trim()) params.set("amountMax", filters.amountMax.trim());
  if (filters.q.trim()) params.set("q", filters.q.trim());
  const qs = params.toString();
  return qs ? `/api/transactions?${qs}` : "/api/transactions";
}

export function TransactionsReviewPage() {
  const formatDate = useFormatDate();
  const { accounts, reload: reloadAccounts } = useAccounts();
  const { categories: expenseCategories } = useCategories("EXPENSE");
  const { categories: incomeCategories } = useCategories("INCOME");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [applied, setApplied] = useState<FilterState>(initialFilters);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);

  const categoryOptions = useMemo(() => {
    if (filters.type === "EXPENSE") return expenseCategories;
    if (filters.type === "INCOME") return incomeCategories;
    return [
      ...expenseCategories.map((c) => ({ ...c, name: `${c.name} (expense)` })),
      ...incomeCategories.map((c) => ({ ...c, name: `${c.name} (income)` })),
    ];
  }, [filters.type, expenseCategories, incomeCategories]);

  const divisionOptions = useMemo(() => {
    const source = filters.accountId
      ? accounts.filter((a) => a.id === filters.accountId)
      : accounts;
    return source.flatMap((account) =>
      account.divisions.map((division) => ({
        id: division.id,
        label: `${account.name} · ${DIVISION_LABELS[division.type] ?? division.type}`,
      })),
    );
  }, [accounts, filters.accountId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<Row[]>(buildQuery(applied));
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "accountId" && value !== prev.accountId) {
        next.divisionId = "";
      }
      if (key === "type" && value !== prev.type) {
        next.categoryId = "";
      }
      return next;
    });
  }

  function applyFilters() {
    setApplied({ ...filters });
    setEditRow(null);
  }

  function resetFilters() {
    const next = initialFilters();
    setFilters(next);
    setApplied(next);
    setEditRow(null);
  }

  function applyDatePreset(preset: "last3" | "thisMonth" | "last6" | "all") {
    const now = new Date();
    const range =
      preset === "all"
        ? { from: "", to: "" }
        : preset === "last3"
          ? defaultReviewDateRange(now)
          : preset === "thisMonth"
            ? thisMonthDateRange(now)
            : lastMonthsDateRange(6, now);
    setFilters((prev) => {
      const next = { ...prev, from: range.from, to: range.to };
      setApplied(next);
      setEditRow(null);
      return next;
    });
  }

  async function remove(row: Row) {
    const kind = row.type === "EXPENSE" ? "expense" : "income";
    const ok = window.confirm(
      `Delete this ${kind}?\n\n“${row.title}” · ${formatDate(row.date)}\n\nThis cannot be undone.`,
    );
    if (!ok) return;
    await fetchJson(`/api/transactions/${row.id}`, { method: "DELETE" });
    if (editRow?.id === row.id) setEditRow(null);
    await Promise.all([load(), reloadAccounts()]);
  }

  function startEdit(row: Row) {
    setEditRow(row);
  }

  function closeEdit() {
    setEditRow(null);
  }

  const editCategories =
    editRow?.type === "INCOME" ? incomeCategories : expenseCategories;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
          Transaction review
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)] sm:text-base">
          Full ledger of income and expenses with filters. Default range: last three
          calendar months.
        </p>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            Narrow by type, account, category, amount, or title search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["last3", "Last 3 months"],
                ["thisMonth", "This month"],
                ["last6", "Last 6 months"],
                ["all", "All time"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant="outline"
                className="touch-manipulation"
                onClick={() => applyDatePreset(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="filter-type">Type</Label>
              <Select
                id="filter-type"
                value={filters.type}
                onChange={(e) =>
                  patchFilter("type", e.target.value as FilterState["type"])
                }
              >
                <option value="">Income & expenses</option>
                <option value="EXPENSE">Expenses only</option>
                <option value="INCOME">Income only</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-from">From</Label>
              <DateInput
                id="filter-from"
                value={filters.from}
                onChange={(iso) => patchFilter("from", iso)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-to">To</Label>
              <DateInput
                id="filter-to"
                value={filters.to}
                onChange={(iso) => patchFilter("to", iso)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-account">Account</Label>
              <Select
                id="filter-account"
                value={filters.accountId}
                onChange={(e) => patchFilter("accountId", e.target.value)}
              >
                <option value="">All accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-division">Division</Label>
              <Select
                id="filter-division"
                value={filters.divisionId}
                onChange={(e) => patchFilter("divisionId", e.target.value)}
              >
                <option value="">All divisions</option>
                {divisionOptions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-category">Category</Label>
              <Select
                id="filter-category"
                value={filters.categoryId}
                onChange={(e) => patchFilter("categoryId", e.target.value)}
              >
                <option value="">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-min">Min amount</Label>
              <Input
                id="filter-min"
                inputMode="decimal"
                placeholder="0,00"
                value={filters.amountMin}
                onChange={(e) => patchFilter("amountMin", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-max">Max amount</Label>
              <Input
                id="filter-max"
                inputMode="decimal"
                placeholder="0,00"
                value={filters.amountMax}
                onChange={(e) => patchFilter("amountMax", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="filter-q">Title search</Label>
              <Input
                id="filter-q"
                placeholder="Search title…"
                value={filters.q}
                onChange={(e) => patchFilter("q", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-10 w-full touch-manipulation sm:w-auto"
              onClick={applyFilters}
            >
              Apply filters
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 w-full touch-manipulation sm:w-auto"
              onClick={resetFilters}
            >
              Reset to default
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editRow)}
        onClose={closeEdit}
        title={
          editRow
            ? `Edit ${editRow.type === "EXPENSE" ? "expense" : "income"}`
            : "Edit"
        }
        description={editRow?.title}
      >
        {editRow ? (
          <TransactionForm
            key={editRow.id}
            type={editRow.type}
            accounts={accounts}
            categories={editCategories}
            editId={editRow.id}
            editValues={{
              title: editRow.title,
              notes: editRow.notes ?? "",
              date: editRow.date,
              amount: formatMoneyInput(editRow.amount),
              accountId: editRow.accountId,
              divisionId: editRow.divisionId,
              categoryId: editRow.categoryId,
            }}
            onCancelEdit={closeEdit}
            onCreated={async () => {
              closeEdit();
              await Promise.all([load(), reloadAccounts()]);
            }}
          />
        ) : null}
      </Dialog>

      <Card className="min-w-0">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">All transactions</CardTitle>
            <CardDescription>
              {loading
                ? "Loading…"
                : `${rows.length} row${rows.length === 1 ? "" : "s"} · newest first`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 p-0 sm:p-6 sm:pt-0">
          {error ? (
            <p className="px-4 pb-4 text-sm text-[var(--danger)] sm:px-0">{error}</p>
          ) : null}
          {!loading && rows.length === 0 && !error ? (
            <p className="px-4 pb-4 text-sm text-[var(--muted-foreground)] sm:px-0">
              No transactions match these filters.
            </p>
          ) : null}

          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Division</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/20"
                  >
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.type === "EXPENSE"
                            ? "text-[var(--danger)]"
                            : "text-[var(--success)]"
                        }
                      >
                        {row.type === "EXPENSE" ? "Expense" : "Income"}
                      </span>
                    </td>
                    <td className="max-w-[12rem] px-4 py-3">
                      <span className="line-clamp-2 font-medium">{row.title}</span>
                    </td>
                    <td className="px-4 py-3">{row.category.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.account.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {DIVISION_LABELS[row.division.type] ?? row.division.type}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${
                        row.type === "EXPENSE"
                          ? "text-[var(--danger)]"
                          : "text-[var(--success)]"
                      }`}
                    >
                      {row.type === "EXPENSE" ? "−" : "+"}
                      {formatMoney(row.amount, row.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-0.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="touch-manipulation"
                          aria-label={`Edit ${row.title}`}
                          onClick={() => startEdit(row)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="touch-manipulation text-[var(--danger)] hover:text-[var(--danger)]"
                          aria-label={`Delete ${row.title}`}
                          onClick={() => void remove(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
