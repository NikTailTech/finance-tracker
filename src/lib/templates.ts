"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/hooks";
import {
  hasTemplatePlaceholders,
  resolveTemplateTitle,
} from "@/lib/template-title";

export type TemplateOption = {
  id: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  notes: string | null;
  amount: string | null;
  accountId: string | null;
  divisionId: string | null;
  categoryId: string | null;
  sortOrder: number;
  account: { id: string; name: string; currency: "EUR" | "CHF" } | null;
  division: { id: string; type: string } | null;
  category: { id: string; name: string } | null;
};

export { hasTemplatePlaceholders, resolveTemplateTitle };

export function isTemplateComplete(template: TemplateOption): boolean {
  return Boolean(
    template.amount &&
      template.accountId &&
      template.divisionId &&
      template.categoryId &&
      !hasTemplatePlaceholders(template.name),
  );
}

export function useTemplates(type?: "EXPENSE" | "INCOME") {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = type ? `/api/templates?type=${type}` : "/api/templates";
      const data = await fetchJson<TemplateOption[]>(url);
      setTemplates(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { templates, setTemplates, loading, error, reload };
}
