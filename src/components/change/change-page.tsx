"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TransferForm } from "@/components/transactions/transfer-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/form";
import { formatMoney } from "@/lib/money";
import { DIVISION_LABELS, TRANSFER_KIND_LABELS } from "@/lib/utils";
import { fetchJson, useAccounts } from "@/lib/hooks";
import { useFormatDate } from "@/components/layout/appearance";

type Row = {
  id: string;
  kind: "ACCOUNT" | "DIVISION" | "CONVERSION";
  title: string;
  date: string;
  fromAmount: string;
  fromCurrency: "EUR" | "CHF";
  toAmount: string;
  toCurrency: "EUR" | "CHF";
  fromAccount: { name: string };
  toAccount: { name: string };
  fromDivision: { type: string };
  toDivision: { type: string };
};

export function ChangePage() {
  const formatDate = useFormatDate();
  const { accounts, reload: reloadAccounts } = useAccounts();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formNonce, setFormNonce] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<Row[]>("/api/transfers");
      setRows(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdd() {
    setFormNonce((n) => n + 1);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
  }

  async function remove(id: string) {
    const ok = window.confirm(
      "Delete this change?\n\nThis cannot be undone.",
    );
    if (!ok) return;
    await fetchJson(`/api/transfers/${id}`, { method: "DELETE" });
    await Promise.all([load(), reloadAccounts()]);
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Change
          </h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Internal transfers and EUR↔CHF conversions — never counted as income
            or expenses.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-10 w-full shrink-0 touch-manipulation sm:w-auto"
          onClick={openAdd}
        >
          <Plus className="h-4 w-4" />
          Add change
        </Button>
      </div>

      <Dialog
        open={formOpen}
        onClose={closeForm}
        title="Record a change"
        description="Move money between accounts, divisions, or convert currencies."
      >
        <TransferForm
          key={formNonce}
          accounts={accounts}
          onCancel={closeForm}
          onCreated={async () => {
            closeForm();
            await Promise.all([load(), reloadAccounts()]);
          }}
        />
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>
            {rows.length === 0 && !error
              ? "No changes yet."
              : `${rows.length} change${rows.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{row.title}</p>
                  <Badge>{TRANSFER_KIND_LABELS[row.kind]}</Badge>
                </div>
                <p className="mt-1 break-words text-xs text-[var(--muted-foreground)]">
                  {formatDate(row.date)} · {row.fromAccount.name} /{" "}
                  {DIVISION_LABELS[row.fromDivision.type]} → {row.toAccount.name}{" "}
                  / {DIVISION_LABELS[row.toDivision.type]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right text-sm tabular-nums">
                  <p>−{formatMoney(row.fromAmount, row.fromCurrency)}</p>
                  <p className="text-[var(--success)]">
                    +{formatMoney(row.toAmount, row.toCurrency)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="touch-manipulation text-[var(--danger)] hover:text-[var(--danger)]"
                  aria-label={`Delete ${row.title}`}
                  onClick={() => void remove(row.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
