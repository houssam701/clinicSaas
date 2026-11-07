"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HiChevronUpDown, HiOutlineMagnifyingGlass, HiOutlineUser, HiXMark } from "react-icons/hi2";
import { searchPatientsAction, type PatientOption } from "@/actions/search-patients";
import { cn } from "@/lib/utils";
import { SEARCH_DEBOUNCE_MS, useDebouncedCallback } from "@/lib/use-debounced-callback";

export interface PatientPickerProps {
  /** Form field that receives the chosen patient's id */
  name: string;
  initial: { id: string; name: string } | null;
  invalid?: boolean;
  describedBy?: string;
}

type Results = { items: PatientOption[]; total: number; hasMore: boolean; page: number; error?: string };

const EMPTY: Results = { items: [], total: 0, hasMore: false, page: 0 };

/**
 * Patient picker for the appointment form. Opening it lists the clinic's
 * patients A–Z straight away (no need to remember how a name was spelled),
 * with "Show more" for the next batch; typing narrows the list word by word
 * across name, phone and email, searching once typing pauses (not per letter).
 */
export function PatientPicker({ name, initial, invalid, describedBy }: PatientPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const latest = useRef(0);
  /** The text the shown results are for, so the same search is never sent twice */
  const loadedText = useRef<string | null>(null);

  const [chosen, setChosen] = useState(initial);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  /** Loads page `page` for `text`; page 1 replaces the list, later pages append. */
  const load = async (text: string, page: number) => {
    const ticket = ++latest.current;
    if (page === 1) loadedText.current = text.trim();
    setLoading(true);
    const result = await searchPatientsAction(text, page);
    if (ticket !== latest.current) return; // a newer search started meanwhile
    setResults((prev) => ({
      items: page === 1 ? result.patients : [...prev.items, ...result.patients],
      total: result.total,
      hasMore: result.hasMore,
      page,
      error: result.error,
    }));
    if (page === 1) setActive(0);
    setLoading(false);
  };

  const openPanel = () => {
    setOpen(true);
    if (results.page === 0) load(query, 1);
    // Focus the search box once it is rendered
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  // Search only once typing pauses: one call per word, not per letter
  const search = useDebouncedCallback((text: string) => {
    if (text.trim() !== loadedText.current) load(text, 1);
  }, SEARCH_DEBOUNCE_MS);

  const closePanel = () => {
    setOpen(false);
    search.cancel();
  };

  const onType = (text: string) => {
    setQuery(text);
    search.run(text);
  };

  const choose = (option: PatientOption) => {
    setChosen({ id: option.id, name: option.name });
    closePanel();
  };

  // Close when clicking outside the picker
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        search.cancel();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, search]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.items[active]) choose(results.items[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePanel();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={chosen?.id ?? ""} />

      {/* The field: shows the chosen patient, opens the list on click */}
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-md border bg-white dark:bg-slate-900 px-4 py-3 transition-all",
          invalid ? "border-red-400" : "border-slate-200 dark:border-slate-700",
          open && "border-primary ring-4 ring-primary/20"
        )}
      >
        <HiOutlineUser aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
        <button
          type="button"
          onClick={() => (open ? closePanel() : openPanel())}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-describedby={describedBy}
          className={cn(
            "min-w-0 flex-1 truncate text-left text-sm sm:text-base font-medium focus:outline-none",
            chosen ? "text-slate-800 dark:text-white" : "text-slate-400"
          )}
        >
          {chosen ? chosen.name : "Choose a patient"}
        </button>
        {chosen && (
          <button
            type="button"
            onClick={() => setChosen(null)}
            aria-label="Clear patient"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <HiXMark aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
        <HiChevronUpDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {/* Search */}
          <div className="relative border-b border-slate-200 dark:border-slate-800">
            <HiOutlineMagnifyingGlass aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results.items[active] ? `${listId}-${active}` : undefined}
              aria-label="Search patients by name, phone or email"
              autoComplete="off"
              value={query}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type any part of the name, phone or email"
              className="block w-full bg-transparent py-2.5 pl-9 pr-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Count */}
          <p className="flex items-center justify-between px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span>{query.trim() ? "Matching patients" : "All patients, A–Z"}</span>
            {!results.error && results.page > 0 && <span>{results.total}</span>}
          </p>

          {/* Results */}
          <ul id={listId} role="listbox" aria-label="Patients" className="max-h-72 overflow-y-auto pb-1">
            {results.error ? (
              <li className="px-4 py-3 text-sm text-red-600">{results.error}</li>
            ) : results.items.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-500">
                {loading ? "Loading patients…" : query.trim() ? "No patients match. Try fewer letters or a phone number." : "No patients yet."}
              </li>
            ) : (
              results.items.map((option, i) => (
                <li
                  key={option.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={chosen?.id === option.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(option);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "cursor-pointer px-4 py-2",
                    i === active && "bg-primary/5",
                    chosen?.id === option.id && "font-bold"
                  )}
                >
                  <span className="block text-sm font-semibold text-slate-800 dark:text-white">{option.name}</span>
                  {option.detail && <span className="block truncate text-xs text-slate-500">{option.detail}</span>}
                </li>
              ))
            )}
            {results.hasMore && !results.error && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => load(query, results.page + 1)}
                  disabled={loading}
                  className="w-full px-4 py-2 text-left text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
                >
                  {loading ? "Loading…" : `Show more (${results.total - results.items.length} more)`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
