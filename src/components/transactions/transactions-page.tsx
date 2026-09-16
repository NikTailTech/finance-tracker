"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
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
import { Badge } from "@/components/ui/form";
import { formatMoney, formatMoneyInput, formatNumber } from "@/lib/money";
import { DIVISION_LABELS } from "@/lib/utils";
import { fetchJson, useAccounts, useCategories } from "@/lib/hooks";
import {
  hasTemplatePlaceholders,
  isTemplateComplete,
  resolveTemplateTitle,
  useTemplates,
} from "@/lib/templates";

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

function todayIsoDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function TransactionsPage({ type }: { type: "EXPENSE" | "INCOME" }) {
  const { accounts, reload: reloadAccounts } = useAccounts();
  const { categories, reload: reloadCategories } = useCategories(type);
  const { templates, reload: reloadTemplates } = useTemplates(type);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [prefills, setPrefills] = useState<Partial<TransactionFormValues> | null>(
    null,
  );
  const [editRow, setEditRow] = useState<Row | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<Row[]>(`/api/transactions?type=${type}`);
      setRows(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(row: Row) {
    const kind = type === "EXPENSE" ? "expense" : "income";
    const ok = window.confirm(
      `Delete this ${kind}?\n\n“${row.title}” · ${row.date}\n\nThis cannot be undone.`,
    );
    if (!ok) return;
    await fetchJson(`/api/transactions/${row.id}`, { method: "DELETE" });
    if (editRow?.id === row.id) setEditRow(null);
    await Promise.all([load(), reloadAccounts()]);
  }

  async function applyTemplate(template: (typeof templates)[number]) {
    if (!isTemplateComplete(template)) {
      fillFromTemplate(template);
      setMessage(
        hasTemplatePlaceholders(template.name)
          ? `“${template.name}” needs a title — placeholders were cleared, fill them in and save.`
          : `“${template.name}” is incomplete — complete the missing fields and save.`,
      );
      return;
    }
    setApplyingId(template.id);
    setMessage(null);
    setError(null);
    try {
      const result = await fetchJson<{ appliedDate: string }>(
        `/api/templates/${template.id}/apply`,
        { method: "POST" },
      );
      setMessage(`Added “${template.name}” with date ${result.appliedDate}.`);
      await Promise.all([load(), reloadAccounts()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply template");
    } finally {
      setApplyingId(null);
    }
  }

  function startEdit(row: Row) {
    setPrefills(null);
    setMessage(null);
    setError(null);
    setEditRow(row);
    queueMicrotask(() => {
      document
        .getElementById("transaction-form-card")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function fillFromTemplate(template: (typeof templates)[number]) {
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
    setMessage(
      hasTemplatePlaceholders(template.name)
        ? `Form filled from “${template.name}”. Complete the title (placeholders removed) and save.`
        : `Form filled from “${template.name}” with today’s date.`,
    );
  }

  const title = type === "EXPENSE" ? "Expenses" : "Income";

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Currency is inferred from the account. Use templates for recurring
          entries.
        </p>
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

      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick templates</CardTitle>
            <CardDescription>
              Use inserts immediately when the template is complete. Incomplete
              templates fill the form so you can finish them.{" "}
              <Link
                href="/templates"
                className="text-[var(--primary)] underline-offset-2 hover:underline"
              >
                Manage templates
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex w-full max-w-full items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-1 sm:w-auto sm:max-w-full"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-lg px-3 py-1.5 text-left text-sm hover:bg-[var(--card)] sm:flex-initial"
                  onClick={() => fillFromTemplate(template)}
                  title="Fill form with today's date"
                >
                  <span className="block truncate font-medium">
                    {template.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[var(--muted-foreground)] sm:mt-0 sm:ml-0 sm:inline sm:pl-2">
                    {template.amount
                      ? template.account
                        ? formatMoney(
                            template.amount,
                            template.account.currency,
                          )
                        : formatNumber(template.amount)
                      : "partial"}
                  </span>
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  disabled={applyingId === template.id}
                  onClick={() => void applyTemplate(template)}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Use
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card id="transaction-form-card">
        <CardHeader>
          <CardTitle>
            {editRow
              ? `Edit ${type === "EXPENSE" ? "expense" : "income"}`
              : `Add ${type === "EXPENSE" ? "expense" : "income"}`}
          </CardTitle>
          <CardDescription>
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
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm
            type={type}
            accounts={accounts}
            categories={categories}
            prefills={prefills}
            onPrefillsApplied={() => setPrefills(null)}
            editId={type === "INCOME" ? editRow?.id : null}
            editValues={
              type === "INCOME" && editRow
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
            onCancelEdit={() => setEditRow(null)}
            onCreated={async () => {
              setMessage(null);
              setEditRow(null);
              await Promise.all([load(), reloadAccounts(), reloadTemplates()]);
            }}
            onCategoryCreated={reloadCategories}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 && !error && (
            <p className="text-sm text-[var(--muted-foreground)]">No entries yet.</p>
          )}
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{row.title}</p>
                  <Badge>{row.category.name}</Badge>
                </div>
                <p className="mt-1 break-words text-xs text-[var(--muted-foreground)]">
                  {row.date} · {row.account.name} ·{" "}
                  {DIVISION_LABELS[row.division.type] ?? row.division.type}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    type === "EXPENSE" ? "text-[var(--danger)]" : "text-[var(--success)]"
                  }`}
                >
                  {type === "EXPENSE" ? "−" : "+"}
                  {formatMoney(row.amount, row.currency)}
                </p>
                {type === "INCOME" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-9 touch-manipulation"
                    onClick={() => startEdit(row)}
                  >
                    Edit
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-9 touch-manipulation"
                  onClick={() => void remove(row)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
