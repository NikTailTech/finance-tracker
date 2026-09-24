"use client";

import { FormEvent, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Coins,
  Gem,
  Landmark,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAppearance, type AppearanceState } from "@/components/layout/appearance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import {
  APP_ICONS,
  COLOR_PRESETS,
  NAV_ITEMS,
  type AppIcon,
  type AppTheme,
} from "@/lib/appearance";
import { fetchJson } from "@/lib/hooks";
import { formatMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";

const BRAND_ICONS: Record<AppIcon, LucideIcon> = {
  piggy: PiggyBank,
  wallet: Wallet,
  coins: Coins,
  landmark: Landmark,
  banknote: Banknote,
  gem: Gem,
};

export function SettingsPage() {
  const { appearance, setAppearance } = useAppearance();
  const [draft, setDraft] = useState<AppearanceState>({
    ...appearance,
    eurToChfRate: formatMoneyInput(appearance.eurToChfRate, 8),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function patch<K extends keyof AppearanceState>(key: K, value: AppearanceState[K]) {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function move(href: string, direction: "up" | "down") {
    const index = draft.navOrder.indexOf(href);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= draft.navOrder.length) return;
    const next = [...draft.navOrder];
    const current = next[index];
    const neighbor = next[target];
    if (!current || !neighbor) return;
    next[index] = neighbor;
    next[target] = current;
    patch("navOrder", next);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await fetchJson<AppearanceState>("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: draft.theme,
          primaryColor: draft.primaryColor,
          icon: draft.icon,
          appName: draft.appName.trim(),
          navOrder: draft.navOrder,
          displayCurrency: draft.displayCurrency,
          eurToChfRate: draft.eurToChfRate,
        }),
      });
      const next = {
        ...updated,
        eurToChfRate: formatMoneyInput(updated.eurToChfRate, 8),
      };
      setDraft(next);
      setAppearance(next);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const labels = new Map(NAV_ITEMS.map((item) => [item.href, item.label]));

  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Appearance, navigation, and how amounts are shown.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-[var(--muted-foreground)]">Settings saved.</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Theme, brand color, name, and the icon used in the menu and favicon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="app-name">App name</Label>
            <Input
              id="app-name"
              required
              maxLength={40}
              value={draft.appName}
              onChange={(e) => patch("appName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["dark", "Dark"],
                  ["light", "Light"],
                  ["system", "System"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => patch("theme", value as AppTheme)}
                  className={cn(
                    "min-h-10 rounded-lg border px-3 text-sm",
                    draft.theme === value
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  aria-label={preset.name}
                  title={preset.name}
                  onClick={() => patch("primaryColor", preset.value)}
                  className={cn(
                    "h-10 w-10 rounded-full border-2",
                    (draft.primaryColor ?? "").toLowerCase() === preset.value
                      ? "border-[var(--foreground)]"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: preset.value }}
                />
              ))}
              <Input
                id="primary-color"
                type="color"
                className="h-10 w-16 shrink-0 p-1"
                value={draft.primaryColor}
                onChange={(e) => patch("primaryColor", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>App icon and favicon</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {APP_ICONS.map((icon) => {
                const Icon = BRAND_ICONS[icon];
                const selected = draft.icon === icon;
                return (
                  <button
                    key={icon}
                    type="button"
                    aria-label={icon}
                    onClick={() => patch("icon", icon)}
                    className={cn(
                      "flex min-h-14 items-center justify-center rounded-xl border",
                      selected
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)]",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menu order</CardTitle>
          <CardDescription>This order is used in the sidebar and the mobile menu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {draft.navOrder.map((href, index) => (
            <div
              key={href}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm">{labels.get(href as (typeof NAV_ITEMS)[number]["href"]) ?? href}</span>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 p-0"
                  disabled={index === 0}
                  aria-label={`Move ${href} up`}
                  onClick={() => move(href, "up")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 p-0"
                  disabled={index === draft.navOrder.length - 1}
                  aria-label={`Move ${href} down`}
                  onClick={() => move(href, "down")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Money</CardTitle>
          <CardDescription>
            Display currency for the dashboard and the EUR to CHF rate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display-currency">Display currency</Label>
            <Select
              id="display-currency"
              value={draft.displayCurrency}
              onChange={(e) =>
                patch("displayCurrency", e.target.value as "EUR" | "CHF")
              }
            >
              <option value="EUR">EUR</option>
              <option value="CHF">CHF</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fx-rate">1 EUR in CHF</Label>
            <Input
              id="fx-rate"
              required
              inputMode="decimal"
              value={draft.eurToChfRate}
              onChange={(e) => patch("eurToChfRate", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving} className="min-h-10 w-full sm:w-auto">
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
