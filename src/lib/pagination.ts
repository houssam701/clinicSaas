/**
 * Pure pagination math, shared by the Pagination component and any page that
 * needs to clamp or describe a page. No React, no IO.
 */

export type PageItem = number | "ellipsis";

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** First and last row numbers shown on a page (1-based), e.g. 21–40. */
export function pageRange(page: number, pageSize: number, total: number) {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(page * pageSize, total) };
}

/**
 * Page numbers to render, always keeping the first, the last and `siblings`
 * pages around the current one, with "ellipsis" for the gaps:
 *   (6, 20) → [1, "ellipsis", 5, 6, 7, "ellipsis", 20]
 */
export function getPageItems(current: number, pages: number, siblings = 1): PageItem[] {
  // Small enough to show every page without gaps
  if (pages <= 5 + siblings * 2) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }

  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

  // Near an edge, show a full run on that side so the bar keeps the same width
  const edgeRun = 3 + siblings * 2;
  const showLeftGap = current - siblings > 2;
  const showRightGap = current + siblings < pages - 1;

  if (!showLeftGap) return [...range(1, edgeRun), "ellipsis", pages];
  if (!showRightGap) return [1, "ellipsis", ...range(pages - edgeRun + 1, pages)];
  return [1, "ellipsis", ...range(current - siblings, current + siblings), "ellipsis", pages];
}
