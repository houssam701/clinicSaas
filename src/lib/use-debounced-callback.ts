import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * How long a search box waits after the last keystroke before searching.
 * Every search-as-you-type box uses this, so typing a word costs one API
 * call instead of one per letter.
 */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Returns `run` delayed until calls stop for `delayMs`: each call restarts
 * the wait, only the last one runs. `cancel` drops a pending call (e.g. when
 * the box closes). Pending calls are dropped on unmount.
 *
 * @example
 *   const search = useDebouncedCallback((text: string) => load(text), SEARCH_DEBOUNCE_MS);
 *   <input onChange={(e) => search.run(e.target.value)} />
 */
export function useDebouncedCallback<Args extends unknown[]>(fn: (...args: Args) => void, delayMs = SEARCH_DEBOUNCE_MS) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestFn = useRef(fn);

  // Always call the newest fn, so a pending call never uses stale state
  useEffect(() => {
    latestFn.current = fn;
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  const run = useCallback(
    (...args: Args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => latestFn.current(...args), delayMs);
    },
    [delayMs]
  );
  const cancel = useCallback(() => clearTimeout(timer.current), []);
  return useMemo(() => ({ run, cancel }), [run, cancel]);
}
