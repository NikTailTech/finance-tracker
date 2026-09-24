"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { fetchJson, useManagedCategories, type ManagedCategory } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Input, Label, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";

type KindFilter = "ALL" | "EXPENSE" | "INCOME";

const KIND_LABEL: Record<ManagedCategory["kind"], string> = {
  EXPENSE: "Expense",
  INCOME: "Income",
};

function usageLabel(category: ManagedCategory) {
  const parts: string[] = [];
  if (category.transactionCount > 0) {
    parts.push(
      `${category.transactionCount} transaction${category.transactionCount === 1 ? "" : "s"}`,
    );
  }
  if (category.templateCount > 0) {
    parts.push(
      `${category.templateCount} template${category.templateCount === 1 ? "" : "s"}`,
    );
  }
  if (parts.length === 0) return "Unused";
  return parts.join(" · ");
}

export function CategoriesPage() {
  const { categories, loading, error, reload } = useManagedCategories();
  const [filter, setFilter] = useState<KindFilter>("ALL");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<ManagedCategory["kind"]>("EXPENSE");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState<ManagedCategory["kind"]>("EXPENSE");
  const [savingId, setSavingId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      filter === "ALL"
        ? categories
        : categories.filter((category) => category.kind === filter),
    [categories, filter],
  );

  const counts = useMemo(
    () => ({
      ALL: categories.length,
      EXPENSE: categories.filter((category) => category.kind === "EXPENSE").length,
      INCOME: categories.filter((category) => category.kind === "INCOME").length,
    }),
    [categories],
  );

  function startEdit(category: ManagedCategory) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditKind(category.kind);
    setFormError(null);
    setNotice(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setFormError(null);
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) {
      setFormError("Name is required");
      return;
    }
    setCreating(true);
    setFormError(null);
    setNotice(null);
    try {
      await fetchJson("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind: newKind }),
      });
      setNewName("");
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create category");
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit(category: ManagedCategory) {
    const name = editName.trim();
    if (!name) {
      setFormError("Name is required");
      return;
    }
    setSavingId(category.id);
    setFormError(null);
    setNotice(null);
    try {
      await fetchJson(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind: editKind }),
      });
      setEditingId(null);
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to update category");
    } finally {
      setSavingId(null);
    }
  }

  async function remove(category: ManagedCategory) {
    const inUse = category.transactionCount > 0 || category.templateCount > 0;
    const confirmed = window.confirm(
      inUse
        ? `"${category.name}" is used by existing records. It will be hidden from new transactions. Existing entries stay linked.`
        : `Delete "${category.name}"?`,
    );
    if (!confirmed) return;

    setSavingId(category.id);
    setFormError(null);
    setNotice(null);
    try {
      const result = await fetchJson<{ mode: "deleted" | "deactivated" }>(
        `/api/categories/${category.id}`,
        { method: "DELETE" },
      );
      if (result.mode === "deactivated") {
        setNotice(`"${category.name}" is hidden. Restore it anytime from this list.`);
      }
      if (editingId === category.id) setEditingId(null);
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to delete category");
    } finally {
      setSavingId(null);
    }
  }

  async function restore(category: ManagedCategory) {
    setSavingId(category.id);
    setFormError(null);
    setNotice(null);
    try {
      await fetchJson(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to restore category");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Categories
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Expense and income categories used when you record transactions.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-[var(--danger)]">{error}</CardContent>
        </Card>
      ) : null}

      {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}
      {notice ? <p className="text-sm text-[var(--muted-foreground)]">{notice}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New category
          </CardTitle>
          <CardDescription>Name and type are unique together.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createCategory} className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Name</Label>
              <Input
                id="new-category-name"
                required
                placeholder="Groceries, Salary…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category-kind">Type</Label>
              <Select
                id="new-category-kind"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as ManagedCategory["kind"])}
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </Select>
            </div>
            <Button type="submit" disabled={creating || !newName.trim()} className="w-full sm:w-auto">
              {creating ? "Adding…" : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex gap-2 overflow-x-auto">
        {(
          [
            ["ALL", "All"],
            ["EXPENSE", "Expenses"],
            ["INCOME", "Income"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm",
              filter === value
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                : "border-[var(--border)] text-[var(--muted-foreground)]",
            )}
          >
            {label} · {counts[value]}
          </button>
        ))}
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-lg">Category list</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${visible.length} shown`}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 p-0 sm:p-5 sm:pt-0">
          {!loading && visible.length === 0 && !error ? (
            <p className="px-4 pb-4 text-sm text-[var(--muted-foreground)] sm:px-0">
              No categories in this view.
            </p>
          ) : null}

          <div className="min-w-0">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="hidden sm:table-header-group">
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Usage</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((category) => {
                  const editing = editingId === category.id;
                  const busy = savingId === category.id;
                  return (
                    <tr
                      key={category.id}
                      className="block border-b border-[var(--border)] last:border-0 sm:table-row"
                    >
                      {editing ? (
                        <td className="block px-4 py-3 sm:table-cell" colSpan={4}>
                          <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
                            <div className="space-y-2">
                              <Label htmlFor={`edit-name-${category.id}`}>Name</Label>
                              <Input
                                id={`edit-name-${category.id}`}
                                value={editName}
                                autoFocus
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void saveEdit(category);
                                  }
                                  if (e.key === "Escape") cancelEdit();
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`edit-kind-${category.id}`}>Type</Label>
                              <Select
                                id={`edit-kind-${category.id}`}
                                value={editKind}
                                onChange={(e) =>
                                  setEditKind(e.target.value as ManagedCategory["kind"])
                                }
                              >
                                <option value="EXPENSE">Expense</option>
                                <option value="INCOME">Income</option>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="min-h-10 flex-1 sm:flex-none"
                                disabled={busy}
                                onClick={() => void saveEdit(category)}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="min-h-10 flex-1 sm:flex-none"
                                onClick={cancelEdit}
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="block px-4 pt-3 sm:table-cell sm:py-3">
                            <div className="flex items-center gap-2">
                              <span className={cn("font-medium", !category.isActive && "opacity-60")}>
                                {category.name}
                              </span>
                              {!category.isActive ? <Badge>Hidden</Badge> : null}
                            </div>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)] sm:hidden">
                              {KIND_LABEL[category.kind]} · {usageLabel(category)}
                            </p>
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <span
                              className={
                                category.kind === "EXPENSE"
                                  ? "text-[var(--danger)]"
                                  : "text-[var(--success)]"
                              }
                            >
                              {KIND_LABEL[category.kind]}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-[var(--muted-foreground)] sm:table-cell">
                            {usageLabel(category)}
                          </td>
                          <td className="block px-4 py-3 sm:table-cell sm:text-right">
                            <div className="flex gap-2 sm:justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="min-h-10 flex-1 touch-manipulation sm:flex-none"
                                disabled={busy}
                                onClick={() => startEdit(category)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              {category.isActive ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="min-h-10 flex-1 touch-manipulation sm:flex-none"
                                  disabled={busy}
                                  onClick={() => void remove(category)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="min-h-10 flex-1 touch-manipulation sm:flex-none"
                                  disabled={busy}
                                  onClick={() => void restore(category)}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Restore
                                </Button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
