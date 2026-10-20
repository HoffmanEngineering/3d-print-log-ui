/**
 * Resolves to `fallback` if `work` has not settled within `ms`. A rejection passes through.
 * Onboarding lookups use it so a slow API never holds up navigation or a dialog.
 */
export function withTimeout<T>(
  work: Promise<T>,
  fallback: T,
  ms: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
}
