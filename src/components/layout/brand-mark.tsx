import { cn } from "@/lib/utils";

/** Classical bank facade — matches the favicon mark (not a Lucide glyph). */
export function BrandMark({
  className,
  title = "Bank",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M16 5.2 6.8 11.4a.9.9 0 0 0 .5 1.6h17.4a.9.9 0 0 0 .5-1.6L16 5.2Z"
        fill="currentColor"
      />
      <rect
        x="7.4"
        y="13.2"
        width="17.2"
        height="1.35"
        rx="0.5"
        fill="currentColor"
        opacity="0.9"
      />
      <rect x="8.6" y="15.1" width="2.2" height="7.6" rx="0.55" fill="currentColor" />
      <rect x="12.9" y="15.1" width="2.2" height="7.6" rx="0.55" fill="currentColor" />
      <rect x="17" y="15.1" width="2.2" height="7.6" rx="0.55" fill="currentColor" />
      <rect x="21.2" y="15.1" width="2.2" height="7.6" rx="0.55" fill="currentColor" />
      <rect x="6.8" y="23.1" width="18.4" height="2.1" rx="0.6" fill="currentColor" />
      <rect
        x="8.2"
        y="25.5"
        width="15.6"
        height="1.35"
        rx="0.45"
        fill="currentColor"
        opacity="0.75"
      />
      <circle cx="16" cy="10.1" r="1.15" fill="currentColor" opacity="0.35" />
    </svg>
  );
}
