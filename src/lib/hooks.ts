"use client";

import { useCallback, useEffect, useState } from "react";

export type AccountOption = {
  id: string;
  name: string;
  currency: "EUR" | "CHF";
  kind: string;
  balance: string;
  divisions: { id: string; type: string; balance: string }[];
};

export type CategoryOption = {
  id: string;
  name: string;
  kind: "EXPENSE" | "INCOME";
};

export type ManagedCategory = {
  id: string;
  name: string;
  kind: "EXPENSE" | "INCOME";
  isActive: boolean;
  sortOrder: number;
  transactionCount: number;
  templateCount: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data as T;
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<AccountOption[]>("/api/accounts");
      setAccounts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { accounts, loading, error, reload };
}

export function useCategories(kind: "EXPENSE" | "INCOME") {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<CategoryOption[]>(
        `/api/categories?kind=${kind}`,
      );
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { categories, loading, reload };
}

export function useManagedCategories() {
  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<ManagedCategory[]>(
        "/api/categories?includeInactive=1",
      );
      setCategories(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { categories, loading, error, reload };
}

export { fetchJson };
