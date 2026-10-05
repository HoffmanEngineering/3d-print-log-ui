/**
 * Whether an email preference setting is on. Mirrors the API: a category nobody has touched is
 * on, and once stored only "true" means on.
 */
export function isEmailPreferenceEnabled(
  value: string | null | undefined
): boolean {
  return !value || value === 'true';
}
