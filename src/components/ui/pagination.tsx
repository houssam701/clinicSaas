import Link from "next/link";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { cn } from "@/lib/utils";
import { getPageItems, pageRange, totalPages } from "@/lib/pagination";

export interface PaginationProps {
  /** Current 1-based page */
  page: number;
  pageSize: number;
  /** Total matching rows across all pages */
  total: number;
  /** Builds the URL for a page — keep the current filters, e.g. PATHS.x.list({ ...filters, page }) */
  hrefForPage: (page: number) => string;
  /** Noun for the summary line, e.g. "users" → "Showing 1–20 of 57 users" */
  itemLabel?: string;
  className?: string;
}

const itemBase =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";
const itemIdle =
  "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary";
const itemDisabled =
  "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-600";

const ARROWS = {
  prev: { label: "Previous", srLabel: "Previous page", rel: "prev", Icon: HiChevronLeft, nudge: "group-hover:-translate-x-0.5" },
  next: { label: "Next", srLabel: "Next page", rel: "next", Icon: HiChevronRight, nudge: "group-hover:translate-x-0.5" },
} as const;

/** Previous/Next control: a link when `href` is set, a disabled button-look otherwise. */
function PageArrow({ direction, href }: { direction: keyof typeof ARROWS; href?: string }) {
  const { label, srLabel, rel, Icon, nudge } = ARROWS[direction];
  const content = (
    <>
      <Icon
        aria-hidden="true"
        className={cn("h-4 w-4 shrink-0 transition-transform duration-150", href && nudge)}
      />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{srLabel}</span>
    </>
  );
  const shape = cn(
    itemBase,
    "group gap-1.5 px-2.5 sm:px-3.5",
    direction === "next" && "flex-row-reverse"
  );

  if (!href) {
    return (
      <span aria-disabled="true" className={cn(shape, itemDisabled)}>
        {content}
      </span>
    );
  }
  return (
    <Link href={href} prefetch={false} rel={rel} className={cn(shape, itemIdle, "shadow-xs")}>
      {content}
    </Link>
  );
}

/**
 * Reusable, link-based pagination.
 *
 * Each page is a real URL, so it works without client JavaScript, can be
 * bookmarked or shared, and plays with the TopLoader. It renders nothing when
 * there is a single page.
 */
export function Pagination({
  page,
  pageSize,
  total,
  hrefForPage,
  itemLabel = "results",
  className,
}: PaginationProps) {
  const pages = totalPages(total, pageSize);
  const { from, to } = pageRange(page, pageSize, total);

  if (pages <= 1) {
    return total > 0 ? (
      <p className={cn("text-xs text-slate-500", className)}>
        {total} {itemLabel}
      </p>
    ) : null;
  }

  const hasPrev = page > 1;
  const hasNext = page < pages;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", className)}
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{from}–{to}</span> of{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> {itemLabel}
      </p>

      <ul className="flex items-center gap-1.5">
        <li>
          <PageArrow direction="prev" href={hasPrev ? hrefForPage(page - 1) : undefined} />
        </li>

        {/* Page numbers on wider screens, "Page x of y" on phones */}
        {getPageItems(page, pages).map((item, i) =>
          item === "ellipsis" ? (
            <li key={`ellipsis-${i}`} className="hidden sm:block px-1 text-slate-400" aria-hidden="true">
              &hellip;
            </li>
          ) : (
            <li key={item} className="hidden sm:block">
              {item === page ? (
                <span
                  aria-current="page"
                  className={cn(itemBase, "bg-primary text-white border border-primary")}
                >
                  {item}
                </span>
              ) : (
                <Link
                  href={hrefForPage(item)}
                  prefetch={false}
                  aria-label={`Page ${item}`}
                  className={cn(itemBase, itemIdle)}
                >
                  {item}
                </Link>
              )}
            </li>
          )
        )}
        <li className="sm:hidden px-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Page {page} of {pages}
        </li>

        <li>
          <PageArrow direction="next" href={hasNext ? hrefForPage(page + 1) : undefined} />
        </li>
      </ul>
    </nav>
  );
}
