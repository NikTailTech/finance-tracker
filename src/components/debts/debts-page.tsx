"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { Badge, Input, Label, Select, Textarea } from "@/components/ui/form";
import { useFormatDate } from "@/components/layout/appearance";
import type { DebtRow } from "@/lib/debts";
import { fetchJson, useAccounts, useCategories } from "@/lib/hooks";
import { formatMoney, formatMoneyInput } from "@/lib/money";
import { DEBT_DIRECTION_LABELS, DIVISION_LABELS, cn } from "@/lib/utils";

type Direction = "OWED_TO_ME" | "I_OWE";
type Currency = "EUR" | "CHF";

function todayIsoDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type FormState = {
  counterparty: string;
  title: string;
  notes: string;
  direction: Direction;
  amount: string;
  currency: Currency;
  date: string;
};

function emptyForm(): FormState {
  return {
    counterparty: "",
    title: "",
    notes: "",
    direction: "OWED_TO_ME",
    amount: "",
    currency: "EUR",
    date: todayIsoDate(),
  };
}

function formFromRow(row: DebtRow): FormState {
  return {
    counterparty: row.counterparty,
    title: row.title,
    notes: row.notes ?? "",
    direction: row.direction,
    amount: formatMoneyInput(row.amount),
    currency: row.currency,
    date: row.date,
  };
}

export function DebtsPage() {
  const formatDate = useFormatDate();
  const { accounts } = useAccounts();
  const [rows, setRows] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DebtRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DebtRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingSettle, setPendingSettle] = useState<DebtRow | null>(null);
  const [settleAccountId, setSettleAccountId] = useState("");
  const [settleDivisionId, setSettleDivisionId] = useState("");
  const [settleCategoryId, setSettleCategoryId] = useState("");
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);

  const settleKind =
    pendingSettle?.direction === "I_OWE" ? "EXPENSE" : "INCOME";
  const { categories: settleCategories, reload: reloadSettleCategories } =
    useCategories(settleKind);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<DebtRow[]>("/api/debts");
      setRows(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load debts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openRows = useMemo(
    () => rows.filter((row) => row.status === "OPEN"),
    [rows],
  );
  const settledRows = useMemo(
    () => rows.filter((row) => row.status === "SETTLED"),
    [rows],
  );

  function patchForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(row: DebtRow) {
    setEditing(row);
    setForm(formFromRow(row));
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        counterparty: form.counterparty.trim(),
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        direction: form.direction,
        amount: form.amount,
        currency: form.currency,
        date: form.date,
      };
      if (editing) {
        await fetchJson(`/api/debts/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson("/api/debts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save debt");
    } finally {
      setSaving(false);
    }
  }

  const settleAccounts = useMemo(() => {
    if (!pendingSettle) return [];
    return accounts.filter(
      (account) => account.currency === pendingSettle.currency,
    );
  }, [accounts, pendingSettle]);

  const settleDivisions = useMemo(() => {
    const account = settleAccounts.find((a) => a.id === settleAccountId);
    return account?.divisions ?? [];
  }, [settleAccounts, settleAccountId]);

  function openSettle(row: DebtRow) {
    setPendingSettle(row);
    setSettleError(null);
    setSettleCategoryId("");
    const matching = accounts.filter(
      (account) => account.currency === row.currency,
    );
    const first = matching[0];
    setSettleAccountId(first?.id ?? "");
    setSettleDivisionId(first?.divisions[0]?.id ?? "");
  }

  function closeSettle() {
    if (settling) return;
    setPendingSettle(null);
    setSettleError(null);
  }

  async function confirmSettle(event: FormEvent) {
    event.preventDefault();
    if (!pendingSettle) return;
    setSettling(true);
    setSettleError(null);
    try {
      await fetchJson(`/api/debts/${pendingSettle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SETTLED",
          accountId: settleAccountId,
          divisionId: settleDivisionId,
          categoryId: settleCategoryId,
        }),
      });
      setPendingSettle(null);
      await load();
    } catch (e) {
      setSettleError(e instanceof Error ? e.message : "Failed to settle debt");
    } finally {
      setSettling(false);
    }
  }

  async function reopenDebt(row: DebtRow) {
    setBusyId(row.id);
    setError(null);
    try {
      await fetchJson(`/api/debts/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "OPEN" }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reopen debt");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (!pendingSettle) return;
    void reloadSettleCategories();
  }, [pendingSettle, settleKind, reloadSettleCategories]);

  useEffect(() => {
    if (!pendingSettle) return;
    const account = settleAccounts.find((a) => a.id === settleAccountId);
    if (!account) {
      const first = settleAccounts[0];
      setSettleAccountId(first?.id ?? "");
      setSettleDivisionId(first?.divisions[0]?.id ?? "");
      return;
    }
    if (!account.divisions.some((d) => d.id === settleDivisionId)) {
      setSettleDivisionId(account.divisions[0]?.id ?? "");
    }
  }, [pendingSettle, settleAccounts, settleAccountId, settleDivisionId]);

  useEffect(() => {
    if (!pendingSettle) return;
    if (
      settleCategoryId &&
      !settleCategories.some((c) => c.id === settleCategoryId)
    ) {
      setSettleCategoryId("");
    }
  }, [pendingSettle, settleCategories, settleCategoryId]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await fetchJson(`/api/debts/${pendingDelete.id}`, { method: "DELETE" });
      setPendingDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete debt");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Debts
          </h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Track money someone owes you, or that you owe. Settling creates an
            income (they paid you) or an expense (you paid them) with the same
            title and amount.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-10 w-full shrink-0 touch-manipulation sm:w-auto"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          Add debt
        </Button>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Open</CardTitle>
          <CardDescription>
            {loading
              ? "Loading…"
              : openRows.length === 0
                ? "No open debts."
                : `${openRows.length} open`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DebtTable
            rows={openRows}
            formatDate={formatDate}
            busyId={busyId}
            emptyLabel={loading ? "Loading…" : "Nothing open right now."}
            onEdit={openEdit}
            onSettle={openSettle}
            onDelete={setPendingDelete}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settled</CardTitle>
          <CardDescription>
            {settledRows.length === 0
              ? "No settled debts yet."
              : `${settledRows.length} settled · linked income/expense kept in the ledger`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DebtTable
            rows={settledRows}
            formatDate={formatDate}
            busyId={busyId}
            emptyLabel="Settled debts will appear here."
            settled
            onReopen={(row) => void reopenDebt(row)}
            onDelete={setPendingDelete}
          />
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit debt" : "Add debt"}
        description="Record who is involved, the amount, and whether they owe you or you owe them."
      >
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="debt-person">Person</Label>
              <Input
                id="debt-person"
                required
                maxLength={120}
                value={form.counterparty}
                onChange={(e) => patchForm("counterparty", e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="debt-title">Title</Label>
              <Input
                id="debt-title"
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => patchForm("title", e.target.value)}
                placeholder="What is this for?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-direction">Direction</Label>
              <Select
                id="debt-direction"
                value={form.direction}
                onChange={(e) =>
                  patchForm("direction", e.target.value as Direction)
                }
              >
                <option value="OWED_TO_ME">They owe me</option>
                <option value="I_OWE">I owe them</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-date">Date</Label>
              <DateInput
                id="debt-date"
                value={form.date}
                onChange={(iso) => patchForm("date", iso)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-amount">Amount</Label>
              <Input
                id="debt-amount"
                required
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => patchForm("amount", e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-currency">Currency</Label>
              <Select
                id="debt-currency"
                value={form.currency}
                onChange={(e) =>
                  patchForm("currency", e.target.value as Currency)
                }
              >
                <option value="EUR">EUR</option>
                <option value="CHF">CHF</option>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="debt-notes">Notes</Label>
              <Textarea
                id="debt-notes"
                rows={3}
                maxLength={2000}
                value={form.notes}
                onChange={(e) => patchForm("notes", e.target.value)}
              />
            </div>
          </div>
          {formError ? (
            <p className="text-sm text-[var(--danger)]">{formError}</p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add debt"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={pendingSettle !== null}
        onClose={closeSettle}
        title="Settle debt"
        description={
          pendingSettle
            ? pendingSettle.direction === "OWED_TO_ME"
              ? `Creates an income of ${formatMoney(pendingSettle.amount, pendingSettle.currency)} for “${pendingSettle.title}”.`
              : `Creates an expense of ${formatMoney(pendingSettle.amount, pendingSettle.currency)} for “${pendingSettle.title}”.`
            : undefined
        }
      >
        <form className="space-y-4" onSubmit={(e) => void confirmSettle(e)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="settle-account">Account ({pendingSettle?.currency})</Label>
              <Select
                id="settle-account"
                required
                value={settleAccountId}
                onChange={(e) => setSettleAccountId(e.target.value)}
              >
                <option value="" disabled>
                  Select account
                </option>
                {settleAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.currency}
                  </option>
                ))}
              </Select>
              {pendingSettle && settleAccounts.length === 0 ? (
                <p className="text-xs text-[var(--danger)]">
                  No {pendingSettle.currency} account available.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="settle-division">Division</Label>
              <Select
                id="settle-division"
                required
                value={settleDivisionId}
                onChange={(e) => setSettleDivisionId(e.target.value)}
              >
                <option value="" disabled>
                  Select division
                </option>
                {settleDivisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {DIVISION_LABELS[division.type] ?? division.type}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settle-category">
                {settleKind === "INCOME" ? "Income category" : "Expense category"}
              </Label>
              <Select
                id="settle-category"
                required
                value={settleCategoryId}
                onChange={(e) => setSettleCategoryId(e.target.value)}
              >
                <option value="" disabled>
                  Select category
                </option>
                {settleCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {settleError ? (
            <p className="text-sm text-[var(--danger)]">{settleError}</p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={closeSettle}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                settling ||
                !settleAccountId ||
                !settleDivisionId ||
                !settleCategoryId
              }
            >
              {settling ? "Settling…" : "Settle & post to ledger"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete this debt?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-[var(--foreground)]">
                “{pendingDelete.title}”
              </span>
              {" · "}
              {pendingDelete.counterparty}
              <br />
              {pendingDelete.status === "SETTLED"
                ? "The linked income/expense stays in the ledger."
                : "This cannot be undone."}
            </>
          ) : undefined
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirming={deleting}
      />
    </div>
  );
}

function DebtTable({
  rows,
  formatDate,
  busyId,
  emptyLabel,
  settled = false,
  onEdit,
  onSettle,
  onReopen,
  onDelete,
}: {
  rows: DebtRow[];
  formatDate: (iso: string | null | undefined) => string;
  busyId: string | null;
  emptyLabel: string;
  settled?: boolean;
  onEdit?: (row: DebtRow) => void;
  onSettle?: (row: DebtRow) => void;
  onReopen?: (row: DebtRow) => void;
  onDelete: (row: DebtRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">{emptyLabel}</p>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const owedToMe = row.direction === "OWED_TO_ME";
          const busy = busyId === row.id;
          return (
            <div
              key={row.id}
              className="rounded-xl border border-[var(--border)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                    {row.counterparty}
                  </p>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    owedToMe ? "text-[var(--success)]" : "text-[var(--danger)]",
                  )}
                >
                  {owedToMe ? "+" : "−"}
                  {formatMoney(row.amount, row.currency)}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge>{DEBT_DIRECTION_LABELS[row.direction]}</Badge>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {formatDate(row.date)}
                  {settled && row.settledAt
                    ? ` · settled ${formatDate(row.settledAt.slice(0, 10))}`
                    : null}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {!settled && onSettle ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => onSettle(row)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Settle
                  </Button>
                ) : null}
                {settled && onReopen ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => onReopen(row)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reopen
                  </Button>
                ) : null}
                {onEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onEdit(row)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onDelete(row)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2 font-medium">Person</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Direction</th>
              <th className="px-3 py-2 font-medium">Date</th>
              {settled ? (
                <th className="px-3 py-2 font-medium">Settled</th>
              ) : null}
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const owedToMe = row.direction === "OWED_TO_ME";
              const busy = busyId === row.id;
              return (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20"
                >
                  <td className="px-3 py-3 font-medium">{row.counterparty}</td>
                  <td className="max-w-[14rem] truncate px-3 py-3">
                    {row.title}
                  </td>
                  <td className="px-3 py-3">
                    <Badge>{DEBT_DIRECTION_LABELS[row.direction]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-[var(--muted-foreground)]">
                    {formatDate(row.date)}
                  </td>
                  {settled ? (
                    <td className="whitespace-nowrap px-3 py-3 text-[var(--muted-foreground)]">
                      {row.settledAt
                        ? formatDate(row.settledAt.slice(0, 10))
                        : "—"}
                    </td>
                  ) : null}
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-3 text-right tabular-nums font-medium",
                      owedToMe
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]",
                    )}
                  >
                    {owedToMe ? "+" : "−"}
                    {formatMoney(row.amount, row.currency)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-0.5">
                      {!settled && onSettle ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={busy}
                          aria-label={`Settle ${row.title}`}
                          onClick={() => onSettle(row)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {settled && onReopen ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={busy}
                          aria-label={`Reopen ${row.title}`}
                          onClick={() => onReopen(row)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {onEdit ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={busy}
                          aria-label={`Edit ${row.title}`}
                          onClick={() => onEdit(row)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-[var(--danger)] hover:text-[var(--danger)]"
                        disabled={busy}
                        aria-label={`Delete ${row.title}`}
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
