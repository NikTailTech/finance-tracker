import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DIVISION_LABELS: Record<string, string> = {
  NEEDS: "Needs",
  PLAY: "Play",
  INVESTMENT: "Investment",
  SAVINGS: "Savings",
};

export const TRANSFER_KIND_LABELS: Record<string, string> = {
  ACCOUNT: "Account transfer",
  DIVISION: "Division transfer",
  CONVERSION: "Currency conversion",
};

export const DEBT_DIRECTION_LABELS: Record<string, string> = {
  OWED_TO_ME: "They owe me",
  I_OWE: "I owe them",
};
