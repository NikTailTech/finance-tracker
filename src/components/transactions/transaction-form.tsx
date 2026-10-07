"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { DIVISION_LABELS } from "@/lib/utils";
import { AccountOption, CategoryOption, fetchJson } from "@/lib/hooks";

export type TransactionFormValues = {
  title: string;
  notes: string;
  date: string;
  amount: string;
  accountId: string;
  divisionId: string;
  categoryId: string;
};

type Props = {
  type: "EXPENSE" | "INCOME";
  accounts: AccountOption[];
  categories: CategoryOption[];
  onCreated: () => void;
  onCategoryCreated?: () => void;
  /** When set, form fields are overwritten (e.g. from a template). */
  prefills?: Partial<TransactionFormValues> | null;
  onPrefillsApplied?: () => void;
  /** When set, form updates an existing transaction (PATCH). */
  editId?: string | null;
  editValues?: Partial<TransactionFormValues> | null;
  onCancelEdit?: () => void;
};

function todayIsoDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function TransactionForm({
  type,
  accounts,
  categories,
  onCreated,
  onCategoryCreated,
  prefills,
  onPrefillsApplied,
  editId,
  editValues,
  onCancelEdit,
}: Props) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayIsoDate);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockDivisionFromPrefill, setLockDivisionFromPrefill] = useState(false);
  const [lockDefaultsFromPrefill, setLockDefaultsFromPrefill] = useState(false);

  const isEditing = Boolean(editId);

  function applyValues(values: Partial<TransactionFormValues>, opts?: { lockDivision?: boolean }) {
    setLockDefaultsFromPrefill(true);
    if (values.title !== undefined) setTitle(values.title);
    if (values.notes !== undefined) setNotes(values.notes);
    if (values.date !== undefined) setDate(values.date);
    if (values.amount !== undefined) setAmount(values.amount);
    if (values.accountId !== undefined) {
      setAccountId(values.accountId);
      if (!values.accountId) setDivisionId("");
    }
    if (values.divisionId !== undefined) {
      setDivisionId(values.divisionId);
      setLockDivisionFromPrefill(
        opts?.lockDivision ?? Boolean(values.divisionId),
      );
    }
    if (values.categoryId !== undefined) setCategoryId(values.categoryId);
  }

  function resetForCreate() {
    setTitle("");
    setNotes("");
    setAmount("");
    setDate(todayIsoDate());
    setAccountId("");
    setCategoryId("");
    setDivisionId("");
    setLockDivisionFromPrefill(false);
    setLockDefaultsFromPrefill(false);
  }

  useEffect(() => {
    if (lockDefaultsFromPrefill) return;
    if (!accountId && accounts[0]) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId, lockDefaultsFromPrefill]);

  useEffect(() => {
    if (lockDefaultsFromPrefill) return;
    if (!categoryId && categories[0]) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId, lockDefaultsFromPrefill]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId],
  );

  useEffect(() => {
    if (lockDivisionFromPrefill) return;
    if (selectedAccount?.divisions[0]) {
      setDivisionId(selectedAccount.divisions[0].id);
    } else {
      setDivisionId("");
    }
  }, [selectedAccount, lockDivisionFromPrefill]);

  useEffect(() => {
    if (!prefills || isEditing) return;
    applyValues(
      {
        ...prefills,
        date: prefills.date ?? todayIsoDate(),
      },
      { lockDivision: Boolean(prefills.divisionId) },
    );
    onPrefillsApplied?.();
    queueMicrotask(() => {
      document.getElementById("title")?.focus();
    });
  }, [prefills, onPrefillsApplied, isEditing]);

  useEffect(() => {
    if (!editId || !editValues) return;
    applyValues(editValues, { lockDivision: Boolean(editValues.divisionId) });
    queueMicrotask(() => {
      document.getElementById("title")?.focus();
    });
  }, [editId, editValues]);

  async function addCategory() {
    if (!newCategory.trim()) return;
    setError(null);
    try {
      const created = await fetchJson<CategoryOption>("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim(), kind: type }),
      });
      setNewCategory("");
      setCategoryId(created.id);
      onCategoryCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create category");
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        notes: notes || null,
        date,
        amount,
        accountId,
        divisionId,
        categoryId,
      };
      if (editId) {
        await fetchJson(`/api/transactions/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        onCancelEdit?.();
        resetForCreate();
      } else {
        await fetchJson(`/api/transactions?type=${type}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        resetForCreate();
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === "EXPENSE" ? "Weekly groceries" : "March salary"}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <DateInput
          id="date"
          required
          value={date}
          onChange={setDate}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          required
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="account">Account</Label>
        <Select
          id="account"
          required
          value={accountId}
          onChange={(e) => {
            setLockDivisionFromPrefill(false);
            setAccountId(e.target.value);
          }}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="division">Division</Label>
        <Select
          id="division"
          required
          value={divisionId}
          onChange={(e) => {
            setLockDivisionFromPrefill(true);
            setDivisionId(e.target.value);
          }}
        >
          {selectedAccount?.divisions.map((division) => (
            <option key={division.id} value={division.id}>
              {DIVISION_LABELS[division.type] ?? division.type}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="category">Category</Label>
        <Select
          id="category"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <div className="flex gap-2 pt-1">
          <Input
            className="min-w-0 flex-1"
            placeholder="Add new category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={addCategory}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
        />
      </div>

      {error && (
        <p className="md:col-span-2 text-sm text-[var(--danger)]">{error}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
        {onCancelEdit ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-10 w-full touch-manipulation sm:w-auto"
            disabled={saving}
            onClick={() => {
              resetForCreate();
              onCancelEdit();
            }}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          className="min-h-10 w-full touch-manipulation sm:w-auto"
          disabled={saving}
        >
          {saving
            ? "Saving…"
            : isEditing
              ? "Save changes"
              : type === "EXPENSE"
                ? "Add expense"
                : "Add income"}
        </Button>
      </div>
    </form>
  );
}
