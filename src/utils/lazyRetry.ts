/**
 * Wrap a dynamic import factory with retry logic to tolerate transient dev server restarts.
 */
export function lazyRetry<T>(
  factory: () => Promise<T>,
  retries = 3,
  intervalMs = 700
): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt = (left: number) => {
      factory()
        .then(resolve)
        .catch((err) => {
          if (left <= 0) {
            reject(err);
            return;
          }
          // eslint-disable-next-line no-console
          try { console.warn(`[lazyRetry] dynamic import failed, retry in ${intervalMs}ms... (left=${left})`, err); } catch {}
          setTimeout(() => attempt(left - 1), intervalMs);
        });
    };
    attempt(retries);
  });
}
