"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatMoney, formatNumber } from "@/lib/money";
import type { WealthAllocationGroup, WealthAllocationSegment } from "@/lib/wealth-allocation";

const GROUP_LABELS: Record<WealthAllocationGroup, string> = {
  CHECKING: "Checking",
  CASH: "Cash",
  ASSET: "Assets",
};

const GROUP_COLORS: Record<WealthAllocationGroup, string> = {
  CHECKING: "var(--primary)",
  CASH: "var(--accent)",
  ASSET: "#c9a227",
};

const SEGMENT_PALETTE = [
  "var(--primary)",
  "#2fa66a",
  "var(--accent)",
  "#6b8cce",
  "#c9a227",
  "#b07ad9",
  "#e8956a",
];

type InvestmentsBlock = {
  totals: { EUR: string; CHF: string };
  totalChf: string;
  totalEur: string;
  envelope: { EUR: string; CHF: string };
  connected: boolean;
  sources: {
    id: string;
    label: string;
    amount: string;
    currency: "EUR" | "CHF";
    amountEur: string;
    amountChf: string;
    status: "disconnected" | "live" | "manual" | "error";
  }[];
};

type Props = {
  investments: InvestmentsBlock;
  allocation: {
    total: string;
    currency: "EUR" | "CHF";
    segments: WealthAllocationSegment[];
  };
};

function segmentColor(segment: WealthAllocationSegment, index: number): string {
  if (segment.group === "ASSET") return GROUP_COLORS.ASSET;
  if (segment.group === "CASH") return GROUP_COLORS.CASH;
  return SEGMENT_PALETTE[index % SEGMENT_PALETTE.length];
}

export function InvestmentsAllocationSection({
  investments,
  allocation,
}: Props) {
  const chartCurrency = allocation.currency;
  const chartData = allocation.segments.map((segment, index) => ({
    ...segment,
    value: Number(segment.amount),
    fill: segmentColor(segment, index),
  }));

  const hasChart = chartData.some((row) => row.value > 0);

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl">
            Allocation
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Checking, cash and assets in CHF. Crypto API values are usually CHF.
          </p>
        </div>
        <div className="min-w-0 sm:text-right">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            External portfolio
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
            {formatMoney(investments.totals.CHF, "CHF")}
          </p>
          <p className="text-xs tabular-nums text-[var(--muted-foreground)]">
            EUR {formatMoney(investments.totals.EUR, "EUR")}
            {" · "}
            envelopes {formatMoney(investments.envelope.CHF, "CHF")}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)]">
        {investments.sources.map((source) => (
          <p key={source.id}>
            <span className="text-[var(--foreground)]">{source.label}</span>
            {": "}
            {formatMoney(source.amount, source.currency)}
            {source.status === "disconnected" ? " · offline" : null}
          </p>
        ))}
      </div>

      <div className="grid min-w-0 gap-6 border-t border-[var(--border)] pt-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="mx-auto h-52 w-full max-w-xs sm:h-64 sm:max-w-sm lg:mx-0">
          {!hasChart ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-[var(--muted-foreground)]">
              No balances yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number"
                      ? formatMoney(value, chartCurrency)
                      : String(value ?? "")
                  }
                  contentStyle={{
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <p className="mb-2 text-xs text-[var(--muted-foreground)]">
            Total {formatMoney(allocation.total, chartCurrency)} · {chartCurrency}
          </p>
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {allocation.segments.length === 0 ? (
              <li className="py-3 text-sm text-[var(--muted-foreground)]">—</li>
            ) : (
              allocation.segments.map((segment, index) => (
                <li
                  key={segment.id}
                  className="flex min-w-0 items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: segmentColor(segment, index) }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{segment.label}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {GROUP_LABELS[segment.group]}
                        {segment.nativeCurrency ? ` · ${segment.nativeCurrency}` : null}
                        {segment.symbol ? ` · ${segment.symbol}` : null}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-sm font-medium">
                      {formatMoney(segment.amount, chartCurrency)}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatNumber(segment.share, 1)}%
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
          <div className="flex flex-wrap gap-4 pt-3 text-xs text-[var(--muted-foreground)]">
            {(["CHECKING", "CASH", "ASSET"] as const).map((group) => (
              <span key={group} className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: GROUP_COLORS[group] }}
                />
                {GROUP_LABELS[group]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** @deprecated Prefer InvestmentsAllocationSection */
export const InvestmentsAllocationCard = InvestmentsAllocationSection;
