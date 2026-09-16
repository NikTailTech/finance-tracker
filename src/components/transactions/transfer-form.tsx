"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { DIVISION_LABELS } from "@/lib/utils";
import { AccountOption, fetchJson } from "@/lib/hooks";

type Props = {
  accounts: AccountOption[];
  onCreated: () => void;
};

export function TransferForm({ accounts, onCreated }: Props) {
  const [kind, setKind] = useState<"ACCOUNT" | "DIVISION" | "CONVERSION">(
    "ACCOUNT",
  );
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fromAccountId, setFromAccountId] = useState("");
  const [fromDivisionId, setFromDivisionId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [toDivisionId, setToDivisionId] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("0,95");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fromAccountId && accounts[0]) setFromAccountId(accounts[0].id);
    if (!toAccountId && accounts[1]) setToAccountId(accounts[1].id);
    else if (!toAccountId && accounts[0]) setToAccountId(accounts[0].id);
  }, [accounts, fromAccountId, toAccountId]);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === fromAccountId),
    [accounts, fromAccountId],
  );
  const toAccount = useMemo(
    () => accounts.find((a) => a.id === toAccountId),
    [accounts, toAccountId],
  );

  useEffect(() => {
    if (fromAccount?.divisions[0]) setFromDivisionId(fromAccount.divisions[0].id);
  }, [fromAccount]);

  useEffect(() => {
    if (toAccount?.divisions[0]) setToDivisionId(toAccount.divisions[0].id);
  }, [toAccount]);

  useEffect(() => {
    if (kind === "DIVISION" && fromAccountId) {
      setToAccountId(fromAccountId);
    }
  }, [kind, fromAccountId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          notes: notes || null,
          date,
          fromAccountId,
          fromDivisionId,
          fromAmount,
          toAccountId: kind === "DIVISION" ? fromAccountId : toAccountId,
          toDivisionId,
          toAmount: kind === "CONVERSION" && toAmount ? toAmount : undefined,
          exchangeRate: kind === "CONVERSION" ? exchangeRate : null,
        }),
      });
      setTitle("");
      setNotes("");
      setFromAmount("");
      setToAmount("");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save transfer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="kind">Type</Label>
        <Select
          id="kind"
          value={kind}
          onChange={(e) =>
            setKind(e.target.value as "ACCOUNT" | "DIVISION" | "CONVERSION")
          }
        >
          <option value="ACCOUNT">Transfer between accounts</option>
          <option value="DIVISION">Transfer between divisions</option>
          <option value="CONVERSION">EUR ↔ CHF conversion</option>
        </Select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Move to savings"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fromAmount">
          From amount {fromAccount ? `(${fromAccount.currency})` : ""}
        </Label>
        <Input
          id="fromAmount"
          required
          inputMode="decimal"
          placeholder="0,00"
          value={fromAmount}
          onChange={(e) => setFromAmount(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>From account</Label>
        <Select
          required
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label>From division</Label>
        <Select
          required
          value={fromDivisionId}
          onChange={(e) => setFromDivisionId(e.target.value)}
        >
          {fromAccount?.divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {DIVISION_LABELS[d.type] ?? d.type}
            </option>
          ))}
        </Select>
      </div>

      {kind !== "DIVISION" && (
        <div className="space-y-2">
          <Label>To account</Label>
          <Select
            required
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>To division</Label>
        <Select
          required
          value={toDivisionId}
          onChange={(e) => setToDivisionId(e.target.value)}
        >
          {(kind === "DIVISION" ? fromAccount : toAccount)?.divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {DIVISION_LABELS[d.type] ?? d.type}
            </option>
          ))}
        </Select>
      </div>

      {kind === "CONVERSION" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="rate">Exchange rate (CHF per 1 EUR)</Label>
            <Input
              id="rate"
              inputMode="decimal"
              placeholder="0,95"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toAmount">
              To amount override {toAccount ? `(${toAccount.currency})` : ""}
            </Label>
            <Input
              id="toAmount"
              inputMode="decimal"
              placeholder="0,00"
              value={toAmount}
              onChange={(e) => setToAmount(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p className="md:col-span-2 text-sm text-[var(--danger)]">{error}</p>
      )}

      <div className="md:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Record change"}
        </Button>
      </div>
    </form>
  );
}
