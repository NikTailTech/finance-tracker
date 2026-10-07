"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import {
  TransactionForm,
  TransactionFormValues,
} from "@/components/transactions/transaction-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Badge, Input, Label, Select } from "@/components/ui/form";
import { formatMoney, formatMoneyInput, formatNumber } from "@/lib/money";
import {
  lastMonthsDateRange,
  thisMonthDateRange,
} from "@/lib/review-dates";
import { DIVISION_LABELS } from "@/lib/utils";
import { fetchJson, useAccounts, useCategories } from "@/lib/hooks";
import {
  hasTemplatePlaceholders,
  isTemplateComplete,
  resolveTemplateTitle,
  useTemplates,
} from "@/lib/templates";
import { useFormatDate } from "@/components/layout/appearance";

type Row = {
  id: string;
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
  from: string;
  to: string;
  categoryId: string;
  accountId: string;
  divisionId: string;
  q: string;
};

function todayIsoDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function initialFilters(): FilterState {
  const month = thisMonthDateRange();
  return {
    from: month.from,
    to: month.to,
    categoryId: "",
    accountId: "",
    divisionId: "",
    q: "",
  };
}

function buildQuery(type: "EXPENSE" | "INCOME", filters: FilterState) {
  const params = new URLSearchParams({ type });
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.divisionId) params.set("divisionId", filters.divisionId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  return `/api/transactions?${params.toString()}`;
}

export function TransactionsPage({ type }: { type: "EXPENSE" | "INCOME" }) {
  const formatDate = useFormatDate();
  const { accounts, reload: reloadAccounts } = useAccounts();
  const { categories, reload: reloadCategories } = useCategories(type);
  const { templates, reload: reloadTemplates } = useTemplates(type);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [prefills, setPrefills] = useState<Partial<TransactionFormValues> | null>(
    null,
  );
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formNonce, setFormNonce] = useState(0);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    try {
      const data = await fetchJson<Row[]>(buildQuery(type, filters));
      setRows(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [type, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "accountId" && value !== prev.accountId) {
        next.divisionId = "";
      }
      return next;
    });
  }

  function applyDatePreset(preset: "thisMonth" | "last3" | "all") {
    const now = new Date();
    const range =
      preset === "all"
        ? { from: "", to: "" }
        : preset === "thisMonth"
          ? thisMonthDateRange(now)
          : lastMonthsDateRange(3, now);
    setFilters((prev) => ({ ...prev, from: range.from, to: range.to }));
  }

  function resetFilters() {
    setFilters(initialFilters());
  }

  async function confirmRemove() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await fetchJson(`/api/transactions/${pendingDelete.id}`, {
        method: "DELETE",
      });
      if (editRow?.id === pendingDelete.id) closeForm();
      setPendingDelete(null);
      await Promise.all([load(), reloadAccounts()]);
    } finally {
      setDeleting(false);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditRow(null);
    setPrefills(null);
  }

  function openAdd() {
    setEditRow(null);
    setPrefills(null);
    setMessage(null);
    setError(null);
    setFormNonce((n) => n + 1);
    setFormOpen(true);
  }

  function startEdit(row: Row) {
    setPrefills(null);
    setTemplatesOpen(false);
    setMessage(null);
    setError(null);
    setEditRow(row);
    setFormNonce((n) => n + 1);
    setFormOpen(true);
  }

  function fillFromTemplate(template: (typeof templates)[number]) {
    setTemplatesOpen(false);
    setEditRow(null);
    const title = hasTemplatePlaceholders(template.name)
      ? resolveTemplateTitle(template.name)
      : template.name;
    setPrefills({
      title,
      notes: template.notes ?? "",
      date: todayIsoDate(),
      amount: template.amount ? formatMoneyInput(template.amount) : "",
      accountId: template.accountId ?? "",
      divisionId: template.divisionId ?? "",
      categoryId: template.categoryId ?? "",
    });
    setFormNonce((n) => n + 1);
    setFormOpen(true);
    setMessage(
      hasTemplatePlaceholders(template.name)
        ? `“${template.name}” needs a title — placeholders were cleared, finish the form and save.`
        : `“${template.name}” is incomplete — finish the missing fields and save.`,
    );
  }

  async function useTemplate(template: (typeof templates)[number]) {
    if (!isTemplateComplete(template)) {
      fillFromTemplate(template);
      return;
    }
    setApplyingId(template.id);
    setMessage(null);
    setError(null);
    try {
      const result = await fetchJson<{
        appliedDate: string;
        transaction: Row;
      }>(`/api/templates/${template.id}/apply`, { method: "POST" });
      await Promise.all([load(), reloadAccounts()]);
      startEdit(result.transaction);
      setMessage(
        `Added “${template.name}” with date ${formatDate(result.appliedDate)}. Adjust if needed.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply template");
    } finally {
      setApplyingId(null);
    }
  }

  const title = type === "EXPENSE" ? "Expenses" : "Income";
  const kindLabel = type === "EXPENSE" ? "expense" : "income";

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Currency is inferred from the account. Use templates for recurring
            entries.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {templates.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-10 w-full touch-manipulation sm:w-auto"
              onClick={() => setTemplatesOpen(true)}
            >
              <LayoutTemplate className="h-4 w-4" />
              Use template
            </Button>
          ) : null}
          <Button
            type="button"
            className="min-h-10 w-full shrink-0 touch-manipulation sm:w-auto"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4" />
            Add {kindLabel}
          </Button>
        </div>
      </div>

      {(error || message) && (
        <p
          className={`text-sm ${
            error ? "text-[var(--danger)]" : "text-[var(--success)]"
          }`}
        >
          {error || message}
        </p>
      )}

      <Dialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        title="Use template"
        description={
          <>
            Pick a template to add it for today, then tweak details if needed.{" "}
            <Link
              href="/templates"
              className="text-[var(--primary)] underline-offset-2 hover:underline"
            >
              Manage templates
            </Link>
          </>
        }
        className="max-w-lg"
      >
        <div className="space-y-2">
          {templates.map((template) => {
            const complete = isTemplateComplete(template);
            const amountLabel = template.amount
              ? template.account
                ? formatMoney(template.amount, template.account.currency)
                : formatNumber(template.amount)
              : "partial";
            return (
              <button
                key={template.id}
                type="button"
                disabled={applyingId === template.id}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 text-left transition hover:bg-[var(--card)] disabled:opacity-60"
                onClick={() => void useTemplate(template)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {template.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">
                    {amountLabel}
                    {!complete ? " · incomplete" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-[var(--primary)]">
                  {applyingId === template.id
                    ? "Adding…"
                    : complete
                      ? "Add"
                      : "Fill"}
                </span>
              </button>
            );
          })}
        </div>
      </Dialog>

      <Dialog
        open={formOpen}
        onClose={closeForm}
        title={editRow ? `Edit ${kindLabel}` : `Add ${kindLabel}`}
        description={
          <>
            Choose account + division; amount is stored as Decimal.
            {templates.length === 0 && (
              <>
                {" "}
                <Link
                  href="/templates"
                  className="text-[var(--primary)] underline-offset-2 hover:underline"
                >
                  Create a template
                </Link>
              </>
            )}
          </>
        }
      >
        <TransactionForm
          key={formNonce}
          type={type}
          accounts={accounts}
          categories={categories}
          prefills={prefills}
          onPrefillsApplied={() => setPrefills(null)}
          editId={editRow?.id ?? null}
          editValues={
            editRow
              ? {
                  title: editRow.title,
                  notes: editRow.notes ?? "",
                  date: editRow.date,
                  amount: formatMoneyInput(editRow.amount),
                  accountId: editRow.accountId,
                  divisionId: editRow.divisionId,
                  categoryId: editRow.categoryId,
                }
              : null
          }
          onCancelEdit={closeForm}
          onCreated={async () => {
            setMessage(null);
            closeForm();
            await Promise.all([load(), reloadAccounts(), reloadTemplates()]);
          }}
          onCategoryCreated={reloadCategories}
        />
      </Dialog>

      <Card className="min-w-0">
        <CardHeader className="gap-3 space-y-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>History</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading…"
                  : `${rows.length} ${kindLabel}${rows.length === 1 ? "" : "s"} · current filters`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["thisMonth", "This month"],
                  ["last3", "Last 3 months"],
                  ["all", "All time"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 touch-manipulation px-2.5 text-xs"
                  onClick={() => applyDatePreset(key)}
                >
                  {label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 touch-manipulation px-2.5 text-xs"
                onClick={resetFilters}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-1">
              <Label htmlFor="history-from" className="text-xs text-[var(--muted-foreground)]">
                From
              </Label>
              <DateInput
                id="history-from"
                className="h-9"
                value={filters.from}
                onChange={(iso) => patchFilter("from", iso)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="history-to" className="text-xs text-[var(--muted-foreground)]">
                To
              </Label>
              <DateInput
                id="history-to"
                className="h-9"
                value={filters.to}
                onChange={(iso) => patchFilter("to", iso)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="history-account" className="text-xs text-[var(--muted-foreground)]">
                Account
              </Label>
              <Select
                id="history-account"
                className="h-9"
                value={filters.accountId}
                onChange={(e) => patchFilter("accountId", e.target.value)}
              >
                <option value="">All accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="history-division" className="text-xs text-[var(--muted-foreground)]">
                Division
              </Label>
              <Select
                id="history-division"
                className="h-9"
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
            <div className="space-y-1">
              <Label htmlFor="history-category" className="text-xs text-[var(--muted-foreground)]">
                Category
              </Label>
              <Select
                id="history-category"
                className="h-9"
                value={filters.categoryId}
                onChange={(e) => patchFilter("categoryId", e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="history-q" className="text-xs text-[var(--muted-foreground)]">
                Search
              </Label>
              <Input
                id="history-q"
                className="h-9"
                placeholder="Title…"
                value={filters.q}
                onChange={(e) => patchFilter("q", e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-w-0 p-0 sm:p-6 sm:pt-0">
          {!loading && rows.length === 0 && !error && (
            <p className="px-4 pb-4 text-sm text-[var(--muted-foreground)] sm:px-0">
              No entries match these filters.
            </p>
          )}

          {rows.length > 0 && (
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Title</th>
                    <th className="hidden px-4 py-2 font-medium md:table-cell">
                      Category
                    </th>
                    <th className="hidden px-4 py-2 font-medium lg:table-cell">
                      Account
                    </th>
                    <th className="px-4 py-2 font-medium text-right">Amount</th>
                    <th className="px-4 py-2 font-medium text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/25"
                    >
                      <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[var(--muted-foreground)]">
                        {formatDate(row.date)}
                      </td>
                      <td className="max-w-[14rem] px-4 py-2">
                        <p className="truncate font-medium">{row.title}</p>
                        <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)] md:hidden">
                          {row.category.name} · {row.account.name}
                        </p>
                      </td>
                      <td className="hidden px-4 py-2 md:table-cell">
                        <Badge>{row.category.name}</Badge>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-2 text-[var(--muted-foreground)] lg:table-cell">
                        {row.account.name} ·{" "}
                        {DIVISION_LABELS[row.division.type] ?? row.division.type}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums ${
                          type === "EXPENSE"
                            ? "text-[var(--danger)]"
                            : "text-[var(--success)]"
                        }`}
                      >
                        {type === "EXPENSE" ? "−" : "+"}
                        {formatMoney(row.amount, row.currency)}
                      </td>
                      <td className="px-4 py-2 text-right">
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
                            onClick={() => setPendingDelete(row)}
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
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmRemove}
        title={`Delete ${type === "EXPENSE" ? "expense" : "income"}?`}
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-[var(--foreground)]">
                “{pendingDelete.title}”
              </span>
              {" · "}
              {formatDate(pendingDelete.date)}
              <br />
              This cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirming={deleting}
      />
    </div>
  );
}
