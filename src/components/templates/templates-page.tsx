"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, LayoutTemplate, Pencil, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { formatMoney, formatMoneyInput, formatNumber } from "@/lib/money";
import { DIVISION_LABELS, cn } from "@/lib/utils";
import { fetchJson, useAccounts, useCategories } from "@/lib/hooks";
import {
  hasTemplatePlaceholders,
  isTemplateComplete,
  resolveTemplateTitle,
  TemplateOption,
  useTemplates,
} from "@/lib/templates";

function templateAmountLabel(template: TemplateOption) {
  if (!template.amount) return "—";
  if (template.account) {
    return formatMoney(template.amount, template.account.currency);
  }
  return formatNumber(template.amount);
}

function TemplateTable({
  rows,
  applyingId,
  reordering,
  editingId,
  onApply,
  onEdit,
  onRemove,
  onMove,
}: {
  rows: TemplateOption[];
  applyingId: string | null;
  reordering: boolean;
  editingId: string | null;
  onApply: (template: TemplateOption) => void;
  onEdit: (template: TemplateOption) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">No templates yet.</p>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards — no horizontal scroll */}
      <div className="space-y-3 md:hidden">
        {rows.map((template, index) => (
          <div
            key={template.id}
            className={cn(
              "rounded-xl border border-[var(--border)] p-3",
              editingId === template.id && "bg-[var(--primary-soft)]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{template.name}</p>
                <p className="mt-0.5 text-sm tabular-nums text-[var(--muted-foreground)]">
                  {templateAmountLabel(template)}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  disabled={reordering || index === 0}
                  aria-label="Move up"
                  onClick={() => onMove(template.id, "up")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  disabled={reordering || index === rows.length - 1}
                  aria-label="Move down"
                  onClick={() => onMove(template.id, "down")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div className="min-w-0">
                <dt className="text-[var(--muted-foreground)]">Account</dt>
                <dd className="truncate">
                  {template.account
                    ? `${template.account.name} (${template.account.currency})`
                    : "—"}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[var(--muted-foreground)]">Division</dt>
                <dd className="truncate">
                  {template.division
                    ? (DIVISION_LABELS[template.division.type] ??
                      template.division.type)
                    : "—"}
                </dd>
              </div>
              <div className="min-w-0 col-span-2">
                <dt className="text-[var(--muted-foreground)]">Category</dt>
                <dd className="truncate">{template.category?.name ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={applyingId === template.id || reordering}
                onClick={() => onApply(template)}
              >
                <Zap className="h-3.5 w-3.5" />
                {applyingId === template.id ? "…" : "Use"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={reordering}
                onClick={() => onEdit(template)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={reordering}
                onClick={() => onRemove(template.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2 font-medium">Order</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Division</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((template, index) => (
              <tr
                key={template.id}
                className={cn(
                  "border-t border-[var(--border)] hover:bg-[var(--muted)]/50",
                  editingId === template.id && "bg-[var(--primary-soft)]",
                )}
              >
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={reordering || index === 0}
                      aria-label="Move up"
                      onClick={() => onMove(template.id, "up")}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={reordering || index === rows.length - 1}
                      aria-label="Move down"
                      onClick={() => onMove(template.id, "down")}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
                <td className="max-w-[160px] truncate px-3 py-2 font-medium">
                  {template.name}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {templateAmountLabel(template)}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2">
                  {template.account ? (
                    <>
                      {template.account.name}
                      <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                        {template.account.currency}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {template.division
                    ? (DIVISION_LABELS[template.division.type] ??
                      template.division.type)
                    : "—"}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2">
                  {template.category?.name ?? "—"}
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button
                      type="button"
                      size="sm"
                      disabled={applyingId === template.id || reordering}
                      onClick={() => onApply(template)}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {applyingId === template.id ? "…" : "Use"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={reordering}
                      onClick={() => onEdit(template)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={reordering}
                      onClick={() => onRemove(template.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function TemplatesPage() {
  const { accounts } = useAccounts();
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const { categories } = useCategories(type);
  const { templates, setTemplates, reload, error: loadError } = useTemplates();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) return;
    if (
      categories.length > 0 &&
      categoryId &&
      !categories.some((c) => c.id === categoryId)
    ) {
      setCategoryId("");
    }
  }, [categories, type, editingId, categoryId]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId],
  );

  const expenseTemplates = useMemo(
    () =>
      templates
        .filter((t) => t.type === "EXPENSE")
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [templates],
  );
  const incomeTemplates = useMemo(
    () =>
      templates
        .filter((t) => t.type === "INCOME")
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [templates],
  );

  function resetForm(nextType: "EXPENSE" | "INCOME" = "EXPENSE") {
    setEditingId(null);
    setType(nextType);
    setName("");
    setNotes("");
    setAmount("");
    setAccountId("");
    setDivisionId("");
    setCategoryId("");
  }

  function startEdit(template: TemplateOption) {
    setEditingId(template.id);
    setType(template.type);
    setName(template.name);
    setNotes(template.notes ?? "");
    setAmount(template.amount ? formatMoneyInput(template.amount) : "");
    setAccountId(template.accountId ?? "");
    setDivisionId(template.divisionId ?? "");
    setCategoryId(template.categoryId ?? "");
    setError(null);
    setMessage(null);
    document.getElementById("template-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      name,
      type,
      notes: notes || null,
      amount: amount.trim() || null,
      accountId: accountId || null,
      divisionId: divisionId || null,
      categoryId: categoryId || null,
    };
    try {
      if (editingId) {
        await fetchJson(`/api/templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setMessage("Template updated.");
      } else {
        await fetchJson("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setMessage("Template saved.");
      }
      resetForm(type);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setMessage(null);
    if (editingId === id) resetForm(type);
    await fetchJson(`/api/templates/${id}`, { method: "DELETE" });
    await reload();
  }

  async function applyNow(template: TemplateOption) {
    if (!isTemplateComplete(template)) {
      if (hasTemplatePlaceholders(template.name)) {
        setError(
          `“${template.name}” has placeholders in the name. Open Expenses/Income, use the template, complete the title (${resolveTemplateTitle(template.name) || "…"}), then save.`,
        );
      } else {
        setError(
          "This template is incomplete. Use Edit to fill the missing fields, or apply it from Expenses/Income and complete the form.",
        );
      }
      return;
    }
    setApplyingId(template.id);
    setError(null);
    setMessage(null);
    try {
      const result = await fetchJson<{
        appliedDate: string;
        templateName: string;
      }>(`/api/templates/${template.id}/apply`, { method: "POST" });
      setMessage(
        `Created “${result.templateName}” with date ${result.appliedDate}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply template");
    } finally {
      setApplyingId(null);
    }
  }

  async function moveTemplate(
    listType: "EXPENSE" | "INCOME",
    id: string,
    direction: "up" | "down",
  ) {
    const list =
      listType === "EXPENSE" ? [...expenseTemplates] : [...incomeTemplates];
    const index = list.findIndex((row) => row.id === id);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;

    const swapped = [...list];
    const tmp = swapped[index]!;
    swapped[index] = swapped[target]!;
    swapped[target] = tmp;

    const orderedIds = swapped.map((row) => row.id);
    const sortMap = new Map(orderedIds.map((rowId, i) => [rowId, i + 1]));

    setTemplates((prev) =>
      prev.map((row) =>
        row.type === listType && sortMap.has(row.id)
          ? { ...row, sortOrder: sortMap.get(row.id)! }
          : row,
      ),
    );

    setReordering(true);
    setError(null);
    try {
      await fetchJson("/api/templates/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: listType, orderedIds }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
      await reload();
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Templates
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Prefill presets for recurring income and expenses. Reorder with the
          arrows; Use always inserts today&apos;s date.
        </p>
      </div>

      {(error || loadError || message) && (
        <p
          className={cn(
            "text-sm",
            error || loadError ? "text-[var(--danger)]" : "text-[var(--success)]",
          )}
        >
          {error || loadError || message}
        </p>
      )}

      <Card id="template-form">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            {editingId ? "Edit template" : "New template"}
          </CardTitle>
          <CardDescription>
            {editingId
              ? "Update the fields below and save changes. Empty fields stay unset."
              : "Only the name is required. Leave amount, account, division or category empty if you prefer to fill them later."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-type">Type</Label>
              <Select
                id="tpl-type"
                value={type}
                onChange={(e) => setType(e.target.value as "EXPENSE" | "INCOME")}
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Template name</Label>
              <Input
                id="tpl-name"
                required
                placeholder="Salary Play"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Used as the expense/income title when applied.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-amount">Amount (optional)</Label>
              <Input
                id="tpl-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-account">Account (optional)</Label>
              <Select
                id="tpl-account"
                value={accountId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setAccountId(nextId);
                  setDivisionId("");
                }}
              >
                <option value="">—</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-division">Division (optional)</Label>
              <Select
                id="tpl-division"
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                disabled={!accountId}
              >
                <option value="">—</option>
                {selectedAccount?.divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {DIVISION_LABELS[d.type] ?? d.type}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-category">Category (optional)</Label>
              <Select
                id="tpl-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tpl-notes">Notes</Label>
              <Textarea
                id="tpl-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Update template"
                    : "Save template"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => resetForm(type)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income templates</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateTable
            rows={incomeTemplates}
            applyingId={applyingId}
            reordering={reordering}
            editingId={editingId}
            onApply={applyNow}
            onEdit={startEdit}
            onRemove={(id) => void remove(id)}
            onMove={(id, direction) => void moveTemplate("INCOME", id, direction)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense templates</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateTable
            rows={expenseTemplates}
            applyingId={applyingId}
            reordering={reordering}
            editingId={editingId}
            onApply={applyNow}
            onEdit={startEdit}
            onRemove={(id) => void remove(id)}
            onMove={(id, direction) => void moveTemplate("EXPENSE", id, direction)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
