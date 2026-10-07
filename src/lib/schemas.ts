import { z } from "zod";
import { parseMoneyInput } from "@/lib/money";

function moneyString(maxDecimals = 4, { allowZero = false } = {}) {
  return z
    .string()
    .trim()
    .min(1, "Amount is required")
    .transform((val, ctx) => {
      try {
        const canonical = parseMoneyInput(val, maxDecimals);
        if (!allowZero && !(Number(canonical) > 0)) {
          ctx.addIssue({
            code: "custom",
            message: "Amount must be greater than zero",
          });
          return z.NEVER;
        }
        return canonical;
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Invalid amount (use comma for decimals, e.g. 1.234,56)",
        });
        return z.NEVER;
      }
    });
}

function optionalMoneyString(maxDecimals = 8) {
  return z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val, ctx) => {
      if (val == null || val === "") return null;
      try {
        return parseMoneyInput(val, maxDecimals);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Invalid number (use comma for decimals)",
        });
        return z.NEVER;
      }
    });
}

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const transactionCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional().nullable(),
  date: dateString,
  amount: moneyString(4),
  accountId: z.string().cuid(),
  divisionId: z.string().cuid(),
  categoryId: z.string().cuid(),
});

export const transactionUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  date: dateString.optional(),
  amount: moneyString(4).optional(),
  accountId: z.string().cuid().optional(),
  divisionId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
});

const emptyQueryToUndefined = (value: unknown) =>
  value === "" || value == null ? undefined : value;

function optionalQueryMoney(maxDecimals = 4) {
  return z.preprocess(
    emptyQueryToUndefined,
    z
      .string()
      .optional()
      .transform((val, ctx) => {
        if (val == null) return undefined;
        try {
          return parseMoneyInput(val, maxDecimals);
        } catch {
          ctx.addIssue({
            code: "custom",
            message: "Invalid amount filter",
          });
          return z.NEVER;
        }
      }),
  );
}

export const transactionListQuerySchema = z.object({
  type: z.preprocess(
    emptyQueryToUndefined,
    z.enum(["EXPENSE", "INCOME"]).optional(),
  ),
  categoryId: z.preprocess(emptyQueryToUndefined, z.string().cuid().optional()),
  accountId: z.preprocess(emptyQueryToUndefined, z.string().cuid().optional()),
  divisionId: z.preprocess(emptyQueryToUndefined, z.string().cuid().optional()),
  from: z.preprocess(emptyQueryToUndefined, dateString.optional()),
  to: z.preprocess(emptyQueryToUndefined, dateString.optional()),
  amountMin: optionalQueryMoney(4),
  amountMax: optionalQueryMoney(4),
  q: z.preprocess(
    emptyQueryToUndefined,
    z.string().trim().max(200).optional(),
  ),
});

export const transferCreateSchema = z
  .object({
    kind: z.enum(["ACCOUNT", "DIVISION", "CONVERSION"]),
    title: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(2000).optional().nullable(),
    date: dateString,
    fromAccountId: z.string().cuid(),
    fromDivisionId: z.string().cuid(),
    fromAmount: moneyString(4),
    toAccountId: z.string().cuid(),
    toDivisionId: z.string().cuid(),
    toAmount: moneyString(4).optional(),
    exchangeRate: optionalMoneyString(8),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "CONVERSION") {
      if (!data.exchangeRate && !data.toAmount) {
        ctx.addIssue({
          code: "custom",
          message: "Conversion requires exchangeRate or toAmount",
          path: ["exchangeRate"],
        });
      }
    } else if (
      data.fromAccountId === data.toAccountId &&
      data.fromDivisionId === data.toDivisionId
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Source and destination must differ",
        path: ["toDivisionId"],
      });
    }
  });

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(["EXPENSE", "INCOME"]),
  color: z.string().trim().max(32).optional().nullable(),
  icon: z.string().trim().max(64).optional().nullable(),
});

export const categoryUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    kind: z.enum(["EXPENSE", "INCOME"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.kind !== undefined ||
      data.isActive !== undefined,
    { message: "No fields to update" },
  );

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  currency: z.enum(["EUR", "CHF"]),
  kind: z.enum(["CHECKING", "CASH"]).default("CHECKING"),
});

export const accountUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const templateCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    type: z.enum(["EXPENSE", "INCOME"]),
    notes: z.string().trim().max(2000).optional().nullable(),
    amount: optionalMoneyString(4),
    accountId: z
      .union([z.string().cuid(), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    divisionId: z
      .union([z.string().cuid(), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    categoryId: z
      .union([z.string().cuid(), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
  })
  .superRefine((data, ctx) => {
    if (data.divisionId && !data.accountId) {
      ctx.addIssue({
        code: "custom",
        message: "Account is required when a division is set",
        path: ["accountId"],
      });
    }
  });

export const templateUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    type: z.enum(["EXPENSE", "INCOME"]).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
    amount: optionalMoneyString(4),
    accountId: z
      .union([z.string().cuid(), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v === undefined ? undefined : v ? v : null)),
    divisionId: z
      .union([z.string().cuid(), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v === undefined ? undefined : v ? v : null)),
    categoryId: z
      .union([z.string().cuid(), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v === undefined ? undefined : v ? v : null)),
  })
  .superRefine((data, ctx) => {
    if (data.divisionId && data.accountId === null) {
      ctx.addIssue({
        code: "custom",
        message: "Account is required when a division is set",
        path: ["accountId"],
      });
    }
  });

export const templateReorderSchema = z.object({
  type: z.enum(["EXPENSE", "INCOME"]),
  orderedIds: z.array(z.string().cuid()).min(1),
});

export const categoryReorderSchema = z.object({
  kind: z.enum(["EXPENSE", "INCOME"]),
  orderedIds: z.array(z.string().cuid()).min(1),
});

export const settingsUpdateSchema = z.object({
  eurToChfRate: z
    .string()
    .trim()
    .min(1, "FX rate is required")
    .transform((val, ctx) => {
      try {
        const canonical = parseMoneyInput(val, 8);
        if (!(Number(canonical) > 0)) {
          ctx.addIssue({
            code: "custom",
            message: "FX rate must be greater than zero",
          });
          return z.NEVER;
        }
        return canonical;
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Invalid rate (use comma for decimals, e.g. 0,94514)",
        });
        return z.NEVER;
      }
    })
    .optional(),
  displayCurrency: z.enum(["EUR", "CHF"]).optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #3dba7e")
    .optional(),
  icon: z.enum(["piggy", "wallet", "coins", "landmark", "banknote", "gem"]).optional(),
  appName: z.string().trim().min(1).max(40).optional(),
  navOrder: z.array(z.string().min(1)).optional(),
  dateFormat: z
    .enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD.MM.YYYY"])
    .optional(),
});

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransferCreateInput = z.infer<typeof transferCreateSchema>;
