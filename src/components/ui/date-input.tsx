"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { useAppearance } from "@/components/layout/appearance";
import { Input } from "@/components/ui/form";
import {
  dateFormatPlaceholder,
  formatDisplayDate,
  parseDisplayDate,
  resolveDateFormat,
} from "@/lib/date-format";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  /** ISO `YYYY-MM-DD`, or empty string. */
  value: string;
  onChange: (iso: string) => void;
};

export function DateInput({
  value,
  onChange,
  className,
  id,
  disabled,
  required,
  placeholder,
  ...rest
}: DateInputProps) {
  const { appearance } = useAppearance();
  const format = resolveDateFormat(appearance.dateFormat);
  const pickerRef = React.useRef<HTMLInputElement>(null);
  const [text, setText] = React.useState(() =>
    formatDisplayDate(value, format),
  );

  React.useEffect(() => {
    setText(formatDisplayDate(value, format));
  }, [value, format]);

  function commitText(nextText: string) {
    const trimmed = nextText.trim();
    if (!trimmed) {
      setText("");
      if (value !== "") onChange("");
      return;
    }
    const iso = parseDisplayDate(trimmed, format);
    if (!iso) {
      setText(formatDisplayDate(value, format));
      return;
    }
    setText(formatDisplayDate(iso, format));
    if (iso !== value) onChange(iso);
  }

  return (
    <div className="relative">
      <Input
        {...rest}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        required={required}
        placeholder={placeholder ?? dateFormatPlaceholder(format)}
        value={text}
        className={cn("pr-10", className)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commitText(text)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitText(text);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        value={value || ""}
        onChange={(e) => {
          const iso = e.target.value;
          setText(formatDisplayDate(iso, format));
          onChange(iso);
        }}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Open calendar"
        className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
        onClick={() => {
          const el = pickerRef.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.click();
          }
        }}
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
