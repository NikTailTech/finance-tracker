/** Detect `{placeholder}` tokens in a template name/title. */
export function hasTemplatePlaceholders(text: string): boolean {
  return /\{[^}]+\}/.test(text);
}

/**
 * Remove `{placeholders}` only. Keep dashes and a trailing space when useful
 * (e.g. "Fuel - {petrol price}" → "Fuel - ").
 */
export function resolveTemplateTitle(text: string): string {
  const endsWithPlaceholder = /\{[^}]+\}\s*$/.test(text);
  let result = text.replace(/\{[^}]+\}/g, "").replace(/ {2,}/g, " ");
  result = result.replace(/^\s+/, "");
  if (endsWithPlaceholder) {
    result = result.replace(/\s*$/, " ");
  } else {
    result = result.trimEnd();
  }
  return result;
}
