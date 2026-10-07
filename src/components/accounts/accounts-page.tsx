"use client";

import { FormEvent, useState } from "react";
import { Pencil, Plus, Check, Trash2, X } from "lucide-react";
import { useAccounts, fetchJson } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, Input, Label, Select } from "@/components/ui/form";
import { formatMoney } from "@/lib/money";
import { DIVISION_LABELS } from "@/lib/utils";

export function AccountsPage() {
  const { accounts, loading, error, reload } = useAccounts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCurrency, setNewCurrency] = useState<"EUR" | "CHF">("EUR");
  const [newKind, setNewKind] = useState<"CHECKING" | "CASH">("CHECKING");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [confirmName, setConfirmName] = useState("");

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditName(name);
    setFormError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setFormError(null);
  }

  async function saveRename(id: string) {
    const name = editName.trim();
    if (!name) {
      setFormError("Name is required");
      return;
    }
    setSavingId(id);
    setFormError(null);
    try {
      await fetchJson(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setEditingId(null);
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to rename");
    } finally {
      setSavingId(null);
    }
  }

  function askDelete(id: string, name: string) {
    setPendingDelete({ id, name });
    setConfirmName("");
    setFormError(null);
  }

  function closeDelete() {
    if (savingId) return;
    setPendingDelete(null);
    setConfirmName("");
  }

  async function removeAccount() {
    if (!pendingDelete) return;
    if (confirmName !== pendingDelete.name) return;
    setSavingId(pendingDelete.id);
    setFormError(null);
    try {
      await fetchJson(`/api/accounts/${pendingDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName }),
      });
      if (editingId === pendingDelete.id) cancelEdit();
      setPendingDelete(null);
      setConfirmName("");
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setSavingId(null);
    }
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await fetchJson("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          currency: newCurrency,
          kind: newKind,
        }),
      });
      setNewName("");
      setNewCurrency("EUR");
      setNewKind("CHECKING");
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create account");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Accounts
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Rename accounts (e.g. bank names) or add new ones. Each gets Needs,
          Play, Investment, and Savings.
        </p>
      </div>

      {error && (
        <Card>
          <CardContent className="py-8 text-[var(--danger)]">{error}</CardContent>
        </Card>
      )}

      {formError && (
        <p className="text-sm text-[var(--danger)]">{formError}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New account
          </CardTitle>
          <CardDescription>
            Currency is fixed at creation; you can rename it anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={createAccount}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                required
                placeholder="UBS, PostFinance, Cash wallet…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-currency">Currency</Label>
              <Select
                id="new-currency"
                value={newCurrency}
                onChange={(e) =>
                  setNewCurrency(e.target.value as "EUR" | "CHF")
                }
              >
                <option value="EUR">EUR</option>
                <option value="CHF">CHF</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-kind">Type</Label>
              <Select
                id="new-kind"
                value={newKind}
                onChange={(e) =>
                  setNewKind(e.target.value as "CHECKING" | "CASH")
                }
              >
                <option value="CHECKING">Checking / bank</option>
                <option value="CASH">Cash</option>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={creating || !newName.trim()}>
                {creating ? "Creating…" : "Add account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <p className="text-sm text-[var(--muted-foreground)]">Loading accounts…</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {accounts.map((account) => {
          const isEditing = editingId === account.id;
          return (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  {isEditing ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveRename(account.id);
                          }
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={savingId === account.id}
                          onClick={() => void saveRename(account.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="truncate">{account.name}</CardTitle>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 p-0"
                          aria-label={`Rename ${account.name}`}
                          onClick={() => startEdit(account.id, account.name)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <CardDescription className="mt-1">
                        {account.kind === "CASH" ? "Cash" : "Checking"}
                      </CardDescription>
                    </div>
                  )}
                  <Badge>{account.currency}</Badge>
                </div>
                <p className="pt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
                  {formatMoney(account.balance, account.currency)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {account.divisions.map((division) => (
                  <div
                    key={division.id}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-[var(--muted)] px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm">
                      {DIVISION_LABELS[division.type] ?? division.type}
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatMoney(division.balance, account.currency)}
                    </span>
                  </div>
                ))}
                {!isEditing ? (
                  <Button
                    type="button"
                    variant="danger"
                    className="min-h-10 w-full touch-manipulation"
                    disabled={savingId === account.id}
                    onClick={() => askDelete(account.id, account.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {savingId === account.id ? "Deleting…" : "Delete account"}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={closeDelete}
        onConfirm={removeAccount}
        title={pendingDelete ? `Delete ${pendingDelete.name}` : "Delete account"}
        description="Expenses and income on this account are deleted. Changes stay: whichever side used this account is shown as ACCOUNT DELETED."
        confirmLabel={
          savingId === pendingDelete?.id ? "Deleting…" : "Delete account"
        }
        confirming={savingId === pendingDelete?.id}
        confirmDisabled={
          !pendingDelete || confirmName !== pendingDelete.name
        }
      >
        <div className="space-y-2">
          <Label htmlFor="confirm-account-name">
            Type{" "}
            <span className="font-medium text-[var(--foreground)]">
              {pendingDelete?.name}
            </span>{" "}
            to confirm
          </Label>
          <Input
            id="confirm-account-name"
            autoFocus
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={pendingDelete?.name}
          />
          {formError ? (
            <p className="text-sm text-[var(--danger)]">{formError}</p>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}
