"use client";

import { useCallback, useEffect, useState } from "react";
import { TransferForm } from "@/components/transactions/transfer-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/form";
import { formatMoney } from "@/lib/money";
import { DIVISION_LABELS, TRANSFER_KIND_LABELS } from "@/lib/utils";
import { fetchJson, useAccounts } from "@/lib/hooks";

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
  const { accounts, reload: reloadAccounts } = useAccounts();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  async function remove(id: string) {
    await fetchJson(`/api/transfers/${id}`, { method: "DELETE" });
    await Promise.all([load(), reloadAccounts()]);
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Change
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Internal transfers and EUR↔CHF conversions — never counted as income or
          expenses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record a change</CardTitle>
          <CardDescription>
            Move money between accounts, divisions, or convert currencies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransferForm
            accounts={accounts}
            onCreated={async () => {
              await Promise.all([load(), reloadAccounts()]);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {rows.length === 0 && !error && (
            <p className="text-sm text-[var(--muted-foreground)]">No changes yet.</p>
          )}
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
                  {row.date} · {row.fromAccount.name} /{" "}
                  {DIVISION_LABELS[row.fromDivision.type]} → {row.toAccount.name} /{" "}
                  {DIVISION_LABELS[row.toDivision.type]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right text-sm tabular-nums">
                  <p>−{formatMoney(row.fromAmount, row.fromCurrency)}</p>
                  <p className="text-[var(--success)]">
                    +{formatMoney(row.toAmount, row.toCurrency)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void remove(row.id)}>
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
