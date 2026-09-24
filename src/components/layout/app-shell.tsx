"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Banknote,
  Coins,
  Gem,
  Landmark,
  LayoutDashboard,
  LayoutTemplate,
  ListOrdered,
  PiggyBank,
  Settings,
  Tags,
  TrendingDown,
  TrendingUp,
  Wallet,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { NAV_ITEMS } from "@/lib/appearance";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/components/layout/appearance";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/expenses": TrendingDown,
  "/income": TrendingUp,
  "/review": ListOrdered,
  "/change": ArrowLeftRight,
  "/accounts": Wallet,
  "/categories": Tags,
  "/templates": LayoutTemplate,
  "/settings": Settings,
};

const BRAND_ICONS: Record<string, LucideIcon> = {
  piggy: PiggyBank,
  wallet: Wallet,
  coins: Coins,
  landmark: Landmark,
  banknote: Banknote,
  gem: Gem,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { appearance } = useAppearance();
  const BrandIcon = BRAND_ICONS[appearance.icon] ?? PiggyBank;

  const nav = useMemo(() => {
    const byHref = new Map(NAV_ITEMS.map((item) => [item.href, item]));
    return appearance.navOrder
      .map((href) => byHref.get(href as (typeof NAV_ITEMS)[number]["href"]))
      .filter((item): item is (typeof NAV_ITEMS)[number] => Boolean(item));
  }, [appearance.navOrder]);

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-clip">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-[var(--accent-soft)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[var(--primary-soft)] blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <BrandIcon className="h-5 w-5 shrink-0 text-[var(--primary)]" />
            <span className="truncate font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              {appearance.appName}
            </span>
          </div>
          <button
            type="button"
            aria-label="Toggle menu"
            className="shrink-0 rounded-lg border border-[var(--border)] p-2"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-[var(--border)] px-2 py-2">
            {nav.map((item) => {
              const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                    active
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-[var(--muted-foreground)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-0 lg:gap-8 lg:px-6">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--border)] py-8 pr-4 lg:flex">
          <div className="mb-10 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
              <BrandIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-display)] text-lg font-semibold leading-none tracking-tight">
                {appearance.appName}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Personal finance
              </p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((item) => {
              const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 w-full max-w-full flex-1 overflow-x-clip px-4 py-6 lg:px-2 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
